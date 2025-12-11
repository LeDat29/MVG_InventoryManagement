/**
 * Database Service - KHO MVG  
 * Xử lý truy vấn database an toàn cho AI Assistant
 */

const { mysqlPool } = require('../config/database');
const { logger } = require('../config/logger');

class DatabaseService {
    /**
     * 2.5.2 - Lấy schema documentation cho AI context
     */
    static async getDatabaseSchemaForAI() {
        try {
            const pool = mysqlPool();
            const [schemas] = await pool.execute(`
                SELECT table_name, table_description, columns_info, sample_queries, business_rules
                FROM database_schema_docs 
                WHERE is_active = TRUE 
                ORDER BY table_name
            `);

            let schemaContext = "=== CẤU TRÚC DATABASE ===\n\n";

            for (const schema of schemas) {
                schemaContext += `TABLE: ${schema.table_name}\n`;
                schemaContext += `Mô tả: ${schema.table_description}\n`;
                
                if (schema.columns_info) {
                    const columns = JSON.parse(schema.columns_info);
                    schemaContext += "Các cột:\n";
                    Object.entries(columns).forEach(([col, info]) => {
                        if (typeof info === 'object' && info.description) {
                            schemaContext += `  - ${col} (${info.type}): ${info.description}\n`;
                        }
                    });
                }

                if (schema.sample_queries) {
                    const samples = JSON.parse(schema.sample_queries);
                    schemaContext += "Query mẫu:\n";
                    samples.forEach(query => {
                        schemaContext += `  - ${query}\n`;
                    });
                }

                if (schema.business_rules) {
                    schemaContext += `Quy tắc nghiệp vụ: ${schema.business_rules}\n`;
                }

                schemaContext += "\n";
            }

            return schemaContext;
        } catch (error) {
            logger.error('Error getting database schema for AI:', error);
            return "Không thể tải schema database";
        }
    }

    /**
     * 2.5.4 - Thực thi SQL query an toàn với phân quyền
     */
    static async executeSafeQuery(sqlQuery, userId, userPermissions) {
        try {
            // Validate SQL query
            const validationResult = this.validateQuery(sqlQuery, userPermissions);
            if (!validationResult.isValid) {
                throw new Error(validationResult.error);
            }

            const pool = mysqlPool();
            
            // Execute query with timeout
            const startTime = Date.now();
            const [rows] = await pool.execute(sqlQuery);
            const executionTime = Date.now() - startTime;

            // Log query execution
            logger.info('AI SQL Query executed', {
                userId,
                query: sqlQuery,
                executionTime,
                rowCount: Array.isArray(rows) ? rows.length : 0
            });

            // Limit result size to prevent large responses
            let limitedRows = rows;
            if (Array.isArray(rows) && rows.length > 100) {
                limitedRows = rows.slice(0, 100);
                return {
                    success: true,
                    data: limitedRows,
                    totalRows: rows.length,
                    limited: true,
                    message: `Hiển thị 100/${rows.length} dòng đầu tiên`,
                    executionTime
                };
            }

            return {
                success: true,
                data: limitedRows,
                totalRows: Array.isArray(rows) ? rows.length : 1,
                limited: false,
                executionTime
            };

        } catch (error) {
            logger.error('SQL execution error:', {
                userId,
                query: sqlQuery,
                error: error.message
            });

            throw new Error(`Lỗi thực thi SQL: ${error.message}`);
        }
    }

