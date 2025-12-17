-- ============================================
-- PROJECT TASKS MANAGEMENT (Feature 2.1.7)
-- Created: 2024-12-05
-- Description: Quản lý công việc định kỳ cho dự án
-- ============================================

-- Create project_tasks table
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
    
    -- Scheduling
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    last_completed_at DATETIME,
    next_due_date DATE,
    
    -- Completion tracking
    completed_by INT,
    completed_at DATETIME,
    completion_notes TEXT,
    
    -- Attachments & Evidence
    attachments JSON COMMENT 'Array of file URLs',
    
    -- Recurring settings
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule JSON COMMENT 'For complex recurring rules',
    
    -- Notifications
    notify_before_days INT DEFAULT 3,
    last_notification_sent DATETIME,
    
    -- Metadata
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_tasks_project (project_id),
    INDEX idx_tasks_assigned (assigned_to),
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_due (due_date),
    INDEX idx_tasks_next_due (next_due_date),
    INDEX idx_tasks_type (task_type),
    INDEX idx_tasks_priority (priority),
    INDEX idx_tasks_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create task_comments table for discussion
CREATE TABLE IF NOT EXISTS task_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    attachments JSON COMMENT 'Array of file URLs',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_comments_task (task_id),
    INDEX idx_comments_user (user_id),
    INDEX idx_comments_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create task_history table for audit trail
CREATE TABLE IF NOT EXISTS task_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    action ENUM('created', 'updated', 'assigned', 'status_changed', 'completed', 'cancelled', 'commented') NOT NULL,
    old_value JSON,
    new_value JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_history_task (task_id),
    INDEX idx_history_user (user_id),
    INDEX idx_history_action (action),
    INDEX idx_history_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better query performance
CREATE INDEX idx_tasks_composite_status_due ON project_tasks(status, due_date);
CREATE INDEX idx_tasks_composite_project_status ON project_tasks(project_id, status);
CREATE INDEX idx_tasks_composite_assigned_status ON project_tasks(assigned_to, status);

-- Views for common queries
CREATE OR REPLACE VIEW v_overdue_tasks AS
SELECT 
    t.*,
    p.name as project_name,
    p.code as project_code,
    u.full_name as assigned_to_name,
    u.email as assigned_to_email,
    DATEDIFF(CURDATE(), t.due_date) as days_overdue
FROM project_tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN users u ON t.assigned_to = u.id
WHERE t.status IN ('pending', 'in_progress')
AND t.due_date < CURDATE();

CREATE OR REPLACE VIEW v_upcoming_tasks AS
SELECT 
    t.*,
    p.name as project_name,
    p.code as project_code,
    u.full_name as assigned_to_name,
    u.email as assigned_to_email,
    DATEDIFF(t.due_date, CURDATE()) as days_until_due
FROM project_tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN users u ON t.assigned_to = u.id
WHERE t.status IN ('pending', 'in_progress')
AND t.due_date >= CURDATE()
AND t.due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
ORDER BY t.due_date ASC;

CREATE OR REPLACE VIEW v_task_summary AS
SELECT 
    project_id,
    COUNT(*) as total_tasks,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
    SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_tasks,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_tasks
FROM project_tasks
GROUP BY project_id;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Project Tasks Management schema created successfully!' as Message;
SELECT COUNT(*) as 'Sample Tasks Inserted' FROM project_tasks;
