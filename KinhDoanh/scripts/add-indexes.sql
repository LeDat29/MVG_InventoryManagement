-- Database Indexes Migration Script - KHO MVG
-- Thêm indexes để tối ưu hiệu suất truy vấn
-- Run this script after initial database setup

USE kho_mvg;

-- ============================================
-- USERS TABLE INDEXES
-- ============================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login);

-- ============================================
-- CUSTOMERS TABLE INDEXES
-- ============================================
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_created_at ON customers(created_at);
CREATE INDEX idx_customers_created_by ON customers(created_by);

-- ============================================
-- PROJECTS TABLE INDEXES
-- ============================================
CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_code ON projects(code);
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_manager_id ON projects(manager_id);

-- Composite index for common queries
CREATE INDEX idx_projects_customer_status ON projects(customer_id, status);
CREATE INDEX idx_projects_status_created ON projects(status, created_at);

-- ============================================
-- CONTRACTS TABLE INDEXES
-- ============================================
CREATE INDEX idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX idx_contracts_project_id ON contracts(project_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_start_date ON contracts(start_date);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);
CREATE INDEX idx_contracts_created_at ON contracts(created_at);

-- Composite indexes for aggregation queries
CREATE INDEX idx_contracts_customer_status ON contracts(customer_id, status);
CREATE INDEX idx_contracts_project_status ON contracts(project_id, status);
CREATE INDEX idx_contracts_dates ON contracts(start_date, end_date, status);

-- ============================================
-- WAREHOUSE_ZONES TABLE INDEXES
-- ============================================
CREATE INDEX idx_zones_project_id ON warehouse_zones(project_id);
CREATE INDEX idx_zones_status ON warehouse_zones(status);
CREATE INDEX idx_zones_zone_type ON warehouse_zones(zone_type);
CREATE INDEX idx_zones_created_at ON warehouse_zones(created_at);

-- Composite index
CREATE INDEX idx_zones_project_status ON warehouse_zones(project_id, status);

-- ============================================
-- USER_PROJECT_PERMISSIONS TABLE INDEXES
-- ============================================
CREATE INDEX idx_upp_user_id ON user_project_permissions(user_id);
CREATE INDEX idx_upp_project_id ON user_project_permissions(project_id);
CREATE INDEX idx_upp_created_at ON user_project_permissions(created_at);

-- Composite index for permission checks
CREATE INDEX idx_upp_user_project ON user_project_permissions(user_id, project_id);

-- ============================================
-- USER_AI_CONFIGS TABLE INDEXES
-- ============================================
CREATE INDEX idx_ai_configs_user_id ON user_ai_configs(user_id);
CREATE INDEX idx_ai_configs_provider ON user_ai_configs(provider);
CREATE INDEX idx_ai_configs_is_active ON user_ai_configs(is_active);
CREATE INDEX idx_ai_configs_priority ON user_ai_configs(priority);

-- Composite index for optimal AI config selection
CREATE INDEX idx_ai_configs_user_active_cost ON user_ai_configs(user_id, is_active, cost_per_1k_tokens, priority);

-- ============================================
-- AI_CHAT_SESSIONS TABLE INDEXES
-- ============================================
CREATE INDEX idx_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_status ON ai_chat_sessions(status);
CREATE INDEX idx_chat_sessions_started_at ON ai_chat_sessions(started_at);
CREATE INDEX idx_chat_sessions_ai_provider ON ai_chat_sessions(ai_provider);

-- Composite index
CREATE INDEX idx_chat_sessions_user_status ON ai_chat_sessions(user_id, status);

-- ============================================
-- AI_CHAT_MESSAGES TABLE INDEXES
-- ============================================
CREATE INDEX idx_chat_messages_session_id ON ai_chat_messages(session_id);
CREATE INDEX idx_chat_messages_role ON ai_chat_messages(role);
CREATE INDEX idx_chat_messages_created_at ON ai_chat_messages(created_at);
CREATE INDEX idx_chat_messages_is_function_call ON ai_chat_messages(is_function_call);

