/**
 * Unit Tests for DatabaseService
 * Test SQL validation, query execution, and security features
 */

const DatabaseService = require('../../../services/DatabaseService');
const { mysqlPool } = require('../../../config/database');

jest.mock('../../../config/database');

describe('DatabaseService', () => {
    let mockPool;

    beforeEach(() => {
        mockPool = {
            execute: jest.fn()
        };
        mysqlPool.mockReturnValue(mockPool);
        jest.clearAllMocks();
    });

    describe('validateQuery', () => {
        const userPermissions = ['project_view', 'customer_view'];

        it('should accept valid SELECT query', () => {
            const result = DatabaseService.validateQuery(
                'SELECT * FROM projects WHERE status = "active"',
                userPermissions
            );

            expect(result.isValid).toBe(true);
        });

        it('should reject non-SELECT queries', () => {
            const queries = [
                'INSERT INTO users VALUES (1, "test")',
                'UPDATE projects SET status = "closed"',
                'DELETE FROM customers WHERE id = 1',
                'DROP TABLE users'
            ];

            queries.forEach(query => {
                const result = DatabaseService.validateQuery(query, userPermissions);
                expect(result.isValid).toBe(false);
                expect(result.error).toContain('Chỉ được phép thực thi SELECT query');
            });
        });

        it('should reject queries with SQL comments', () => {
            const queries = [
                'SELECT * FROM users -- comment',
                'SELECT * FROM users /* comment */',
                'SELECT * FROM users; DROP TABLE users--'
            ];

            queries.forEach(query => {
                const result = DatabaseService.validateQuery(query, userPermissions);
                expect(result.isValid).toBe(false);
            });
        });

        it('should reject UNION-based injection attempts', () => {
            const queries = [
                'SELECT * FROM users UNION SELECT * FROM passwords',
                'SELECT * FROM users UNION ALL SELECT * FROM admin',
                'SELECT id FROM projects union select password from users'
            ];

            queries.forEach(query => {
                const result = DatabaseService.validateQuery(query, userPermissions);
                expect(result.isValid).toBe(false);
                expect(result.error).toContain('UNION SELECT');
            });
        });

        it('should reject dangerous keywords', () => {
            const dangerousKeywords = [
                'LOAD_FILE', 'INTO OUTFILE', 'INTO DUMPFILE',
                'GRANT', 'REVOKE', 'FLUSH', 'SHUTDOWN', 'KILL'
            ];

            dangerousKeywords.forEach(keyword => {
                const query = `SELECT * FROM test WHERE name = '${keyword}'`;
                const result = DatabaseService.validateQuery(query, userPermissions);
                expect(result.isValid).toBe(false);
            });
        });

        it('should reject multi-statement queries', () => {
            const query = 'SELECT * FROM projects; DROP TABLE users;';
            const result = DatabaseService.validateQuery(query, userPermissions);
            
            expect(result.isValid).toBe(false);
        });

        it('should reject queries accessing forbidden tables', () => {
            const result = DatabaseService.validateQuery(
                'SELECT * FROM users',
                ['project_view'] // No user_view permission
            );

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Không có quyền truy cập bảng');
        });

                it('should reject queries that are too long', () => {
            const longQuery = 'SELECT * FROM users WHERE ' + 'x'.repeat(10001);
            const userPermissions = ['user_view'];
            
            const result = DatabaseService.validateQuery(longQuery, userPermissions);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('quá dài');
        });
    });

    describe('getAccessibleTables', () => {
        it('should return base tables for regular user', () => {
            const tables = DatabaseService.getAccessibleTables(['project_view']);
            
            expect(tables).toContain('projects');
            expect(tables).toContain('customers');
            expect(tables).not.toContain('users');
        });

        it('should return all tables for admin', () => {
            const tables = DatabaseService.getAccessibleTables(['all']);
            
            expect(tables).toContain('projects');
            expect(tables).toContain('users');
            expect(tables).toContain('user_logs');
        });

        it('should include users table with user_view permission', () => {
            const tables = DatabaseService.getAccessibleTables(['user_view']);
            
            expect(tables).toContain('users');
        });
    });

    describe('extractTablesFromQuery', () => {
        it('should extract table from simple SELECT', () => {
            const tables = DatabaseService.extractTablesFromQuery(
                'SELECT * FROM PROJECTS'
            );

            expect(tables).toContain('projects');
        });

        it('should extract tables from JOIN queries', () => {
            const tables = DatabaseService.extractTablesFromQuery(
                'SELECT * FROM projects JOIN customers ON projects.customer_id = customers.id'
            );

            expect(tables).toContain('projects');
            expect(tables).toContain('customers');
        });

        it('should handle multiple joins', () => {
            const query = `
                SELECT * FROM projects p
                LEFT JOIN customers c ON p.customer_id = c.id
                INNER JOIN contracts ct ON p.id = ct.project_id
            `;
            const tables = DatabaseService.extractTablesFromQuery(query);

            expect(tables).toContain('projects');
            expect(tables).toContain('customers');
            expect(tables).toContain('contracts');
        });

        it('should not duplicate table names', () => {
            const query = 'SELECT * FROM projects JOIN projects p2 ON p2.parent_id = projects.id';
            const tables = DatabaseService.extractTablesFromQuery(query);

            expect(tables.filter(t => t === 'projects').length).toBe(1);
        });
    });

    describe('executeSafeQuery', () => {
        it('should execute valid query successfully', async () => {
            const mockRows = [
                { id: 1, name: 'Project 1' },
                { id: 2, name: 'Project 2' }
            ];
            mockPool.execute.mockResolvedValue([mockRows]);

            const result = await DatabaseService.executeSafeQuery(
                'SELECT * FROM projects',
                1,
                ['project_view']
            );

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockRows);
            expect(result.totalRows).toBe(2);
        });

        it('should limit large result sets', async () => {
            const mockRows = Array(150).fill().map((_, i) => ({ id: i }));
            mockPool.execute.mockResolvedValue([mockRows]);

            const result = await DatabaseService.executeSafeQuery(
                'SELECT * FROM projects',
                1,
                ['project_view']
            );

            expect(result.limited).toBe(true);
            expect(result.data.length).toBe(100);
            expect(result.totalRows).toBe(150);
        });

        it('should reject invalid query', async () => {
            await expect(
                DatabaseService.executeSafeQuery(
                    'DROP TABLE users',
                    1,
                    ['project_view']
                )
            ).rejects.toThrow();
        });

        it('should track execution time', async () => {
            mockPool.execute.mockResolvedValue([[]]);

            const result = await DatabaseService.executeSafeQuery(
                'SELECT * FROM projects',
                1,
                ['project_view']
            );

            expect(result.executionTime).toBeDefined();
            expect(typeof result.executionTime).toBe('number');
        });
    });
});
