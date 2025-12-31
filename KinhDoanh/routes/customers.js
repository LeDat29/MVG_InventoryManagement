/**
 * Customer Routes - KHO MVG
 * Quản lý hồ sơ khách hàng và hợp đồng
 * 
 * @description Routes cho phân hệ quản lý khách hàng:
 * - CRUD thông tin khách hàng
 * - Quản lý hợp đồng cho thuê kho
 * - Cảnh báo hợp đồng hết hạn
 * - Tạo hợp đồng tự động từ template
 */

const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { logger } = require('../config/logger');
const { logUserActivity } = require('../utils/activityLogger');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { requireRole, requirePermission, authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const pool = mysqlPool();
        const [customers] = await pool.execute('SELECT * FROM customers ORDER BY id DESC LIMIT 20');

        const result = {
            success: true,
            data: {
                customers,
                pagination: { page: 1, limit: 20, total: customers.length, pages: 1 }
            }
        };

        res.json(result);
    } catch (error) {
        logger.error('Customer API Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/:id(\\d+)', authenticateToken, [
    param('id').isInt().withMessage('ID khách hàng phải là số nguyên')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const customerId = req.params.id;
    const pool = mysqlPool();

    const [customers] = await pool.execute(`
        SELECT c.id, c.customer_code, c.name, c.full_name,
               c.representative_name, c.representative_phone, c.phone, c.email, c.address,
               c.tax_code, c.id_number, c.representative_email,
               c.warehouse_purpose, c.notes,
               c.customer_type, c.status,
               c.created_at, c.updated_at, c.created_by,
               u.username as created_by_username
        FROM customers c
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.id = ?
    `, [customerId]);

    if (customers.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Khách hàng không tìm thấy'
        });
    }

    const customer = customers[0];
    if (customer.bank_info) {
        try {
            customer.bank_info = JSON.parse(customer.bank_info);
        } catch (err) {
            customer.bank_info = null;
        }
    } else {
        customer.bank_info = null;
    }

    let companies = [];
    try {
        const dbName = process.env.MYSQL_DATABASE || 'kho_mvg';
        const [companiesTable] = await pool.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'customer_companies'
        `, [dbName]);
        
        if (companiesTable.length > 0) {
            const [companyList] = await pool.execute(`
                SELECT id, tax_code, company_name, invoice_address, warehouse_purpose, is_primary
                FROM customer_companies
                WHERE customer_id = ?
                ORDER BY is_primary DESC, id ASC
            `, [customerId]);
            companies = companyList;
        }
    } catch (err) {
        logger.error('Error fetching customer companies:', err);
    }

    // Lấy danh sách hợp đồng
    const [contracts] = await pool.execute(`
        SELECT ct.*, 
               p.name as project_name, p.code as project_code,
               wz.zone_code, wz.zone_name, wz.area as zone_area
        FROM contracts ct
        LEFT JOIN projects p ON ct.project_id = p.id
        LEFT JOIN warehouse_zones wz ON ct.zone_id = wz.id
        WHERE ct.customer_id = ?
        ORDER BY ct.created_at DESC
    `, [customerId]);

    const [stats] = await pool.execute(`
        SELECT 
            COUNT(*) as total_contracts,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_contracts,
            COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_contracts,
            SUM(CASE WHEN status = 'active' THEN total_value ELSE 0 END) as total_monthly_payment,
            MIN(start_date) as first_contract_date,
            MAX(end_date) as latest_end_date
        FROM contracts
        WHERE customer_id = ?
    `, [customerId]);

    const [expiring] = await pool.execute(`
        SELECT ct.*, p.name as project_name, wz.zone_code,
               DATEDIFF(ct.end_date, CURDATE()) as days_until_expiry
        FROM contracts ct
        LEFT JOIN projects p ON ct.project_id = p.id
        LEFT JOIN warehouse_zones wz ON ct.zone_id = wz.id
        WHERE ct.customer_id = ? AND ct.status = 'active' 
        AND ct.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        ORDER BY ct.end_date ASC
    `, [customerId]);

    // Log user activity (non-blocking)
    if (req.user && req.user.id) {
        try {
            await logUserActivity(req.user.id, 'VIEW_CUSTOMER_DETAIL', 'customer', customerId, req.ip, req.get('User-Agent'));
        } catch (logError) {
            logger.error('Error logging user activity:', logError);
            // Don't fail the request if logging fails
        }
    }

    res.json({
        success: true,
        data: {
            customer,
            companies,
            contracts,
            statistics: stats[0] || {
                total_contracts: 0,
                active_contracts: 0,
                expired_contracts: 0,
                total_monthly_payment: 0,
                first_contract_date: null,
                latest_end_date: null
            },
            expiring_contracts: expiring || []
        }
    });
}));

router.post('/', requirePermission('customer_create'), [
    body('name').trim().notEmpty().withMessage('Tên khách hàng là bắt buộc'),
    body('representative_name').trim().notEmpty().withMessage('Người đại diện là bắt buộc'),
    body('phone').trim().notEmpty().withMessage('Số điện thoại là bắt buộc')
        .matches(/^[0-9+\-\s()]+$/).withMessage('Số điện thoại không hợp lệ'),
    body('email').optional().isEmail().withMessage('Email không hợp lệ'),
    body('customer_type').optional().isIn(['individual', 'company']).withMessage('Loại khách hàng không hợp lệ')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const {
        name,
        full_name,
        representative_name,
        email,
        phone,
        address,
        tax_code,
        representative_phone,
        representative_email,
        customer_type = 'company',
        notes,
        id_number,
        warehouse_purpose,
        companies = []
    } = req.body;

    const pool = mysqlPool();

    const currentYear = new Date().getFullYear();
    const [customerCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM customers WHERE YEAR(created_at) = ?',
        [currentYear]
    );
    
    const customer_code = `CUST${currentYear}${String(customerCount[0].count + 1).padStart(4, '0')}`;

    const checkColumnExists = async (columnName) => {
        try {
            const dbName = process.env.MYSQL_DATABASE || 'kho_mvg';
            const [columns] = await pool.execute(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = ? 
                AND TABLE_NAME = 'customers' 
                AND COLUMN_NAME = ?
            `, [dbName, columnName]);
            return columns.length > 0;
        } catch (err) {
            logger.error(`Error checking column ${columnName}:`, err);
            return false;
        }
    };

    const hasCustomerCodeColumn = await checkColumnExists('customer_code');
    const hasFullNameColumn = await checkColumnExists('full_name');
    const hasRepresentativePhoneColumn = await checkColumnExists('representative_phone');
    const hasRepresentativeEmailColumn = await checkColumnExists('representative_email');
    const hasIdNumberColumn = await checkColumnExists('id_number');
    const hasWarehousePurposeColumn = await checkColumnExists('warehouse_purpose');
    const hasNotesColumn = await checkColumnExists('notes');
    const hasCreatedByColumn = await checkColumnExists('created_by');

    const insertFields = hasCustomerCodeColumn 
        ? ['customer_code', 'name', 'customer_type', 'representative_name', 'phone']
        : ['name', 'customer_type', 'representative_name', 'phone'];
    
    const insertValues = hasCustomerCodeColumn
        ? [customer_code, name, customer_type, representative_name || full_name || name, phone]
        : [name, customer_type, representative_name || full_name || name, phone];

    if (email) {
        insertFields.push('email');
        insertValues.push(email);
    }

    if (address) {
        insertFields.push('address');
        insertValues.push(address);
    }

    if (tax_code) {
        insertFields.push('tax_code');
        insertValues.push(tax_code);
    }

    if (full_name && hasFullNameColumn) {
        insertFields.push('full_name');
        insertValues.push(full_name);
    }

    if (representative_phone && hasRepresentativePhoneColumn) {
        insertFields.push('representative_phone');
        insertValues.push(representative_phone);
    }

    if (representative_email && hasRepresentativeEmailColumn) {
        insertFields.push('representative_email');
        insertValues.push(representative_email);
    }

    if (id_number && hasIdNumberColumn) {
        insertFields.push('id_number');
        insertValues.push(id_number);
    }

    if (warehouse_purpose && hasWarehousePurposeColumn) {
        insertFields.push('warehouse_purpose');
        insertValues.push(warehouse_purpose);
    }

    if (notes && hasNotesColumn) {
        insertFields.push('notes');
        insertValues.push(notes);
    }

    if (req.user && req.user.id && hasCreatedByColumn) {
        insertFields.push('created_by');
        insertValues.push(req.user.id);
    }

    const placeholders = insertFields.map(() => '?').join(', ');
    const insertQuery = `INSERT INTO customers (${insertFields.join(', ')}) VALUES (${placeholders})`;
    
    try {
        await pool.query('START TRANSACTION');
        const [result] = await pool.execute(insertQuery, insertValues);
        const customerId = result.insertId;

        if (Array.isArray(companies) && companies.length > 0) {
            const checkTableExists = async () => {
                try {
                    const dbName = process.env.MYSQL_DATABASE || 'kho_mvg';
                    const [tables] = await pool.execute(`
                        SELECT TABLE_NAME 
                        FROM INFORMATION_SCHEMA.TABLES 
                        WHERE TABLE_SCHEMA = ? 
                        AND TABLE_NAME = 'customer_companies'
                    `, [dbName]);
                    return tables.length > 0;
                } catch (err) {
                    logger.error('Error checking customer_companies table:', err);
                    return false;
                }
            };

            const hasCompaniesTable = await checkTableExists();
            
            if (hasCompaniesTable) {
                for (let i = 0; i < companies.length; i++) {
                    const company = companies[i];
                    if (company.tax_code && company.company_name && company.invoice_address) {
                        try {
                            await pool.execute(`
                                INSERT INTO customer_companies 
                                (customer_id, tax_code, company_name, invoice_address, warehouse_purpose, is_primary)
                                VALUES (?, ?, ?, ?, ?, ?)
                            `, [
                                customerId,
                                company.tax_code,
                                company.company_name,
                                company.invoice_address,
                                company.warehouse_purpose || null,
                                i === 0 || company.is_primary || false
                            ]);
                        } catch (companyErr) {
                            logger.error(`Error saving company ${i + 1}:`, companyErr);
                            throw companyErr;
                        }
                    }
                }
            }
        }

        await pool.query('COMMIT');

        await logUserActivity(
            req.user && req.user.id ? req.user.id : null,
            'CREATE_CUSTOMER',
            'customer',
            customerId,
            req.ip,
            req.get('User-Agent'),
            { companyName: name }
        );

        res.status(201).json({
            success: true,
            message: 'Tạo khách hàng thành công',
            data: {
                id: customerId,
                name
            }
        });
    } catch (error) {
        try {
            await pool.query('ROLLBACK');
        } catch (rollbackErr) {
            logger.error('Error during rollback:', rollbackErr);
        }
        
        logger.error('Error creating customer:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi tạo khách hàng', 
            error: error.message,
            details: {
                code: error.code,
                sqlState: error.sqlState,
                sqlMessage: error.sqlMessage,
                errno: error.errno
            }
        });
    }
}));

