-- Fix Users API 500 Error
-- Kiểm tra và tạo các bảng thiếu

-- 1. Kiểm tra bảng user_project_permissions
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Kiểm tra bảng user_ai_configs
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Kiểm tra bảng user_logs
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Verify tables exist
SELECT 'Tables created/verified successfully!' as Status;
SELECT table_name, table_rows 
FROM information_schema.tables 
WHERE table_schema = 'kho_mvg' 
AND table_name IN ('user_project_permissions', 'user_ai_configs', 'user_logs');
