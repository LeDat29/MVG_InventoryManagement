/**
 * Quick Fix - Create Missing Tables
 * Sử dụng mysql2 trực tiếp
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function quickFixTables() {
    console.log('🔧 Quick Fix - Creating Missing Tables\n');
    
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '123456',
        database: process.env.DB_NAME || 'kho_mvg',
        multipleStatements: true
    };
    
    console.log('📡 Connecting to:', config.host, '/', config.database);
    
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connected to database\n');
        
        // Create tables
        const tables = [
            {
                name: 'user_project_permissions',
                sql: `CREATE TABLE IF NOT EXISTS user_project_permissions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    project_id INT NOT NULL,
                    permissions JSON,
                    created_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_by INT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_user_project (user_id, project_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'user_ai_configs',
                sql: `CREATE TABLE IF NOT EXISTS user_ai_configs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    provider ENUM('openai', 'gemini', 'claude', 'copilot') NOT NULL,
                    api_key TEXT NOT NULL,
                    model VARCHAR(100) NOT NULL,
                    cost_per_1k_tokens DECIMAL(10, 6) DEFAULT 0.002,
                    is_active BOOLEAN DEFAULT TRUE,
                    priority INT DEFAULT 1,
                    usage_count INT DEFAULT 0,
                    total_cost DECIMAL(10, 4) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_user_ai_configs_user (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            },
            {
                name: 'user_logs',
                sql: `CREATE TABLE IF NOT EXISTS user_logs (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT,
                    action VARCHAR(100) NOT NULL,
                    entity_type VARCHAR(50),
                    entity_id INT,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    details JSON,
                    is_ai_assisted BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                    INDEX idx_user_logs_user (user_id),
                    INDEX idx_user_logs_action (action)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
            }
        ];
        
        for (const table of tables) {
            console.log(`Creating ${table.name}...`);
            await connection.execute(table.sql);
            console.log(`✅ ${table.name} created`);
        }
        
        console.log('\n✅ All tables created successfully!');
        
        // Verify
        const [rows] = await connection.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ?
            ORDER BY table_name
        `, [config.database]);
        
        console.log(`\n📊 Total tables: ${rows.length}`);
        console.log('Tables:', rows.map(r => r.TABLE_NAME).join(', '));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Connection closed');
        }
    }
}

quickFixTables()
    .then(() => {
        console.log('\n🎉 SUCCESS! You can now restart the server and test.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 FAILED:', error.message);
        console.log('\n📝 Manual solution: Run this SQL in your MySQL client:');
        console.log('   Source file: tmp_rovodev_fix_users_error.sql');
        process.exit(1);
    });