-- Composite index for conversation history
CREATE INDEX idx_chat_messages_session_created ON ai_chat_messages(session_id, created_at);

-- ============================================
-- AI_QUERY_CACHE TABLE INDEXES
-- ============================================
CREATE INDEX idx_query_cache_hash ON ai_query_cache(question_hash);
CREATE INDEX idx_query_cache_satisfaction ON ai_query_cache(satisfaction_score);
CREATE INDEX idx_query_cache_usage ON ai_query_cache(usage_count);
CREATE INDEX idx_query_cache_last_used ON ai_query_cache(last_used_at);

-- Composite index for cache lookup
CREATE INDEX idx_query_cache_hash_satisfaction ON ai_query_cache(question_hash, satisfaction_score);
CREATE INDEX idx_query_cache_usage_satisfaction ON ai_query_cache(usage_count, satisfaction_score);

-- ============================================
-- USER_LOGS TABLE INDEXES
-- ============================================
CREATE INDEX idx_user_logs_user_id ON user_logs(user_id);
CREATE INDEX idx_user_logs_action ON user_logs(action);
CREATE INDEX idx_user_logs_resource_type ON user_logs(resource_type);
CREATE INDEX idx_user_logs_resource_id ON user_logs(resource_id);
CREATE INDEX idx_user_logs_created_at ON user_logs(created_at);
CREATE INDEX idx_user_logs_is_ai_assisted ON user_logs(is_ai_assisted);
CREATE INDEX idx_user_logs_ai_session_id ON user_logs(ai_session_id);

-- Composite indexes for common log queries
CREATE INDEX idx_user_logs_user_created ON user_logs(user_id, created_at);
CREATE INDEX idx_user_logs_action_created ON user_logs(action, created_at);
CREATE INDEX idx_user_logs_ai_assisted_created ON user_logs(is_ai_assisted, created_at);

-- ============================================
-- DATABASE_SCHEMA_DOCS TABLE INDEXES
-- ============================================
CREATE INDEX idx_schema_docs_table_name ON database_schema_docs(table_name);
CREATE INDEX idx_schema_docs_is_active ON database_schema_docs(is_active);

-- ============================================
-- AI_FUNCTION_DEFINITIONS TABLE INDEXES
-- ============================================
CREATE INDEX idx_ai_functions_name ON ai_function_definitions(function_name);
CREATE INDEX idx_ai_functions_is_active ON ai_function_definitions(is_active);
CREATE INDEX idx_ai_functions_usage_count ON ai_function_definitions(usage_count);

-- ============================================
-- DOCUMENTS TABLE INDEXES (if exists)
-- ============================================
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_customer_id ON documents(customer_id);
CREATE INDEX idx_documents_category_id ON documents(category_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_created_at ON documents(created_at);

-- Composite index
CREATE INDEX idx_documents_project_category ON documents(project_id, category_id);

-- ============================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================
-- For better text search performance on large text fields
ALTER TABLE projects ADD FULLTEXT INDEX ft_projects_name_description(name, description);
ALTER TABLE customers ADD FULLTEXT INDEX ft_customers_name(name);
ALTER TABLE contracts ADD FULLTEXT INDEX ft_contracts_description(description);

-- ============================================
-- VERIFY INDEXES
-- ============================================
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS,
    INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'kho_mvg'
    AND INDEX_NAME != 'PRIMARY'
GROUP BY TABLE_NAME, INDEX_NAME, INDEX_TYPE
ORDER BY TABLE_NAME, INDEX_NAME;

-- ============================================
-- ANALYZE TABLES
-- ============================================
-- Update statistics for better query optimization
ANALYZE TABLE users;
ANALYZE TABLE customers;
ANALYZE TABLE projects;
ANALYZE TABLE contracts;
ANALYZE TABLE warehouse_zones;
ANALYZE TABLE user_project_permissions;
ANALYZE TABLE user_ai_configs;
ANALYZE TABLE ai_chat_sessions;
ANALYZE TABLE ai_chat_messages;
ANALYZE TABLE ai_query_cache;
ANALYZE TABLE user_logs;

PRINT 'Database indexes created successfully!';