router.get('/:id(\\d+)/contracts', catchAsync(async (req, res) => {
    const customerId = req.params.id;
    const status = req.query.status;

    let query = `
        SELECT ct.*, 
               p.name as project_name, p.code as project_code, p.address as project_address,
               wz.zone_code, wz.zone_name, wz.area as zone_area,
               DATEDIFF(ct.end_date, CURDATE()) as days_until_expiry
        FROM contracts ct
        LEFT JOIN projects p ON ct.project_id = p.id
        LEFT JOIN warehouse_zones wz ON ct.zone_id = wz.id
        WHERE ct.customer_id = ?
    `;
    const params = [customerId];

    if (status) {
        query += ' AND ct.status = ?';
        params.push(status);
    }

    query += ' ORDER BY ct.created_at DESC';

    const pool = mysqlPool();
    const [contracts] = await pool.execute(query, params);

    res.json({
        success: true,
        data: { contracts }
    });
}));

router.post('/contracts', requirePermission('contract_create'), [
    body('customer_id').isInt().withMessage('Customer ID phải là số nguyên'),
    body('project_id').isInt().withMessage('Project ID phải là số nguyên'),
    body('zone_id').isInt().withMessage('Zone ID phải là số nguyên'),
    body('start_date').isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
    body('end_date').isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
    body('total_value').isFloat({ min: 0 }).withMessage('Giá trị hợp đồng phải là số dương')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const {
        customer_id, project_id, zone_id, contract_type = 'new',
        start_date, end_date, total_value, deposit_amount,
        payment_cycle = 'monthly', payment_terms, contract_terms,
        auto_renewal = false
    } = req.body;

    const pool = mysqlPool();

    const [zones] = await pool.execute(
        'SELECT zone_code, status FROM warehouse_zones WHERE id = ? AND project_id = ?',
        [zone_id, project_id]
    );

    if (zones.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Zone không tìm thấy'
        });
    }

    if (zones[0].status !== 'available' && zones[0].status !== 'deposited') {
        return res.status(400).json({
            success: false,
            message: `Zone đang ở trạng thái ${zones[0].status}, không thể tạo hợp đồng`
        });
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (endDateObj <= startDateObj) {
        return res.status(400).json({
            success: false,
            message: 'Ngày kết thúc phải sau ngày bắt đầu'
        });
    }
    
    if (startDateObj < today) {
        return res.status(400).json({
            success: false,
            message: 'Ngày bắt đầu không được ở quá khứ'
        });
    }
    
    const maxYears = 50;
    const maxDate = new Date(startDateObj);
    maxDate.setFullYear(maxDate.getFullYear() + maxYears);
    
    if (endDateObj > maxDate) {
        return res.status(400).json({
            success: false,
            message: `Thời hạn hợp đồng không được vượt quá ${maxYears} năm`
        });
    }

    const currentYear = new Date().getFullYear();
    const [lastContract] = await pool.execute(
        'SELECT contract_number FROM contracts WHERE contract_number LIKE ? ORDER BY id DESC LIMIT 1',
        [`HD${currentYear}%`]
    );

    let contractNumber;
    if (lastContract.length > 0) {
        const lastNumber = parseInt(lastContract[0].contract_number.slice(-4));
        contractNumber = `HD${currentYear}${String(lastNumber + 1).padStart(4, '0')}`;
    } else {
        contractNumber = `HD${currentYear}0001`;
    }

    await pool.query('START TRANSACTION');

    try {
        const [result] = await pool.execute(`
            INSERT INTO contracts (
                contract_number, customer_id, project_id, zone_id, contract_type,
                start_date, end_date, total_value, deposit_amount, payment_cycle,
                payment_terms, contract_terms, auto_renewal, status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,'draft', ?)
        `, [
            contractNumber, customer_id, project_id, zone_id, contract_type,
            start_date, end_date, total_value, deposit_amount, payment_cycle,
            payment_terms, contract_terms, auto_renewal, req.user.id
        ]);

        if (zones[0].status === 'available') {
            await pool.execute(
                'UPDATE warehouse_zones SET status = "deposited" WHERE id = ?',
                [zone_id]
            );
        }

        await pool.query('COMMIT');

        await logUserActivity(
            req.user.id,
            'CREATE_CONTRACT',
            'contract',
            result.insertId,
            req.ip,
            req.get('User-Agent'),
            { 
                contractNumber, 
                customerId: customer_id, 
                projectId: project_id, 
                zoneId: zone_id,
                rentalPrice: total_value
            }
        );

        res.status(201).json({
            success: true,
            message: 'Tạo hợp đồng thành công',
            data: {
                id: result.insertId,
                contract_number: contractNumber,
                status: 'draft'
            }
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
    }
}));

