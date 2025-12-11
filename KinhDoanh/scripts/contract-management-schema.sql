-- Contract Management System Schema
-- Hệ thống quản lý hợp đồng thuê kho xưởng chuyên nghiệp

-- 1. Contract Templates (Mẫu hợp đồng)
CREATE TABLE IF NOT EXISTS contract_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_name VARCHAR(255) NOT NULL,
    template_code VARCHAR(50) UNIQUE NOT NULL,
    template_type ENUM('warehouse_rental', 'service_agreement', 'amendment') DEFAULT 'warehouse_rental',
    template_content LONGTEXT NOT NULL, -- HTML content with placeholders
    variables JSON, -- JSON array of variable definitions
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Document Categories (Danh mục hồ sơ)
CREATE TABLE IF NOT EXISTS document_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(255) NOT NULL,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_id INT NULL, -- For hierarchical categories
    sort_order INT DEFAULT 0,
    is_required BOOLEAN DEFAULT FALSE, -- Required document for contract
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES document_categories(id) ON DELETE SET NULL
);

-- 3. Contracts (Hợp đồng chính)
CREATE TABLE IF NOT EXISTS contracts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    contract_title VARCHAR(500) NOT NULL,
    customer_id INT NOT NULL,
    customer_company_id INT, -- Link to specific company of customer
    template_id INT NOT NULL,
    
    -- Contract parties
    party_a_name VARCHAR(255) NOT NULL, -- Bên cho thuê (Lessor)
    party_a_address TEXT,
    party_a_representative VARCHAR(255),
    party_a_position VARCHAR(100),
    party_a_id_number VARCHAR(50),
    
    party_b_name VARCHAR(255) NOT NULL, -- Bên thuê (Lessee) 
    party_b_address TEXT,
    party_b_representative VARCHAR(255),
    party_b_position VARCHAR(100),
    party_b_id_number VARCHAR(50),
    party_b_tax_code VARCHAR(20),
    
    -- Contract terms
    warehouse_location TEXT NOT NULL,
    warehouse_area DECIMAL(10,2) NOT NULL, -- m²
    rental_price DECIMAL(15,2) NOT NULL, -- Monthly rent
    deposit_amount DECIMAL(15,2) DEFAULT 0,
    service_fee DECIMAL(15,2) DEFAULT 0,
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    auto_renewal BOOLEAN DEFAULT FALSE,
    renewal_period INT DEFAULT 12, -- months
    
    -- Payment terms
    payment_cycle ENUM('monthly', 'quarterly', 'yearly') DEFAULT 'monthly',
    payment_due_date INT DEFAULT 5, -- Day of month/quarter/year
    payment_method VARCHAR(100),
    late_fee_percentage DECIMAL(5,2) DEFAULT 2.0,
    
    -- Contract status and workflow
    status ENUM('draft', 'review', 'approved', 'signed', 'active', 'expired', 'terminated', 'cancelled') DEFAULT 'draft',
    workflow_stage ENUM('preparation', 'legal_review', 'approval', 'signing', 'execution') DEFAULT 'preparation',
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    
    -- Additional terms
    special_terms LONGTEXT, -- Điều khoản đặc biệt
    notes LONGTEXT,
    
    -- Tracking
    created_by INT,
    assigned_to INT, -- Người phụ trách
    approved_by INT,
    signed_date TIMESTAMP NULL,
    activated_date TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    
    FOREIGN KEY (template_id) REFERENCES contract_templates(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_contract_number (contract_number),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date)
);

