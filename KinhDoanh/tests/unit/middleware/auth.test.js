/**
 * Unit Tests for Auth Middleware
 * Test authentication, authorization, and resource access control
 */

const jwt = require('jsonwebtoken');
const { authenticateToken, requireRole, requirePermission, requireResourceAccess } = require('../../../middleware/auth');
const { mysqlPool } = require('../../../config/database');

jest.mock('jsonwebtoken');
jest.mock('../../../config/database');
jest.mock('../../../config/logger');

describe('Auth Middleware', () => {
    let mockPool;
    let req, res, next;

    beforeEach(() => {
        mockPool = {
            execute: jest.fn()
        };
        mysqlPool.mockReturnValue(mockPool);

        req = {
            headers: {},
            ip: '127.0.0.1',
            get: jest.fn().mockReturnValue('test-user-agent')
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        next = jest.fn();

        jest.clearAllMocks();
    });

    describe('authenticateToken', () => {
        it('should authenticate valid token', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                full_name: 'Test User',
                role: 'staff',
                permissions: '["project_view"]',
                is_active: 1
            };

            req.headers['authorization'] = 'Bearer valid-token';
            jwt.verify.mockReturnValue({ userId: 1 });
            mockPool.execute
                .mockResolvedValueOnce([[mockUser]]) // Get user
                .mockResolvedValueOnce([{ affectedRows: 1 }]); // Update last_login

            await authenticateToken(req, res, next);

            expect(req.user).toBeDefined();
            expect(req.user.id).toBe(1);
            expect(req.user.permissions).toEqual(['project_view']);
            expect(next).toHaveBeenCalled();
        });

        it('should reject request without token', async () => {
            await authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: expect.stringContaining('Token')
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject invalid token', async () => {
            req.headers['authorization'] = 'Bearer invalid-token';
            jwt.verify.mockImplementation(() => {
                const error = new Error('Invalid token');
                error.name = 'JsonWebTokenError';
                throw error;
            });

            await authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject expired token', async () => {
            req.headers['authorization'] = 'Bearer expired-token';
            jwt.verify.mockImplementation(() => {
                const error = new Error('Token expired');
                error.name = 'TokenExpiredError';
                throw error;
            });

            await authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('hết hạn')
                })
            );
        });

        it('should reject token for non-existent user', async () => {
            req.headers['authorization'] = 'Bearer valid-token';
            jwt.verify.mockReturnValue({ userId: 999 });
            mockPool.execute.mockResolvedValue([[]]); // No user found

            await authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject token for disabled user', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                is_active: 0 // Disabled
            };

            req.headers['authorization'] = 'Bearer valid-token';
            jwt.verify.mockReturnValue({ userId: 1 });
            mockPool.execute.mockResolvedValue([[mockUser]]);

            await authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('vô hiệu hóa')
                })
            );
        });

        it('should update last_login timestamp', async () => {
            const mockUser = {
                id: 1,
                username: 'testuser',
                permissions: '[]',
                is_active: 1
            };

            req.headers['authorization'] = 'Bearer valid-token';
            jwt.verify.mockReturnValue({ userId: 1 });
            mockPool.execute
                .mockResolvedValueOnce([[mockUser]])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            await authenticateToken(req, res, next);

            expect(mockPool.execute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users SET last_login'),
                [1]
            );
        });
    });

    describe('requireRole', () => {
        it('should allow user with correct role', () => {
            req.user = { role: 'admin' };
            const middleware = requireRole(['admin', 'manager']);

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should reject user with incorrect role', () => {
            req.user = { role: 'staff', username: 'testuser' };
            const middleware = requireRole(['admin', 'manager']);

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject unauthenticated request', () => {
            const middleware = requireRole(['admin']);

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    describe('requirePermission', () => {
        it('should allow admin with all permissions', () => {
            req.user = { role: 'admin', permissions: ['all'] };
            const middleware = requirePermission('secret_permission');

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should allow user with specific permission', () => {
            req.user = { 
                role: 'staff',
                permissions: ['project_view', 'project_edit']
            };
            const middleware = requirePermission('project_view');

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should reject user without permission', () => {
            req.user = {
                role: 'staff',
                username: 'testuser',
                permissions: ['project_view']
            };
            const middleware = requirePermission('project_delete');

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('project_delete')
                })
            );
        });
    });

    describe('requireResourceAccess', () => {
        beforeEach(() => {
            req.params = { id: '123' };
            req.originalUrl = '/api/projects/123';
            req.method = 'GET';
        });

        it('should allow admin access to all resources', async () => {
            req.user = { role: 'admin' };
            const middleware = requireResourceAccess('project');

            await middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(mockPool.execute).not.toHaveBeenCalled();
        });

        it('should allow manager access to all projects', async () => {
            req.user = { id: 1, role: 'manager' };
            const middleware = requireResourceAccess('project');

            await middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should allow staff access to assigned projects', async () => {
            req.user = { id: 1, role: 'staff' };
            mockPool.execute.mockResolvedValue([[{ count: 1 }]]);

            const middleware = requireResourceAccess('project');
            await middleware(req, res, next);

            expect(mockPool.execute).toHaveBeenCalledWith(
                expect.stringContaining('user_project_permissions'),
                [1, '123']
            );
            expect(next).toHaveBeenCalled();
        });

        it('should reject staff without project assignment', async () => {
            req.user = { id: 1, role: 'staff', username: 'testuser' };
            mockPool.execute.mockResolvedValue([[{ count: 0 }]]);

            const middleware = requireResourceAccess('project');
            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        it('should check customer access through projects', async () => {
            req.user = { id: 1, role: 'staff' };
            req.params = { id: '456' };
            mockPool.execute.mockResolvedValue([[{ count: 1 }]]);

            const middleware = requireResourceAccess('customer');
            await middleware(req, res, next);

            expect(mockPool.execute).toHaveBeenCalledWith(
                expect.stringContaining('user_project_permissions upp'),
                [1, '456']
            );
        });

        it('should return 400 for missing resource ID', async () => {
            req.params = {};
            req.user = { role: 'staff' };

            const middleware = requireResourceAccess('project');
            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should handle database errors', async () => {
            req.user = { id: 1, role: 'staff' };
            mockPool.execute.mockRejectedValue(new Error('DB Error'));

            const middleware = requireResourceAccess('project');
            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should allow access to default resource types', async () => {
            req.user = { id: 1, role: 'staff' };
            
            const middleware = requireResourceAccess('unknown-type');
            await middleware(req, res, next);

            expect(next).toHaveBeenCalled(); // Default allow
        });
    });
});
