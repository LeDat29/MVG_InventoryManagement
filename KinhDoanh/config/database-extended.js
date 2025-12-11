/**
 * Extended Database Schema - KHO MVG
 * Bổ sung các bảng cho User Management và AI Assistant
 */

const { mysqlPool } = require('./database');
const { logger } = require('./logger');

/**
 * Tạo các bảng mở rộng cho User Management và AI
 */
async function createExtendedTables() {
    const pool = mysqlPool();
    
    const extendedTables = [
        // User Project Permissions - Quyền hạn theo dự án
        `CREATE TABLE IF NOT EXISTS user_project_permissions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            project_id INT NOT NULL,
            permissions JSON NOT NULL COMMENT 'Danh sách quyền: [view, edit, delete, manage_zones, etc]',
            created_by INT,
            updated_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_project (user_id, project_id),
            INDEX idx_user_id (user_id),
            INDEX idx_project_id (project_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (updated_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // User AI Configurations - Cấu hình API AI theo user
        `CREATE TABLE IF NOT EXISTS user_ai_configs (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            provider ENUM('openai', 'gemini', 'copilot', 'claude', 'anthropic') NOT NULL,
            api_key TEXT NOT NULL,
            model VARCHAR(100) NOT NULL COMMENT 'gpt-4, gemini-pro, claude-3, etc',
            cost_per_1k_tokens DECIMAL(10, 6) NOT NULL COMMENT 'Chi phí per 1000 tokens (USD)',
            max_tokens INT DEFAULT 4000,
            temperature DECIMAL(3, 2) DEFAULT 0.7,
            is_active BOOLEAN DEFAULT TRUE,
            priority INT DEFAULT 1 COMMENT 'Thứ tự ưu tiên sử dụng (1 = cao nhất)',
            usage_count INT DEFAULT 0,
            total_cost DECIMAL(10, 4) DEFAULT 0,
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_provider (provider),
            INDEX idx_active_priority (is_active, priority),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // AI Chat Sessions - Phiên chat với AI
        `CREATE TABLE IF NOT EXISTS ai_chat_sessions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            session_id VARCHAR(100) UNIQUE NOT NULL,
            user_id INT NOT NULL,
            title VARCHAR(500),
            ai_provider VARCHAR(50),
            ai_model VARCHAR(100),
            total_messages INT DEFAULT 0,
            total_tokens INT DEFAULT 0,
            total_cost DECIMAL(10, 6) DEFAULT 0,
            status ENUM('active', 'ended', 'error') DEFAULT 'active',
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP NULL,
            INDEX idx_user_id (user_id),
            INDEX idx_session_id (session_id),
            INDEX idx_started_at (started_at),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // AI Chat Messages - Tin nhắn trong chat
        `CREATE TABLE IF NOT EXISTS ai_chat_messages (
            id INT PRIMARY KEY AUTO_INCREMENT,
            session_id VARCHAR(100) NOT NULL,
            role ENUM('user', 'assistant', 'system') NOT NULL,
            content TEXT NOT NULL,
            tokens_used INT DEFAULT 0,
            cost DECIMAL(10, 6) DEFAULT 0,
            response_time_ms INT,
            is_function_call BOOLEAN DEFAULT FALSE,
            function_name VARCHAR(100),
            function_arguments JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_session_id (session_id),
            INDEX idx_created_at (created_at),
            FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(session_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // AI Query Cache - Cache câu hỏi và câu trả lời
        `CREATE TABLE IF NOT EXISTS ai_query_cache (
            id INT PRIMARY KEY AUTO_INCREMENT,
            question_hash VARCHAR(64) UNIQUE NOT NULL COMMENT 'MD5 hash của câu hỏi',
            question TEXT NOT NULL,
            sql_query TEXT NOT NULL COMMENT 'Câu SQL query cuối cùng',
            response_data JSON COMMENT 'Dữ liệu response mẫu',
            satisfaction_score INT DEFAULT 100 COMMENT 'Điểm hài lòng (100 = hoàn hảo)',
            usage_count INT DEFAULT 1,
            success_count INT DEFAULT 1,
            last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INT,
            updated_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_question_hash (question_hash),
            INDEX idx_satisfaction_score (satisfaction_score),
            INDEX idx_last_used (last_used_at),
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (updated_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Database Schema Documentation - Mô tả bảng cho AI
        `CREATE TABLE IF NOT EXISTS database_schema_docs (
            id INT PRIMARY KEY AUTO_INCREMENT,
            table_name VARCHAR(100) NOT NULL,
            table_description TEXT NOT NULL,
            columns_info JSON NOT NULL COMMENT 'Mô tả các cột và mối quan hệ',
            sample_queries JSON COMMENT 'Các câu query mẫu',
            business_rules TEXT COMMENT 'Quy tắc nghiệp vụ',
            is_active BOOLEAN DEFAULT TRUE,
            version VARCHAR(20) DEFAULT '1.0',
            created_by INT,
            updated_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_table (table_name),
            INDEX idx_table_name (table_name),
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (updated_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // AI Function Definitions - Định nghĩa các function AI có thể gọi
        `CREATE TABLE IF NOT EXISTS ai_function_definitions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            function_name VARCHAR(100) UNIQUE NOT NULL,
            description TEXT NOT NULL,
            parameters_schema JSON NOT NULL COMMENT 'JSON Schema cho parameters',
            required_permissions JSON COMMENT 'Quyền cần thiết để thực thi',
            sql_template TEXT COMMENT 'Template SQL query',
            example_calls JSON COMMENT 'Ví dụ cách gọi function',
            is_active BOOLEAN DEFAULT TRUE,
            usage_count INT DEFAULT 0,
            success_rate DECIMAL(5, 2) DEFAULT 100.00,
            created_by INT,
            updated_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_function_name (function_name),
            INDEX idx_active (is_active),
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (updated_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

        // Extended User Logs - Bổ sung cho AI tracking
        `ALTER TABLE user_logs 
         ADD COLUMN IF NOT EXISTS is_ai_assisted BOOLEAN DEFAULT FALSE,
         ADD COLUMN IF NOT EXISTS ai_session_id VARCHAR(100),
         ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50),
         ADD COLUMN IF NOT EXISTS ai_cost DECIMAL(10, 6) DEFAULT 0,
         ADD INDEX idx_ai_assisted (is_ai_assisted),
         ADD INDEX idx_ai_session (ai_session_id)`
    ];

    for (const table of extendedTables) {
        try {
            await pool.execute(table);
        } catch (error) {
            logger.error(`Error creating extended table: ${error.message}`);
            // Continue with other tables
        }
    }

    logger.info('Extended database tables created successfully');
}

/**
 * Khởi tạo dữ liệu mẫu cho Database Schema Documentation
 */
async function initializeSchemaDocumentation() {
    const pool = mysqlPool();

    const schemaDocs = [
        {
            table_name: 'projects',
            table_description: 'Bảng chứa thông tin các dự án kho xưởng. Mỗi dự án có nhiều zones (khu vực kho)',
            columns_info: JSON.stringify({
                id: { type: 'INT', description: 'ID duy nhất của dự án', primary_key: true },
                name: { type: 'VARCHAR(200)', description: 'Tên dự án kho xưởng' },
                code: { type: 'VARCHAR(50)', description: 'Mã dự án (unique), format: KX-XX-001' },
                address: { type: 'TEXT', description: 'Địa chỉ đầy đủ của dự án' },
                province: { type: 'VARCHAR(100)', description: 'Tỉnh/Thành phố' },
                total_area: { type: 'DECIMAL(12,2)', description: 'Tổng diện tích dự án (m²)' },
                used_area: { type: 'DECIMAL(12,2)', description: 'Diện tích đã sử dụng (m²)' },
                status: { type: 'ENUM', description: 'Trạng thái: planning, construction, operational, maintenance' },
                relationships: {
                    warehouse_zones: 'Một dự án có nhiều zones (1:n)',
                    contracts: 'Một dự án có nhiều hợp đồng thuê qua zones (1:n)'
                }
            }),
            sample_queries: JSON.stringify([
                "SELECT * FROM projects WHERE status = 'operational'",
                "SELECT p.name, COUNT(wz.id) as zone_count FROM projects p LEFT JOIN warehouse_zones wz ON p.id = wz.project_id GROUP BY p.id",
                "SELECT * FROM projects WHERE province LIKE '%Bình Dương%'"
            ]),
            business_rules: 'Dự án phải có ít nhất 1 zone để có thể cho thuê. Trạng thái operational mới có thể tạo hợp đồng.'
        },
        {
            table_name: 'warehouse_zones',
            table_description: 'Bảng chứa thông tin các khu vực kho trong dự án. Mỗi zone có thể cho thuê riêng biệt',
            columns_info: JSON.stringify({
                id: { type: 'INT', description: 'ID duy nhất của zone', primary_key: true },
                project_id: { type: 'INT', description: 'ID dự án chứa zone này', foreign_key: 'projects.id' },
                zone_code: { type: 'VARCHAR(50)', description: 'Mã zone trong dự án (A1, B2, C3...)' },
                area: { type: 'DECIMAL(10,2)', description: 'Diện tích zone (m²)' },
                status: { 
                    type: 'ENUM', 
                    description: 'Trạng thái zone',
                    values: {
                        available: 'Chưa cho thuê (màu đỏ)',
                        rented: 'Đã cho thuê (màu xanh)',
                        deposited: 'Đã nhận cọc (màu cam)',
                        maintenance: 'Bảo trì/Cố định (màu trắng)'
                    }
                },
                rental_price: { type: 'DECIMAL(12,2)', description: 'Giá thuê (VNĐ/m²/tháng)' }
            }),
            sample_queries: JSON.stringify([
                "SELECT * FROM warehouse_zones WHERE status = 'available'",
                "SELECT wz.*, p.name as project_name FROM warehouse_zones wz JOIN projects p ON wz.project_id = p.id WHERE wz.status = 'rented'",
                "SELECT status, COUNT(*) as count, SUM(area) as total_area FROM warehouse_zones GROUP BY status"
            ])
        },
        {
            table_name: 'customers',
            table_description: 'Bảng chứa thông tin khách hàng thuê kho. Bao gồm cả doanh nghiệp và cá nhân',
            columns_info: JSON.stringify({
                id: { type: 'INT', description: 'ID duy nhất khách hàng', primary_key: true },
                customer_code: { type: 'VARCHAR(50)', description: 'Mã khách hàng (KH001, KH002...)' },
                company_name: { type: 'VARCHAR(200)', description: 'Tên công ty (null nếu là cá nhân)' },
                contact_person: { type: 'VARCHAR(100)', description: 'Tên người liên hệ' },
                customer_type: { type: 'ENUM', description: 'Loại: company (doanh nghiệp), individual (cá nhân)' },
                credit_rating: { type: 'ENUM', description: 'Xếp hạng tín dụng: A (tốt), B (khá), C (TB), D (kém)' }
            }),
            sample_queries: JSON.stringify([
                "SELECT * FROM customers WHERE customer_type = 'company'",
                "SELECT * FROM customers WHERE credit_rating = 'A'",
                "SELECT c.*, COUNT(ct.id) as contract_count FROM customers c LEFT JOIN contracts ct ON c.id = ct.customer_id GROUP BY c.id"
            ])
        },
        {
            table_name: 'contracts',
            table_description: 'Bảng chứa thông tin hợp đồng thuê kho giữa khách hàng và zones',
            columns_info: JSON.stringify({
                id: { type: 'INT', description: 'ID duy nhất hợp đồng', primary_key: true },
                contract_number: { type: 'VARCHAR(100)', description: 'Số hợp đồng (HD240001...)' },
                customer_id: { type: 'INT', description: 'ID khách hàng', foreign_key: 'customers.id' },
                project_id: { type: 'INT', description: 'ID dự án', foreign_key: 'projects.id' },
                zone_id: { type: 'INT', description: 'ID zone được thuê', foreign_key: 'warehouse_zones.id' },
                start_date: { type: 'DATE', description: 'Ngày bắt đầu hợp đồng' },
                end_date: { type: 'DATE', description: 'Ngày kết thúc hợp đồng' },
                rental_price: { type: 'DECIMAL(12,2)', description: 'Giá thuê (VNĐ/m²/tháng)' },
                status: { 
                    type: 'ENUM',
                    description: 'Trạng thái hợp đồng', 
                    values: {
                        draft: 'Bản nháp',
                        active: 'Đang hiệu lực',
                        expired: 'Hết hạn',
                        terminated: 'Đã thanh lý'
                    }
                }
            }),
            sample_queries: JSON.stringify([
                "SELECT * FROM contracts WHERE status = 'active'",
                "SELECT * FROM contracts WHERE end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)",
                "SELECT c.*, cu.company_name, p.name as project_name, wz.zone_code FROM contracts c JOIN customers cu ON c.customer_id = cu.id JOIN projects p ON c.project_id = p.id JOIN warehouse_zones wz ON c.zone_id = wz.id"
            ])
        }
    ];

    for (const doc of schemaDocs) {
        await pool.execute(`
            INSERT INTO database_schema_docs (table_name, table_description, columns_info, sample_queries, business_rules, created_by)
            VALUES (?, ?, ?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE 
                table_description = VALUES(table_description),
                columns_info = VALUES(columns_info),
                sample_queries = VALUES(sample_queries),
                updated_by = 1,
                updated_at = NOW()
        `, [doc.table_name, doc.table_description, doc.columns_info, doc.sample_queries, doc.business_rules || null]);
    }

    logger.info('Database schema documentation initialized');
}

/**
 * Khởi tạo AI Function Definitions
 */
async function initializeAIFunctions() {
    const pool = mysqlPool();

    const aiFunctions = [
        {
            function_name: 'get_projects_summary',
            description: 'Lấy thống kê tổng quan về các dự án kho xưởng',
            parameters_schema: JSON.stringify({
                type: 'object',
                properties: {
                    status: { type: 'string', enum: ['planning', 'construction', 'operational', 'maintenance'] },
                    province: { type: 'string' }
                }
            }),
            required_permissions: JSON.stringify(['project_view']),
            sql_template: `SELECT 
                COUNT(*) as total_projects,
                SUM(total_area) as total_area,
                SUM(used_area) as used_area,
                AVG(used_area/total_area*100) as avg_occupancy_rate
                FROM projects 
                WHERE is_active = TRUE
                {{#if status}}AND status = '{{status}}'{{/if}}
                {{#if province}}AND province = '{{province}}'{{/if}}`,
            example_calls: JSON.stringify([
                { description: 'Thống kê tất cả dự án', params: {} },
                { description: 'Thống kê dự án đang hoạt động', params: { status: 'operational' } }
            ])
        },
        {
            function_name: 'get_zone_availability',
            description: 'Kiểm tra tình trạng zones available trong dự án',
            parameters_schema: JSON.stringify({
                type: 'object',
                properties: {
                    project_id: { type: 'integer' },
                    min_area: { type: 'number' },
                    max_price: { type: 'number' }
                }
            }),
            required_permissions: JSON.stringify(['project_view', 'zone_view']),
            sql_template: `SELECT wz.zone_code, wz.area, wz.rental_price, p.name as project_name
                FROM warehouse_zones wz
                JOIN projects p ON wz.project_id = p.id
                WHERE wz.status = 'available'
                {{#if project_id}}AND wz.project_id = {{project_id}}{{/if}}
                {{#if min_area}}AND wz.area >= {{min_area}}{{/if}}
                {{#if max_price}}AND wz.rental_price <= {{max_price}}{{/if}}
                ORDER BY wz.rental_price ASC`
        },
        {
            function_name: 'get_expiring_contracts',
            description: 'Lấy danh sách hợp đồng sắp hết hạn',
            parameters_schema: JSON.stringify({
                type: 'object',
                properties: {
                    days: { type: 'integer', default: 30, description: 'Số ngày trước khi hết hạn' }
                }
            }),
            required_permissions: JSON.stringify(['contract_view']),
            sql_template: `SELECT c.contract_number, cu.company_name, cu.contact_person, 
                c.end_date, DATEDIFF(c.end_date, NOW()) as days_left
                FROM contracts c
                JOIN customers cu ON c.customer_id = cu.id
                WHERE c.status = 'active' 
                AND c.end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL {{days}} DAY)
                ORDER BY c.end_date ASC`
        }
    ];

    for (const func of aiFunctions) {
        await pool.execute(`
            INSERT INTO ai_function_definitions (function_name, description, parameters_schema, required_permissions, sql_template, example_calls, created_by)
            VALUES (?, ?, ?, ?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE 
                description = VALUES(description),
                parameters_schema = VALUES(parameters_schema),
                sql_template = VALUES(sql_template),
                updated_by = 1,
                updated_at = NOW()
        `, [func.function_name, func.description, func.parameters_schema, func.required_permissions, func.sql_template, func.example_calls || null]);
    }

    logger.info('AI function definitions initialized');
}

module.exports = {
    createExtendedTables,
    initializeSchemaDocumentation,
    initializeAIFunctions
};