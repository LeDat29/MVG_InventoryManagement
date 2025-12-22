/**
 * Auto Database Initialization Script
 * Tự động tạo database, tables và seed data khi start server
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
};

const DB_NAME = 'kho_mvg';

class DatabaseAutoInit {
    constructor() {
        this.connection = null;
    }

    async connect() {
        try {
            this.connection = await mysql.createConnection(DB_CONFIG);
            console.log('✅ Kết nối MySQL thành công');
            return true;
        } catch (error) {
            console.error('❌ Lỗi kết nối MySQL:', error.message);
            return false;
        }
    }

    async createDatabase() {
        try {
            await this.connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            console.log(`✅ Database '${DB_NAME}' đã sẵn sàng`);
            await this.connection.query(`USE ${DB_NAME}`);
            return true;
        } catch (error) {
            console.error('❌ Lỗi tạo database:', error.message);
            return false;
        }
    }

    async checkTableExists(tableName) {
        try {
            const [rows] = await this.connection.query(
                `SELECT COUNT(*) as count FROM information_schema.tables 
                 WHERE table_schema = ? AND table_name = ?`,
                [DB_NAME, tableName]
            );
            return rows[0].count > 0;
        } catch (error) {
            return false;
        }
    }

    async runSQLFile(filePath) {
        try {
            const sqlContent = await fs.readFile(filePath, 'utf8');

            // Split by semicolon but be careful with stored procedures
            const statements = sqlContent
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

            for (const statement of statements) {
                if (statement.trim()) {
                    let retries = 3; // Retry up to 3 times for deadlock errors
                    while (retries > 0) {
                        try {
                            await this.connection.query(statement);
                            break; // Exit retry loop on success
                        } catch (err) {
                            if (err.message.includes('Deadlock')) {
                                console.warn(`⚠️  Deadlock detected, retrying... (${4 - retries} attempt)`);
                                retries -= 1;
                                if (retries === 0) {
                                    throw new Error(`Deadlock could not be resolved: ${err.message}`);
                                }
                            } else {
                                // Ignore duplicate key errors and other non-critical errors
                                if (!err.message.includes('Duplicate') && !err.message.includes('already exists')) {
                                    console.warn(`⚠️  Warning executing statement: ${err.message}`);
                                }
                                break; // Exit retry loop for non-deadlock errors
                            }
                        }
                    }
                }
            }

            return true;
        } catch (error) {
            console.error(`❌ Lỗi đọc file ${filePath}:`, error.message);
            return false;
        }
    }

    async initializeTables() {
        console.log('\n📋 Khởi tạo tables...');
        
        try {
            // Create tables directly with SQL
            await this.connection.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    full_name VARCHAR(100) NOT NULL,
                    phone VARCHAR(20),
                    role ENUM('admin', 'manager', 'staff', 'viewer') DEFAULT 'staff',
                    permissions JSON,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    last_login TIMESTAMP NULL,
                    INDEX idx_username (username),
                    INDEX idx_email (email),
                    INDEX idx_role (role)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS customers (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(200) NOT NULL,
                    tax_code VARCHAR(50),
                    address TEXT,
                    representative_name VARCHAR(100),
                    representative_phone VARCHAR(20),
                    representative_email VARCHAR(100),
                    status ENUM('active', 'inactive', 'potential') DEFAULT 'potential',
                    notes TEXT,
                    created_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_name (name),
                    INDEX idx_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS projects (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    customer_id INT,
                    name VARCHAR(200) NOT NULL,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    description TEXT,
                    address TEXT,
                    province VARCHAR(100),
                    district VARCHAR(100),
                    ward VARCHAR(100),
                    latitude DECIMAL(10, 8),
                    longitude DECIMAL(11, 8),
                    total_area DECIMAL(15, 2),
                    used_area DECIMAL(15, 2) DEFAULT 0,
                    available_area DECIMAL(15, 2),
                    fixed_area DECIMAL(15, 2) DEFAULT 0,
                    status ENUM('planning', 'construction', 'operational', 'maintenance') DEFAULT 'planning',
                    owner_info JSON,
                    legal_documents JSON,
                    map_data JSON,
                    warehouse_layout JSON,
                    manager_id INT,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
                    INDEX idx_code (code),
                    INDEX idx_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS contracts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    customer_id INT,
                    project_id INT,
                    contract_number VARCHAR(100) UNIQUE NOT NULL,
                    contract_type ENUM('main', 'appendix', 'liquidation'),
                    description TEXT,
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    total_value DECIMAL(20, 2),
                    payment_terms TEXT,
                    status ENUM('draft', 'active', 'expired', 'terminated') DEFAULT 'draft',
                    created_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS warehouse_zones (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    project_id INT NOT NULL,
                    zone_code VARCHAR(50) NOT NULL,
                    zone_name VARCHAR(200),
                    area DECIMAL(15, 2) NOT NULL,
                    zone_type ENUM('rental', 'fixed_service', 'common_area') DEFAULT 'rental',
                    status ENUM('available', 'rented', 'deposited', 'maintenance') DEFAULT 'available',
                    rental_price DECIMAL(15, 2),
                    coordinates JSON,
                    facilities JSON,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                    INDEX idx_project_zone (project_id, zone_code)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS user_project_permissions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    project_id INT NOT NULL,
                    permissions JSON,
                    created_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_user_project (user_id, project_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS user_ai_configs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    provider ENUM('openai', 'gemini', 'copilot', 'claude') NOT NULL,
                    api_key TEXT NOT NULL,
                    model VARCHAR(100) NOT NULL,
                    cost_per_1k_tokens DECIMAL(10, 6) DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    priority INT DEFAULT 1,
                    usage_count INT DEFAULT 0,
                    total_cost DECIMAL(15, 6) DEFAULT 0,
                    created_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS ai_chat_sessions (
                    session_id VARCHAR(100) PRIMARY KEY,
                    user_id INT NOT NULL,
                    ai_provider VARCHAR(50),
                    ai_model VARCHAR(100),
                    status ENUM('active', 'ended') DEFAULT 'active',
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ended_at TIMESTAMP NULL,
                    total_messages INT DEFAULT 0,
                    total_tokens INT DEFAULT 0,
                    total_cost DECIMAL(10, 6) DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS ai_chat_messages (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    session_id VARCHAR(100) NOT NULL,
                    role ENUM('user', 'assistant', 'system') NOT NULL,
                    content TEXT NOT NULL,
                    tokens_used INT DEFAULT 0,
                    cost DECIMAL(10, 6) DEFAULT 0,
                    response_time_ms INT,
                    is_function_call BOOLEAN DEFAULT FALSE,
                    function_name VARCHAR(100),
                    function_result JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(session_id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS ai_query_cache (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    question_hash VARCHAR(64) UNIQUE NOT NULL,
                    question TEXT NOT NULL,
                    sql_query TEXT,
                    response_data JSON,
                    satisfaction_score INT DEFAULT 0,
                    usage_count INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS user_logs (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT,
                    action VARCHAR(100) NOT NULL,
                    resource_type VARCHAR(50),
                    resource_id INT,
                    details JSON,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    is_ai_assisted BOOLEAN DEFAULT FALSE,
                    ai_session_id VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                    INDEX idx_user_action (user_id, action, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS database_schema_docs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    table_name VARCHAR(100) UNIQUE NOT NULL,
                    table_description TEXT,
                    columns_info JSON,
                    sample_queries JSON,
                    business_rules TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS ai_function_definitions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    function_name VARCHAR(100) UNIQUE NOT NULL,
                    description TEXT,
                    parameters_schema JSON,
                    required_permissions JSON,
                    sql_template TEXT,
                    example_calls JSON,
                    is_active BOOLEAN DEFAULT TRUE,
                    usage_count INT DEFAULT 0,
                    success_rate INT DEFAULT 100,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                CREATE TABLE IF NOT EXISTS documents (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    document_name VARCHAR(255) NOT NULL,
                    document_type ENUM('contract', 'invoice', 'report') NOT NULL,
                    content TEXT NOT NULL,
                    created_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
            
            console.log('✅ Tables cơ bản đã được tạo');
            return true;
        } catch (error) {
            console.error('❌ Lỗi khởi tạo tables:', error.message);
            return false;
        }
    }

    async applyIndexes() {
        console.log('\n🔧 Áp dụng indexes...');
        
        const indexPath = path.join(__dirname, 'add-indexes.sql');
        try {
            const exists = await fs.access(indexPath).then(() => true).catch(() => false);
            if (exists) {
                await this.runSQLFile(indexPath);
                console.log('✅ Indexes đã được áp dụng');
            } else {
                console.log('⏭️  File add-indexes.sql không tồn tại, bỏ qua');
            }
            return true;
        } catch (error) {
            console.error('⚠️  Lỗi áp dụng indexes:', error.message);
            return true; // Non-critical, continue
        }
    }

    async applyClientErrorTables() {
        console.log('\n📊 Tạo bảng client errors...');
        
        const clientErrorPath = path.join(__dirname, 'add-client-error-tables.sql');
        try {
            const exists = await fs.access(clientErrorPath).then(() => true).catch(() => false);
            if (exists) {
                await this.runSQLFile(clientErrorPath);
                console.log('✅ Client error tables đã được tạo');
            } else {
                console.log('⏭️  File add-client-error-tables.sql không tồn tại, bỏ qua');
            }
            return true;
        } catch (error) {
            console.error('⚠️  Lỗi tạo client error tables:', error.message);
            return true; // Non-critical
        }
    }


    async checkAndCreateAdminUser() {
        console.log('\n👤 Kiểm tra admin user...');
        
        try {
            const [users] = await this.connection.query(
                'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
            );
            
            if (users[0].count === 0) {
                const bcrypt = require('bcryptjs');
                const crypto = require('crypto');
                
                // Use environment variable if provided, otherwise fixed default password: 12345678
                const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || '12345678';
                const hashedPassword = await bcrypt.hash(defaultPassword, 12);
                
                await this.connection.query(`
                    INSERT INTO users (username, email, password_hash, full_name, role, permissions, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, ['admin', 'admin@kho-mvg.local', hashedPassword, 'System Administrator', 'admin', '["all"]', 1]);
                
                console.log('✅ Admin user đã được tạo');
                console.log('=' .repeat(80));
                console.log('🔐 THÔNG TIN ĐĂNG NHẬP ADMIN:');
                console.log(`   Username: admin`);
                console.log(`   Password: ${defaultPassword}`);
                console.log('   ⚠️  QUAN TRỌNG: Đổi mật khẩu này NGAY sau lần đăng nhập đầu tiên!');
                console.log('=' .repeat(80));
            } else {
                console.log('✅ Admin user đã tồn tại');
            }
            return true;
        } catch (error) {
            console.error('❌ Lỗi kiểm tra/tạo admin user:', error.message);
            return false;
        }
    }

    async getTableStats() {
        try {
            const [tables] = await this.connection.query(`
                SELECT 
                    TABLE_NAME,
                    TABLE_ROWS,
                    ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS size_mb
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = ?
                ORDER BY TABLE_NAME
            `, [DB_NAME]);
            
            return tables;
        } catch (error) {
            return [];
        }
    }

    async printSummary() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 DATABASE SUMMARY');
        console.log('='.repeat(80));
        
        const stats = await this.getTableStats();
        
        if (stats.length > 0) {
            console.log(`\n📋 Tổng số tables: ${stats.length}`);
            console.log('\nTop 10 tables:');
            console.log('┌─────────────────────────────┬──────────┬────────────┐');
            console.log('│ Table Name                  │ Rows     │ Size (MB)  │');
            console.log('├─────────────────────────────┼──────────┼────────────┤');
            
            stats.slice(0, 10).forEach(table => {
                const name = table.TABLE_NAME.padEnd(27);
                const rows = String(table.TABLE_ROWS || 0).padStart(8);
                const size = String(table.size_mb || 0).padStart(10);
                console.log(`│ ${name} │ ${rows} │ ${size} │`);
            });
            
            console.log('└─────────────────────────────┴──────────┴────────────┘');
        }
        
        console.log('\n✅ Database sẵn sàng sử dụng!');
        console.log('='.repeat(80) + '\n');
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
        }
    }

    async run() {
        console.log('\n' + '='.repeat(80));
        console.log('🚀 AUTO DATABASE INITIALIZATION - KHO MVG');
        console.log('='.repeat(80) + '\n');

        try {
            // Step 1: Connect to MySQL
            const connected = await this.connect();
            if (!connected) {
                console.error('❌ Không thể kết nối MySQL. Vui lòng kiểm tra cấu hình.');
                return false;
            }

            // Step 2: Create database
            const dbCreated = await this.createDatabase();
            if (!dbCreated) {
                return false;
            }

            // Step 3: Check if tables exist
            const tablesExist = await this.checkTableExists('users');

            if (!tablesExist) {
                console.log('\n🆕 Database mới, khởi tạo lần đầu...');

                // Initialize tables
                await this.initializeTables();

                // Apply indexes
                await this.applyIndexes();

                // Create client error tables
                await this.applyClientErrorTables();

                // Create admin user
                await this.checkAndCreateAdminUser();
            } else {
                console.log('\n🔄 Database đã tồn tại, kiểm tra cập nhật...');

                // Apply indexes (if new ones added)
                await this.applyIndexes();

                // Check for client error tables
                const clientErrorTableExists = await this.checkTableExists('client_errors');
                if (!clientErrorTableExists) {
                    await this.applyClientErrorTables();
                }

                // Check admin user
                await this.checkAndCreateAdminUser();
            }

            // Print summary
            await this.printSummary();

            return true;
        } catch (error) {
            console.error('❌ Lỗi trong quá trình khởi tạo:', error.message);
            return false;
        } finally {
            // Ensure connection is closed
            await this.close();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const autoInit = new DatabaseAutoInit();
    autoInit.run()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Lỗi nghiêm trọng:', error);
            process.exit(1);
        });
}

module.exports = DatabaseAutoInit;