    /**
     * Validate SQL query để đảm bảo an toàn
     */
    static validateQuery(sqlQuery, userPermissions) {
        const query = sqlQuery.trim().toUpperCase();

        // Only allow SELECT statements
        if (!query.startsWith('SELECT')) {
            return {
                isValid: false,
                error: 'Chỉ được phép thực thi SELECT query'
            };
        }

        // Check for SQL comments and multi-statement attacks
        if (sqlQuery.match(/--|\/\*|\*\/|;.*?(SELECT|INSERT|UPDATE|DELETE)/gi)) {
            return {
                isValid: false,
                error: 'Query chứa cú pháp nguy hiểm (comments hoặc multi-statement)'
            };
        }

        // Block dangerous keywords
        const dangerousKeywords = [
            'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 
            'TRUNCATE', 'EXEC', 'EXECUTE', 'DECLARE', 'CURSOR',
            'PROCEDURE', 'FUNCTION', 'INFORMATION_SCHEMA', 'MYSQL', 
            'PERFORMANCE_SCHEMA', 'LOAD_FILE', 'INTO OUTFILE', 'INTO DUMPFILE',
            'GRANT', 'REVOKE', 'FLUSH', 'SHUTDOWN', 'KILL'
        ];

        for (const keyword of dangerousKeywords) {
            if (query.includes(keyword)) {
                return {
                    isValid: false,
                    error: `Không được phép sử dụng từ khóa: ${keyword}`
                };
            }
        }
        
        // Check for UNION-based injection more carefully
        if (query.match(/UNION\s+(ALL\s+)?SELECT/i)) {
            return {
                isValid: false,
                error: 'Query chứa UNION SELECT không được phép'
            };
        }

        // Check table access permissions
        const accessibleTables = this.getAccessibleTables(userPermissions);
        const queryTables = this.extractTablesFromQuery(query);

        for (const table of queryTables) {
            if (!accessibleTables.includes(table)) {
                return {
                    isValid: false,
                    error: `Không có quyền truy cập bảng: ${table}`
                };
            }
        }

        // Additional security checks
        if (query.length > 5000) {
            return {
                isValid: false,
                error: 'Query quá dài (>5000 ký tự)'
            };
        }

        return { isValid: true };
    }

    /**
     * Lấy danh sách bảng user được phép truy cập
     */
    static getAccessibleTables(userPermissions) {
        const baseAccess = ['projects', 'warehouse_zones', 'customers', 'contracts'];
        
        // Admin có thể truy cập tất cả
        if (userPermissions.includes('all')) {
            return [
                ...baseAccess,
                'users', 'user_logs', 'ai_chat_sessions', 
                'ai_query_cache', 'document_categories'
            ];
        }

        // Manager có thể truy cập thêm một số bảng
        if (userPermissions.includes('user_view')) {
            baseAccess.push('users');
        }

        if (userPermissions.includes('document_view')) {
            baseAccess.push('document_categories');
        }

        return baseAccess;
    }

    /**
     * Extract table names from SQL query
     */
    static extractTablesFromQuery(query) {
        const tables = [];
        
        // Simple regex to find table names after FROM and JOIN
        const fromMatch = query.match(/FROM\s+(\w+)/gi);
        if (fromMatch) {
            fromMatch.forEach(match => {
                const table = match.replace(/FROM\s+/i, '').toLowerCase();
                if (!tables.includes(table)) {
                    tables.push(table);
                }
            });
        }

        const joinMatch = query.match(/JOIN\s+(\w+)/gi);
        if (joinMatch) {
            joinMatch.forEach(match => {
                const table = match.replace(/JOIN\s+/i, '').toLowerCase();
                if (!tables.includes(table)) {
                    tables.push(table);
                }
            });
        }

        return tables;
    }

    /**
     * Lấy danh sách functions AI có thể sử dụng dựa trên quyền
     */
    static async getAvailableFunctions(userPermissions) {
        try {
            const pool = mysqlPool();
            const [functions] = await pool.execute(`
                SELECT function_name, description, parameters_schema, required_permissions, sql_template, example_calls
                FROM ai_function_definitions 
                WHERE is_active = TRUE 
                ORDER BY function_name
            `);

            // Filter functions based on user permissions
            const availableFunctions = functions.filter(func => {
                if (!func.required_permissions) return true;
                
                const requiredPerms = JSON.parse(func.required_permissions);
                return requiredPerms.every(perm => 
                    userPermissions.includes('all') || userPermissions.includes(perm)
                );
            });

            return availableFunctions;
        } catch (error) {
            logger.error('Error getting available functions:', error);
            return [];
        }
    }