router.get('/contracts/expiring', catchAsync(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    
    const pool = mysqlPool();
    const [contracts] = await pool.execute(`
        SELECT ct.*, 
               c.customer_code, c.name, c.representative_name, c.phone,
               p.name as project_name, p.code as project_code,
               wz.zone_code, wz.zone_name,
               DATEDIFF(ct.end_date, CURDATE()) as days_until_expiry
        FROM contracts ct
        LEFT JOIN customers c ON ct.customer_id = c.id
        LEFT JOIN projects p ON ct.project_id = p.id
        LEFT JOIN warehouse_zones wz ON ct.zone_id = wz.id
        WHERE ct.status = 'active' 
        AND ct.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ORDER BY ct.end_date ASC
    `, [days]);

    await logUserActivity(req.user.id, 'VIEW_EXPIRING_CONTRACTS', 'contract', null, req.ip, req.get('User-Agent'));

    res.json({
        success: true,
        data: {
            contracts,
            warning_period_days: days,
            total_expiring: contracts.length
        }
    });
}));

router.put('/:id(\\d+)', requirePermission('customer_update'), [
    param('id').isInt().withMessage('ID khách hàng phải là số nguyên'),
    body('name').optional().trim().notEmpty().withMessage('Tên khách hàng không được để trống'),
    body('full_name').optional().trim().notEmpty().withMessage('Họ tên đầy đủ không được để trống'),
    body('representative_name').optional().trim(),
    body('phone').optional().trim().matches(/^[0-9+\-\s()]+$/).withMessage('Số điện thoại không hợp lệ'),
    body('email').optional().isEmail().withMessage('Email không hợp lệ'),
    body('id_number').optional().trim().isLength({ min: 5 }).withMessage('CMND/CCCD phải có ít nhất 5 ký tự'),
    body('customer_type').optional().isIn(['individual', 'company']).withMessage('Loại khách hàng không hợp lệ'),
    body('address').optional().trim(),
    body('tax_code').optional().trim(),
    body('representative_phone').optional().trim().matches(/^[0-9+\-\s()]*$/).withMessage('Số điện thoại không hợp lệ'),
    body('representative_email').optional().isEmail().withMessage('Email người đại diện không hợp lệ'),
    body('notes').optional().trim(),
    body('warehouse_purpose').optional().trim()
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const customerId = req.params.id;

    const pool = mysqlPool();

    const [existingCustomers] = await pool.execute(
        'SELECT id, customer_code, name FROM customers WHERE id = ?',
        [customerId]
    );

    if (existingCustomers.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Khách hàng không tìm thấy'
        });
    }

    const updateFields = [];
    const updateValues = [];

    const {
        name, full_name, representative_name, email, phone,
        address, tax_code, representative_phone, representative_email,
        customer_type, notes, id_number, warehouse_purpose,
        companies = []
    } = req.body;

    if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name);
    }
    if (full_name !== undefined) {
        updateFields.push('full_name = ?');
        updateValues.push(full_name);
    }
    if (representative_name !== undefined) {
        updateFields.push('representative_name = ?');
        updateValues.push(representative_name);
    }
    if (email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(email);
    }
    if (phone !== undefined) {
        updateFields.push('phone = ?');
        updateValues.push(phone);
    }
    if (address !== undefined) {
        updateFields.push('address = ?');
        updateValues.push(address);
    }
    if (tax_code !== undefined) {
        updateFields.push('tax_code = ?');
        updateValues.push(tax_code);
    }
    if (representative_phone !== undefined) {
        updateFields.push('representative_phone = ?');
        updateValues.push(representative_phone);
    }
    if (representative_email !== undefined) {
        updateFields.push('representative_email = ?');
        updateValues.push(representative_email);
    }
    if (customer_type !== undefined) {
        updateFields.push('customer_type = ?');
        updateValues.push(customer_type);
    }
    if (notes !== undefined) {
        updateFields.push('notes = ?');
        updateValues.push(notes);
    }
    if (id_number !== undefined) {
        updateFields.push('id_number = ?');
        updateValues.push(id_number);
    }
    if (warehouse_purpose !== undefined) {
        updateFields.push('warehouse_purpose = ?');
        updateValues.push(warehouse_purpose);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    await pool.query('START TRANSACTION');

    try {
        if (updateFields.length > 1) {
            const finalValues = [...updateValues, customerId];
            await pool.execute(`
                UPDATE customers SET
                    ${updateFields.join(', ')}
                WHERE id = ?
            `, finalValues);
        }

        if (Array.isArray(companies)) {
            const checkTableExists = async () => {
                try {
                    const dbName = process.env.MYSQL_DATABASE || 'kho_mvg';
                    const [tables] = await pool.execute(`
                        SELECT TABLE_NAME 
                        FROM INFORMATION_SCHEMA.TABLES 
                        WHERE TABLE_SCHEMA = ? 
                        AND TABLE_NAME = 'customer_companies'
                    `, [dbName]);
                    return tables.length > 0;
                } catch (err) {
                    return false;
                }
            };

            const hasCompaniesTable = await checkTableExists();
            
            if (hasCompaniesTable) {
                await pool.execute('DELETE FROM customer_companies WHERE customer_id = ?', [customerId]);
                
                for (let i = 0; i < companies.length; i++) {
                    const company = companies[i];
                    if (company.tax_code && company.company_name && company.invoice_address) {
                        await pool.execute(`
                            INSERT INTO customer_companies 
                            (customer_id, tax_code, company_name, invoice_address, warehouse_purpose, is_primary)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `, [
                            customerId,
                            company.tax_code,
                            company.company_name,
                            company.invoice_address,
                            company.warehouse_purpose || null,
                            i === 0 || company.is_primary || false
                        ]);
                    }
                }
            }
        }

        await pool.query('COMMIT');

        await logUserActivity(
            req.user.id,
            'UPDATE_CUSTOMER',
            'customer',
            customerId,
            req.ip,
            req.get('User-Agent'),
            { customerCode: existingCustomers[0].customer_code }
        );

        res.json({
            success: true,
            message: 'Cập nhật thông tin khách hàng thành công'
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
    }
}));

