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
const { requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       required:
 *         - customer_code
 *         - contact_person
 *         - phone
 *       properties:
 *         id:
 *           type: integer
 *         customer_code:
 *           type: string
 *           description: Mã khách hàng (unique)
 *         company_name:
 *           type: string
 *           description: Tên công ty
 *         contact_person:
 *           type: string
 *           description: Người liên hệ
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *           description: Số điện thoại
 *         address:
 *           type: string
 *           description: Địa chỉ
 *         tax_code:
 *           type: string
 *           description: Mã số thuế
 *         business_license:
 *           type: string
 *           description: Số giấy phép kinh doanh
 *         bank_info:
 *           type: object
 *           description: Thông tin ngân hàng
 *         customer_type:
 *           type: string
 *           enum: [individual, company]
 *         credit_rating:
 *           type: string
 *           enum: [A, B, C, D]
 *     
 *     Contract:
 *       type: object
 *       required:
 *         - customer_id
 *         - project_id
 *         - zone_id
 *         - start_date
 *         - end_date
 *         - rental_price
 *       properties:
 *         id:
 *           type: integer
 *         contract_number:
 *           type: string
 *           description: Số hợp đồng (auto-generated)
 *         customer_id:
 *           type: integer
 *         project_id:
 *           type: integer
 *         zone_id:
 *           type: integer
 *         contract_type:
 *           type: string
 *           enum: [new, renewal, amendment]
 *         start_date:
 *           type: string
 *           format: date
 *         end_date:
 *           type: string
 *           format: date
 *         rental_price:
 *           type: number
 *           format: float
 *           description: Giá thuê (VNĐ/tháng)
 *         deposit_amount:
 *           type: number
 *           format: float
 *         payment_cycle:
 *           type: string
 *           enum: [monthly, quarterly, yearly]
 *         status:
 *           type: string
 *           enum: [draft, active, expired, terminated, renewed]
 */

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Lấy danh sách khách hàng
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: customer_type
 *         schema:
 *           type: string
 *           enum: [individual, company]
 *       - in: query
 *         name: credit_rating
 *         schema:
 *           type: string
 *           enum: [A, B, C, D]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           description: Tìm kiếm theo tên, mã KH, điện thoại
 *     responses:
 *       200:
 *         description: Danh sách khách hàng
 */
router.get('/', async (req, res) => {
    try {
        console.log('🔍 Customer API called - getting pool...');
        const pool = mysqlPool();
        console.log('📊 Pool obtained, testing connection...');
        
        // Test database connection and verify we're on correct database
        const [dbTest] = await pool.execute('SELECT DATABASE() as current_db');
        console.log(`🗄️ API Connected to database: ${dbTest[0].current_db}`);
        
        // Check if customers table exists
        const [tableCheck] = await pool.execute('SHOW TABLES LIKE "customers"');
        console.log(`📋 Customers table exists: ${tableCheck.length > 0 ? 'YES' : 'NO'}`);
        
        if (tableCheck.length > 0) {
            const [countCheck] = await pool.execute('SELECT COUNT(*) as customer_count FROM customers');
            console.log(`📊 Customer count in API database: ${countCheck[0].customer_count}`);
        } else {
            console.log('❌ PROBLEM: customers table does not exist in API database!');
        }
        
        // Test simple query first
        const [simpleTest] = await pool.execute('SELECT COUNT(*) as total FROM customers');
        console.log(`🧪 Simple count query: ${simpleTest[0].total} customers`);
        
        const [customers] = await pool.execute('SELECT * FROM customers ORDER BY id DESC LIMIT 20');
        console.log(`✅ Query executed successfully, found ${customers.length} customers`);
        
        if (customers.length > 0) {
            console.log(`📋 First customer: ${customers[0].name} (ID: ${customers[0].id})`);
        } else {
            console.log('⚠️ No customers found in query result');
        }
        
        const result = {
            success: true,
            data: {
                customers,
                pagination: { page: 1, limit: 20, total: customers.length, pages: 1 }
            }
        };
        
        console.log(`📤 Sending response with ${result.data.customers.length} customers`);
        res.json(result);
    } catch (error) {
        console.error('❌ Customer API Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Lấy chi tiết khách hàng
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết khách hàng và hợp đồng
 *       404:
 *         description: Khách hàng không tìm thấy
 */
router.get('/:id(\\d+)', [
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

    // Lấy thông tin khách hàng - explicitly include warehouse_purpose
    const [customers] = await pool.execute(`
        SELECT c.id, c.customer_code, c.name, c.full_name, c.company_name, 
               c.representative_name, c.phone, c.email, c.address, 
               c.tax_code, c.business_license, c.bank_info, 
               c.customer_type, c.credit_rating, c.status, 
               c.id_number, c.representative_phone, c.representative_email,
               c.warehouse_purpose, c.notes,
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
    customer.bank_info = customer.bank_info ? JSON.parse(customer.bank_info) : null;

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

    // Thống kê
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

    // Hợp đồng sắp hết hạn (trong 30 ngày)
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

    await logUserActivity(req.user.id, 'VIEW_CUSTOMER_DETAIL', 'customer', customerId, req.ip, req.get('User-Agent'));

    res.json({
        success: true,
        data: {
            customer,
            contracts,
            statistics: stats[0],
            expiring_contracts: expiring
        }
    });
}));

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Tạo khách hàng mới
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       201:
 *         description: Tạo khách hàng thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       409:
 *         description: Mã khách hàng đã tồn tại
 */
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
        name, full_name, representative_name, email, phone,
        address, tax_code, representative_phone, representative_email,
        customer_type = 'company', notes, id_number, warehouse_purpose
    } = req.body;

    const pool = mysqlPool();

    // Generate unique customer code
    const currentYear = new Date().getFullYear();
    const [customerCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM customers WHERE YEAR(created_at) = ?',
        [currentYear]
    );
    
    const customer_code = `CUST${currentYear}${String(customerCount[0].count + 1).padStart(4, '0')}`;

    // Tạo khách hàng mới - only insert fields that are provided
    const insertFields = ['customer_code', 'name', 'customer_type', 'created_by'];
    const insertValues = [customer_code, name, customer_type, req.user.id];
    
    // Add optional fields if they exist
    if (full_name) {
        insertFields.push('full_name');
        insertValues.push(full_name);
    }
    if (representative_name) {
        insertFields.push('representative_name');
        insertValues.push(representative_name);
    }
    if (phone) {
        insertFields.push('phone');
        insertValues.push(phone);
    }
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
    if (representative_phone) {
        insertFields.push('representative_phone');
        insertValues.push(representative_phone);
    }
    if (representative_email) {
        insertFields.push('representative_email');
        insertValues.push(representative_email);
    }
    if (id_number) {
        insertFields.push('id_number');
        insertValues.push(id_number);
    }
    if (warehouse_purpose) {
        insertFields.push('warehouse_purpose');
        insertValues.push(warehouse_purpose);
    }
    if (notes) {
        insertFields.push('notes');
        insertValues.push(notes);
    }
    
    const placeholders = insertFields.map(() => '?').join(', ');
    const insertQuery = `INSERT INTO customers (${insertFields.join(', ')}) VALUES (${placeholders})`;
    
    console.log('🔍 Customer INSERT query:', insertQuery);
    console.log('🔍 Customer INSERT values:', insertValues);
    
    const [result] = await pool.execute(insertQuery, insertValues);

    await logUserActivity(
        req.user.id,
        'CREATE_CUSTOMER',
        'customer',
        result.insertId,
        req.ip,
        req.get('User-Agent'),
        { customerCode: customer_code, companyName: name }
    );

    res.status(201).json({
        success: true,
        message: 'Tạo khách hàng thành công',
        data: {
            id: result.insertId,
            customer_code,
            name
        }
    });
}));

/**
 * @swagger
 * /api/customers/{id}/contracts:
 *   get:
 *     summary: Lấy danh sách hợp đồng của khách hàng
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, expired, terminated, renewed]
 *     responses:
 *       200:
 *         description: Danh sách hợp đồng
 */
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

/**
 * @swagger
 * /api/customers/contracts:
 *   post:
 *     summary: Tạo hợp đồng mới
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Contract'
 *     responses:
 *       201:
 *         description: Tạo hợp đồng thành công
 */
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

    // Kiểm tra zone có khả dụng không
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

    // Kiểm tra ngày hợp lệ
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
    
    // Check if start date is not in the past (for new contracts)
    if (!contractId && startDateObj < today) {
        return res.status(400).json({
            success: false,
            message: 'Ngày bắt đầu không được ở quá khứ'
        });
    }
    
    // Validate date range is reasonable (not more than 50 years)
    const maxYears = 50;
    const maxDate = new Date(startDateObj);
    maxDate.setFullYear(maxDate.getFullYear() + maxYears);
    
    if (endDateObj > maxDate) {
        return res.status(400).json({
            success: false,
            message: `Thời hạn hợp đồng không được vượt quá ${maxYears} năm`
        });
    }

    // Tạo số hợp đồng tự động
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

    // Transaction để đảm bảo consistency
    await pool.execute('START TRANSACTION');

    try {
        // Tạo hợp đồng
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

        // Cập nhật trạng thái zone nếu cần
        if (zones[0].status === 'available') {
            await pool.execute(
                'UPDATE warehouse_zones SET status = "deposited" WHERE id = ?',
                [zone_id]
            );
        }

        await pool.execute('COMMIT');

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
        await pool.execute('ROLLBACK');
        throw error;
    }
}));

/**
 * @swagger
 * /api/customers/contracts/expiring:
 *   get:
 *     summary: Lấy danh sách hợp đồng sắp hết hạn
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *           description: Số ngày trước khi hết hạn
 *     responses:
 *       200:
 *         description: Danh sách hợp đồng sắp hết hạn
 */
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

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Cập nhật thông tin khách hàng
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Khách hàng không tìm thấy
 */
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

    // Kiểm tra khách hàng tồn tại
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

    // Cập nhật thông tin khách hàng - chỉ update các fields được cung cấp
    const updateFields = [];
    const updateValues = [];

    const {
        name, full_name, representative_name, email, phone,
        address, tax_code, representative_phone, representative_email,
        customer_type, notes, id_number, warehouse_purpose
    } = req.body;

    // Chỉ thêm vào UPDATE nếu field được cung cấp
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

    // Luôn update timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    if (updateFields.length > 1) { // Có ít nhất 1 field thực (không tính updated_at)
        const finalValues = [...updateValues, customerId];
        await pool.execute(`
            UPDATE customers SET
                ${updateFields.join(', ')}
            WHERE id = ?
        `, finalValues);
    }

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
}));

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Xóa khách hàng (soft delete)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       400:
 *         description: Không thể xóa vì có hợp đồng active
 *       404:
 *         description: Khách hàng không tìm thấy
 */
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

    // Kiểm tra khách hàng tồn tại
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

    // Kiểm tra có hợp đồng đang active không
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

    // Soft delete
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

/**
 * @swagger
 * /api/customers/stats:
 *   get:
 *     summary: Thống kê tổng quan khách hàng
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê khách hàng
 */
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