-- 4. Contract Documents (Tài liệu hợp đồng)
CREATE TABLE IF NOT EXISTS contract_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contract_id INT NOT NULL,
    category_id INT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type ENUM('contract', 'appendix', 'exhibit', 'amendment') DEFAULT 'contract',
    file_name VARCHAR(500),
    file_path VARCHAR(1000),
    file_size BIGINT DEFAULT 0,
    mime_type VARCHAR(100),
    
    -- Version control
    version VARCHAR(20) DEFAULT '1.0',
    is_latest BOOLEAN DEFAULT TRUE,
    parent_document_id INT NULL, -- For versioning
    
    -- Document content
    content LONGTEXT, -- Generated content from template
    variables JSON, -- Values used to fill template
    
    -- Digital signature
    signature_required BOOLEAN DEFAULT FALSE,
    signature_status ENUM('pending', 'signed', 'rejected') DEFAULT 'pending',
    signed_by JSON, -- Array of signers with timestamps
    signature_hash VARCHAR(500), -- For integrity verification
    
    -- Status
    status ENUM('draft', 'review', 'approved', 'final') DEFAULT 'draft',
    is_locked BOOLEAN DEFAULT FALSE, -- Lock from editing
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES document_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (parent_document_id) REFERENCES contract_documents(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_contract (contract_id),
    INDEX idx_category (category_id),
    INDEX idx_version (contract_id, version),
    INDEX idx_latest (contract_id, is_latest)
);

-- 5. Contract Workflow History (Lịch sử luồng xử lý)
CREATE TABLE IF NOT EXISTS contract_workflow_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contract_id INT NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    from_stage VARCHAR(50),
    to_stage VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL, -- submit, approve, reject, sign, etc.
    comment TEXT,
    
    -- Attachments for this action
    attachments JSON, -- Array of file paths
    
    performed_by INT NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_contract (contract_id),
    INDEX idx_performed_by (performed_by),
    INDEX idx_date (performed_at)
);

-- 6. Contract Reviews & Comments (Đánh giá và nhận xét)
CREATE TABLE IF NOT EXISTS contract_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contract_id INT NOT NULL,
    document_id INT, -- Optional: specific document review
    reviewer_id INT NOT NULL,
    review_type ENUM('legal', 'financial', 'operational', 'management') NOT NULL,
    
    status ENUM('pending', 'in_progress', 'completed', 'approved', 'rejected') DEFAULT 'pending',
    priority ENUM('low', 'normal', 'high', 'critical') DEFAULT 'normal',
    
    comments LONGTEXT,
    issues_found JSON, -- Array of issues with severity
    recommendations TEXT,
    
    due_date DATE,
    completed_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES contract_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 7. Contract Variables/Placeholders (Biến động hợp đồng)
CREATE TABLE IF NOT EXISTS contract_variables (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contract_id INT NOT NULL,
    variable_name VARCHAR(100) NOT NULL,
    variable_value TEXT,
    variable_type ENUM('text', 'number', 'date', 'currency', 'boolean') DEFAULT 'text',
    is_system BOOLEAN DEFAULT FALSE, -- System-generated vs user-input
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    UNIQUE KEY unique_contract_variable (contract_id, variable_name)
);

-- Insert default document categories
INSERT INTO document_categories (category_name, category_code, description, is_required, sort_order) VALUES
('Hợp đồng thuê kho', 'CONTRACT_MAIN', 'Hợp đồng chính thuê kho xưởng', TRUE, 1),
('Phụ lục hợp đồng', 'CONTRACT_APPENDIX', 'Các phụ lục đi kèm hợp đồng', FALSE, 2),
('Biên bản bàn giao', 'HANDOVER_RECORD', 'Biên bản bàn giao kho', TRUE, 3),
('Hồ sơ pháp lý', 'LEGAL_DOCS', 'Giấy tờ pháp lý của bên thuê', TRUE, 4),
('Tài liệu kỹ thuật', 'TECHNICAL_DOCS', 'Bản vẽ, sơ đồ kho', FALSE, 5),
('Bảo hiểm', 'INSURANCE', 'Hợp đồng bảo hiểm kho', FALSE, 6),
('Biên bản sửa đổi', 'AMENDMENT', 'Các biên bản sửa đổi, bổ sung', FALSE, 7);

-- Insert default contract template
INSERT INTO contract_templates (template_name, template_code, template_content, variables) VALUES 
('Mẫu hợp đồng thuê kho tiêu chuẩn', 'STANDARD_WAREHOUSE_RENTAL', 
'<h1>HỢP ĐỒNG THUÊ KHO</h1><p>Số: {{contract_number}}</p>...', 
'[{"name": "contract_number", "type": "text", "required": true}, {"name": "party_a_name", "type": "text", "required": true}]'
);