router.delete('/:id(\\d+)', requirePermission('customer_delete'), [
    param('id').isInt().withMessage('ID khách hàng phải là số nguyên')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const customerId = req.params.id;
    const pool = mysqlPool();

    const [customers] = await pool.execute(
        'SELECT id, customer_code, name FROM customers WHERE id = ?',
        [customerId]
    );

    if (customers.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Khách hàng không tìm thấy'
        });
    }

    const [activeContracts] = await pool.execute(
        'SELECT COUNT(*) as count FROM contracts WHERE customer_id = ? AND status = "active"',
        [customerId]
    );

    if (activeContracts[0].count > 0) {
        return res.status(400).json({
            success: false,
            message: `Không thể xóa khách hàng vì còn ${activeContracts[0].count} hợp đồng đang hoạt động`
        });
    }

    await pool.execute(
        'UPDATE customers SET status = "inactive", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [customerId]
    );

    await logUserActivity(
        req.user.id,
        'DELETE_CUSTOMER',
        'customer',
        customerId,
        req.ip,
        req.get('User-Agent'),
        { 
            customerCode: customers[0].customer_code,
            companyName: customers[0].name 
        }
    );

    res.json({
        success: true,
        message: 'Xóa khách hàng thành công'
    });
}));

router.get('/stats', catchAsync(async (req, res) => {
    const pool = mysqlPool();
    
    const [stats] = await pool.execute(`
        SELECT 
            COUNT(*) as total_customers,
            COUNT(CASE WHEN customer_type = 'company' THEN 1 END) as company_customers,
            COUNT(CASE WHEN customer_type = 'individual' THEN 1 END) as individual_customers,
            COUNT(CASE WHEN credit_rating = 'A' THEN 1 END) as rating_a,
            COUNT(CASE WHEN credit_rating = 'B' THEN 1 END) as rating_b,
            COUNT(CASE WHEN credit_rating = 'C' THEN 1 END) as rating_c,
            COUNT(CASE WHEN credit_rating = 'D' THEN 1 END) as rating_d
        FROM customers 
        WHERE status != 'inactive'
    `);

    const [revenueStats] = await pool.execute(`
        SELECT 
            SUM(CASE WHEN ct.status = 'active' THEN ct.total_value ELSE 0 END) as total_monthly_revenue,
            COUNT(DISTINCT CASE WHEN ct.status = 'active' THEN c.id END) as customers_with_active_contracts,
            AVG(CASE WHEN ct.status = 'active' THEN ct.total_value END) as avg_contract_value
        FROM customers c
        LEFT JOIN contracts ct ON c.id = ct.customer_id
        WHERE c.status != 'inactive'
    `);

    const [monthlyGrowth] = await pool.execute(`
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as new_customers
        FROM customers 
        WHERE status != 'inactive' AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month
    `);

    res.json({
        success: true,
        data: {
            overview: stats[0],
            revenue: revenueStats[0],
            monthly_growth: monthlyGrowth
        }
    });
}));

module.exports = router;