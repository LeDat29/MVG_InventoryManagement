/**
 * Auto Create Missing Tables Script
 * Tự động tạo các bảng còn thiếu trong database
 */

const { mysqlPool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function createMissingTables() {
    console.log('🔍 Checking for missing tables...\n');
    
    let pool;
    try {
        pool = mysqlPool();
        if (!pool) {
            throw new Error('Database pool is null. Check your database configuration in config/database.js');
        }
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        console.log('\n💡 Alternative: Run SQL script manually:');
        console.log('   mysql -u root -p kho_mvg < tmp_rovodev_fix_users_error.sql');
        throw error;
    }
    
    try {
        // Check which tables exist
        const [tables] = await pool.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
        `);
        
        const existingTables = tables.map(t => t.table_name || t.TABLE_NAME);
        console.log('📊 Existing tables:', existingTables.length);
        
        const requiredTables = [
            'user_project_permissions',
            'user_ai_configs',
            'user_logs',
            'project_tasks',
            'task_comments',
            'task_history'
        ];
        
        const missingTables = requiredTables.filter(t => !existingTables.includes(t));
        
        if (missingTables.length === 0) {
            console.log('✅ All required tables exist!');
            return;
        }
        
        console.log('⚠️  Missing tables:', missingTables);
        console.log('\n🔧 Creating missing tables...\n');
        
        // Create user_project_permissions
        if (missingTables.includes('user_project_permissions')) {
            console.log('Creating user_project_permissions...');
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS user_project_permissions (
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
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ user_project_permissions created');
        }
        
        // Create user_ai_configs
        if (missingTables.includes('user_ai_configs')) {
            console.log('Creating user_ai_configs...');
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS user_ai_configs (
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
                    INDEX idx_user_ai_configs_user (user_id),
                    INDEX idx_user_ai_configs_active (is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ user_ai_configs created');
        }
        
        // Create user_logs
        if (missingTables.includes('user_logs')) {
            console.log('Creating user_logs...');
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS user_logs (
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
                    INDEX idx_user_logs_action (action),
                    INDEX idx_user_logs_created (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ user_logs created');
        }
        
        // Create project_tasks
        if (missingTables.includes('project_tasks')) {
            console.log('Creating project_tasks...');
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS project_tasks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    project_id INT NOT NULL,
                    task_type ENUM('fire_safety', 'security', 'maintenance', 'inspection', 'cleaning', 'equipment_check', 'other') NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    description TEXT,
                    frequency ENUM('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'yearly', 'one_time') NOT NULL,
                    assigned_to INT,
                    status ENUM('pending', 'in_progress', 'completed', 'overdue', 'cancelled') DEFAULT 'pending',
                    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                    start_date DATE NOT NULL,
                    due_date DATE NOT NULL,
                    last_completed_at DATETIME,
                    next_due_date DATE,
                    completed_by INT,
                    completed_at DATETIME,
                    completion_notes TEXT,
                    is_recurring BOOLEAN DEFAULT FALSE,
                    notify_before_days INT DEFAULT 3,
                    created_by INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_by INT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
                    FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL,
                    INDEX idx_tasks_project (project_id),
                    INDEX idx_tasks_status (status),
                    INDEX idx_tasks_due (due_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ project_tasks created');
        }
        
        // Create task_comments
        if (missingTables.includes('task_comments')) {
            console.log('Creating task_comments...');
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS task_comments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    task_id INT NOT NULL,
                    user_id INT NOT NULL,
                    comment TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_comments_task (task_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ task_comments created');
        }
        
        // Create task_history
        if (missingTables.includes('task_history')) {
            console.log('Creating task_history...');
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS task_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    task_id INT NOT NULL,
                    user_id INT NOT NULL,
                    action ENUM('created', 'updated', 'assigned', 'status_changed', 'completed', 'cancelled', 'commented') NOT NULL,
                    old_value JSON,
                    new_value JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_history_task (task_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ task_history created');
        }
        
        console.log('\n✅ All missing tables created successfully!');
        
        // Verify
        const [newTables] = await pool.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
        `);
        console.log('\n📊 Total tables now:', newTables.length);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    createMissingTables()
        .then(() => {
            console.log('\n✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = { createMissingTables };
