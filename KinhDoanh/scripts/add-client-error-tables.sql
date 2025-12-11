-- Client Error Logging Tables - KHO MVG
-- Bảng lưu trữ lỗi từ client và analytics

USE kho_mvg;

-- ============================================
-- CLIENT_ERRORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS client_errors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    error_message VARCHAR(500) NOT NULL,
    stack_trace TEXT NULL,
    context JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_client_errors_user_id (user_id),
    INDEX idx_client_errors_created_at (created_at),
    INDEX idx_client_errors_ip (ip_address),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CLIENT_ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS client_analytics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    data JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_client_analytics_user_id (user_id),
    INDEX idx_client_analytics_action (action),
    INDEX idx_client_analytics_created_at (created_at),
    INDEX idx_client_analytics_user_action (user_id, action, created_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Client error logging tables created successfully!' as message;