    /**
     * Execute predefined AI function
     */
    static async executeAIFunction(functionName, parameters, userId, userPermissions) {
        try {
            const pool = mysqlPool();
            const [functions] = await pool.execute(
                'SELECT * FROM ai_function_definitions WHERE function_name = ? AND is_active = TRUE',
                [functionName]
            );

            if (functions.length === 0) {
                throw new Error(`Function ${functionName} không tìm thấy`);
            }

            const func = functions[0];

            // Check permissions
            if (func.required_permissions) {
                const requiredPerms = JSON.parse(func.required_permissions);
                const hasPermission = requiredPerms.every(perm => 
                    userPermissions.includes('all') || userPermissions.includes(perm)
                );

                if (!hasPermission) {
                    throw new Error('Không có quyền thực thi function này');
                }
            }

            // Build SQL from template
            const sqlQuery = this.buildSQLFromTemplate(func.sql_template, parameters);

            // Execute the query
            const result = await this.executeSafeQuery(sqlQuery, userId, userPermissions);

            // Update function usage stats
            await pool.execute(
                'UPDATE ai_function_definitions SET usage_count = usage_count + 1 WHERE id = ?',
                [func.id]
            );

            return {
                success: true,
                function_name: functionName,
                result: result.data,
                sql_query: sqlQuery,
                execution_time: result.executionTime
            };

        } catch (error) {
            logger.error('Error executing AI function:', error);
            
            // Update failure stats
            const pool = mysqlPool();
            await pool.execute(`
                UPDATE ai_function_definitions 
                SET success_rate = GREATEST(success_rate - 1, 0) 
                WHERE function_name = ?
            `, [functionName]);

            throw error;
        }
    }

    /**
     * Build SQL from template with parameters
     */
    static buildSQLFromTemplate(template, parameters) {
        let sql = template;

        // Simple template replacement (in production, use a proper template engine)
        Object.entries(parameters || {}).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            const escapedValue = typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
            sql = sql.replace(new RegExp(placeholder, 'g'), escapedValue);
        });

        // Handle conditional blocks (basic implementation)
        sql = sql.replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => {
            return parameters && parameters[condition] ? content : '';
        });

        return sql;
    }

    /**
     * Get query suggestions based on user input
     */
    static async getQuerySuggestions(userInput, userPermissions) {
        try {
            const pool = mysqlPool();
            
            // Get cached queries with high satisfaction scores
            const [cached] = await pool.execute(`
                SELECT question, sql_query, satisfaction_score 
                FROM ai_query_cache 
                WHERE satisfaction_score >= 80 
                AND question LIKE ? 
                ORDER BY satisfaction_score DESC, usage_count DESC 
                LIMIT 5
            `, [`%${userInput}%`]);

            // Get relevant function examples
            const functions = await this.getAvailableFunctions(userPermissions);
            const relevantFunctions = functions.filter(func => 
                func.description.toLowerCase().includes(userInput.toLowerCase()) ||
                func.function_name.toLowerCase().includes(userInput.toLowerCase())
            ).slice(0, 3);

            return {
                cached_queries: cached,
                suggested_functions: relevantFunctions.map(func => ({
                    name: func.function_name,
                    description: func.description,
                    examples: func.example_calls ? JSON.parse(func.example_calls) : []
                }))
            };

        } catch (error) {
            logger.error('Error getting query suggestions:', error);
            return {
                cached_queries: [],
                suggested_functions: []
            };
        }
    }

    /**
     * Analyze query performance and suggest optimizations
     */
    static analyzeQueryPerformance(sqlQuery, executionTime, resultCount) {
        const analysis = {
            performance: 'good',
            suggestions: []
        };

        // Analyze execution time
        if (executionTime > 5000) { // > 5 seconds
            analysis.performance = 'slow';
            analysis.suggestions.push('Query thực thi chậm, cân nhắc thêm index hoặc tối ưu query');
        } else if (executionTime > 2000) { // > 2 seconds
            analysis.performance = 'moderate';
            analysis.suggestions.push('Query có thể được tối ưu để tăng tốc độ');
        }

        // Analyze result count
        if (resultCount > 1000) {
            analysis.suggestions.push('Kết quả quá nhiều, cân nhắc thêm điều kiện LIMIT');
        }

        // Analyze query complexity
        const queryUpper = sqlQuery.toUpperCase();
        if (queryUpper.includes('GROUP BY') && queryUpper.includes('ORDER BY')) {
            analysis.suggestions.push('Query phức tạp với GROUP BY và ORDER BY, đảm bảo có index phù hợp');
        }

        return analysis;
    }
}

module.exports = DatabaseService;