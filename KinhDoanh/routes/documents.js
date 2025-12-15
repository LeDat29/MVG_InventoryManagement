/**
 * Document Routes - KHO MVG
 * Quản lý hồ sơ tài liệu
 * 
 * @description Routes cho phân hệ quản lý hồ sơ:
 * - Quản lý danh mục hồ sơ
 * - Upload/Download files
 * - Template hợp đồng tự động
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult, param } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { logger, logUserActivity, logFileOperation } = require('../config/logger');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { requirePermission } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const FileModel = require('../models/File');
const mongoose = require('mongoose');

const router = express.Router();

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join('uploads', 'documents');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 10
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new AppError('Loại file không được hỗ trợ', 400), false);
        }
    }
});

/**
 * @swagger
 * /api/documents/categories:
 *   get:
 *     summary: Lấy danh sách danh mục hồ sơ
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category_type
 *         schema:
 *           type: string
 *           enum: [project, customer, contract, task]
 *     responses:
 *       200:
 *         description: Danh sách danh mục hồ sơ
 */
router.get('/categories', catchAsync(async (req, res) => {
    const categoryType = req.query.category_type;
    
    let query = 'SELECT * FROM document_categories WHERE is_active = TRUE';
    const params = [];

    if (categoryType) {
        query += ' AND category_type = ?';
        params.push(categoryType);
    }

    query += ' ORDER BY sort_order, category_name';

    const pool = mysqlPool();
    const [categories] = await pool.execute(query, params);

    categories.forEach(category => {
        category.required_fields = category.required_fields ? JSON.parse(category.required_fields) : [];
    });

    res.json({
        success: true,
        data: { categories }
    });
}));

/**
 * @swagger
 * /api/documents/categories:
 *   post:
 *     summary: Tạo danh mục hồ sơ mới
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_code
 *               - category_name
 *               - category_type
 *             properties:
 *               category_code:
 *                 type: string
 *               category_name:
 *                 type: string
 *               category_type:
 *                 type: string
 *                 enum: [project, customer, contract, task]
 *               description:
 *                 type: string
 *               required_fields:
 *                 type: array
 *                 items:
 *                   type: string
 *               is_required:
 *                 type: boolean
 */
router.post('/categories', requirePermission('document_category_create'), [
    body('category_code').trim().notEmpty().withMessage('Mã danh mục là bắt buộc'),
    body('category_name').trim().notEmpty().withMessage('Tên danh mục là bắt buộc'),
    body('category_type').isIn(['project', 'customer', 'contract', 'task']).withMessage('Loại danh mục không hợp lệ')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const { category_code, category_name, category_type, description, required_fields, is_required } = req.body;

    const pool = mysqlPool();

    // Insert new category
    const [result] = await pool.execute(
        `INSERT INTO document_categories (category_code, category_name, category_type, description, required_fields, is_required, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())`,
        [
            category_code,
            category_name,
            category_type,
            description || null,
            required_fields ? JSON.stringify(required_fields) : JSON.stringify([]),
            Boolean(is_required)
        ]
    );

    await logUserActivity(
        req.user.id,
        'CREATE_DOCUMENT_CATEGORY',
        'document_category',
        result.insertId,
        req.ip,
        req.get('User-Agent'),
        { categoryCode: category_code, categoryType: category_type }
    );

    res.status(201).json({
        success: true,
        message: 'Tạo danh mục hồ sơ thành công',
        data: {
            id: result.insertId,
            category_code,
            category_name
        }
    });
}));

/**
 * @swagger
 * /api/documents/upload:
 *   post:
 *     summary: Upload file tài liệu
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *               - resource_type
 *               - resource_id
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               resource_type:
 *                 type: string
 *                 enum: [project, customer, contract, task]
 *               resource_id:
 *                 type: integer
 *               category_id:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Upload thành công
 */
// Ensure backing table exists
async function ensureDocumentFilesTable() {
    const pool = mysqlPool();
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS document_files (
            id INT PRIMARY KEY AUTO_INCREMENT,
            filename VARCHAR(255) NOT NULL,
            originalname VARCHAR(255) NOT NULL,
            mimetype VARCHAR(100) NOT NULL,
            size INT NOT NULL,
            path TEXT NOT NULL,
            resource_type ENUM('project','customer','contract','task') NOT NULL,
            resource_id INT NOT NULL,
            category_id INT NULL,
            description TEXT,
            uploaded_by INT,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            INDEX idx_resource (resource_type, resource_id),
            INDEX idx_category (category_id),
            INDEX idx_uploaded_at (uploaded_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
}

async function ensureProjectCategory() {
    const pool = mysqlPool();
    // Try to find a default category for project legal docs
    const [rows] = await pool.execute(
        `SELECT id FROM document_categories WHERE category_type = 'project' AND category_code = 'DU_AN' LIMIT 1`
    );
    if (rows.length > 0) return rows[0].id;
    const [result] = await pool.execute(
        `INSERT INTO document_categories (category_code, category_name, category_type, description, required_fields, is_required, sort_order, is_active, created_at)
         VALUES ('DU_AN', 'Dự Án', 'project', 'Danh mục hồ sơ pháp lý dự án', JSON_ARRAY(), FALSE, 0, TRUE, NOW())`
    );
    return result.insertId;
}

router.post('/upload', uploadLimiter, requirePermission('document_upload'), upload.array('files', 10), catchAsync(async (req, res) => {
    await ensureDocumentFilesTable();

    const { resource_type, resource_id } = req.body;
    let { category_id, description } = req.body;

    if (!resource_type || !resource_id) {
        return res.status(400).json({ success: false, message: 'resource_type và resource_id là bắt buộc' });
    }

    // Default category for project docs if not provided
    if (resource_type === 'project' && !category_id) {
        try { category_id = await ensureProjectCategory(); } catch (_) { category_id = null; }
    }

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'Không có file nào được upload' });
    }

    const pool = mysqlPool();
    const uploaded = [];

    for (const f of req.files) {
        const [result] = await pool.execute(
            `INSERT INTO document_files (filename, originalname, mimetype, size, path, resource_type, resource_id, category_id, description, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                f.filename,
                f.originalname,
                f.mimetype,
                f.size,
                f.path,
                resource_type,
                parseInt(resource_id),
                category_id ? parseInt(category_id) : null,
                description || null,
                req.user?.id || null
            ]
        );
        uploaded.push({
            id: result.insertId,
            filename: f.filename,
            originalname: f.originalname,
            size: f.size,
            mimetype: f.mimetype
        });

        logFileOperation('upload', f.originalname, req.user?.id || null, {
            resourceType: resource_type,
            resourceId: resource_id,
            fileSize: f.size
        });
    }

    await logUserActivity(
        req.user?.id || null,
        'UPLOAD_DOCUMENTS',
        resource_type,
        resource_id,
        req.ip,
        req.get('User-Agent'),
        { fileCount: uploaded.length, totalSize: uploaded.reduce((s, it) => s + it.size, 0) }
    );

    res.json({ success: true, message: `Upload thành công ${uploaded.length} file(s)`, data: { files: uploaded } });
}));

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Lấy danh sách tài liệu
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: resource_type
 *         schema:
 *           type: string
 *           enum: [project, customer, contract, task]
 *       - in: query
 *         name: resource_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sách tài liệu
 */
router.get('/', catchAsync(async (req, res) => {
    await ensureDocumentFilesTable();
    const { resource_type, resource_id, category_id } = req.query;
    const pool = mysqlPool();

    let where = 'WHERE df.is_active = TRUE';
    const params = [];
    if (resource_type) { where += ' AND df.resource_type = ?'; params.push(resource_type); }
    if (resource_id) { where += ' AND df.resource_id = ?'; params.push(parseInt(resource_id)); }
    if (category_id) { where += ' AND df.category_id = ?'; params.push(parseInt(category_id)); }

    // join with categories to get category_name
    const [rows] = await pool.execute(
        `SELECT df.*, dc.category_name
         FROM document_files AS df
         LEFT JOIN document_categories AS dc ON df.category_id = dc.id
         ${where}
         ORDER BY df.uploaded_at DESC`
    , params);

    res.json({ success: true, data: { files: rows } });
}));

/**
 * @swagger
 * /api/documents/download/{fileId}:
 *   get:
 *     summary: Download file
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File được download
 *       404:
 *         description: File không tìm thấy
 */
router.get('/download/:fileId', catchAsync(async (req, res) => {
    const { fileId } = req.params;
    const pool = mysqlPool();
    const [rows] = await pool.execute('SELECT * FROM document_files WHERE id = ? AND is_active = TRUE', [parseInt(fileId)]);
    const file = rows[0];
    if (!file) {
        return res.status(404).json({ success: false, message: 'File không tìm thấy' });
    }
    if (!fs.existsSync(file.path)) {
        return res.status(404).json({ success: false, message: 'File không tồn tại trên server' });
    }

    logFileOperation('download', file.originalname, req.user?.id || null, {
        fileId: file.id,
        resourceType: file.resource_type,
        resourceId: file.resource_id
    });

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalname}"`);
    res.setHeader('Content-Type', file.mimetype);
    fs.createReadStream(file.path).pipe(res);
}));

/**
 * Delete (deactivate) file
 * NOTE: This route marks the file as inactive but does not immediately remove it from disk.
 * It requires proper permission and will log the deletion action.
 */
router.delete('/:fileId', requirePermission('document_delete'), catchAsync(async (req, res) => {
    const { fileId } = req.params;
    const pool = mysqlPool();
    const [rows] = await pool.execute('SELECT * FROM document_files WHERE id = ? AND is_active = TRUE', [parseInt(fileId)]);
    const file = rows[0];
    if (!file) {
        return res.status(404).json({ success: false, message: 'File không tìm thấy' });
    }

    await pool.execute('UPDATE document_files SET is_active = FALSE WHERE id = ?', [parseInt(fileId)]);

    await logUserActivity(
        req.user?.id || null,
        'DELETE_DOCUMENT',
        file.resource_type,
        file.resource_id,
        req.ip,
        req.get('User-Agent'),
        { fileId: file.id, filename: file.originalname }
    );

    await logFileOperation('delete', file.originalname, req.user?.id || null, {
        fileId: file.id,
        resourceType: file.resource_type,
        resourceId: file.resource_id
    });

    res.json({ success: true, message: 'Xóa tài liệu thành công' });
}));

/**
 * @swagger
 * /api/documents/templates:
 *   get:
 *     summary: Lấy danh sách template hợp đồng
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách templates
 */
router.get('/templates', catchAsync(async (req, res) => {
    const mongoose = require('mongoose');
    
    const TemplateSchema = new mongoose.Schema({
        template_name: String,
        template_type: { type: String, enum: ['contract', 'amendment', 'notice', 'termination'] },
        template_content: String, // HTML content with placeholders
        placeholders: [String], // List of available placeholders
        is_active: { type: Boolean, default: true },
        created_by: Number,
        created_at: { type: Date, default: Date.now }
    });

    const TemplateModel = mongoose.model('DocumentTemplate', TemplateSchema);

    const templates = await TemplateModel.find({ is_active: true }).sort({ created_at: -1 });

    res.json({
        success: true,
        data: { templates }
    });
}));

/**
 * @swagger
 * /api/documents/generate-contract:
 *   post:
 *     summary: Tạo hợp đồng tự động từ template
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - template_id
 *               - contract_id
 *             properties:
 *               template_id:
 *                 type: string
 *               contract_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Hợp đồng được tạo thành công
 */
router.post('/generate-contract', requirePermission('contract_generate'), [
    body('template_id').notEmpty().withMessage('Template ID là bắt buộc'),
    body('contract_id').isInt().withMessage('Contract ID phải là số nguyên')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const { template_id, contract_id } = req.body;

    // Lấy thông tin hợp đồng đầy đủ
    const pool = mysqlPool();
    const [contracts] = await pool.execute(`
        SELECT ct.*, 
               c.customer_code, c.company_name, c.contact_person, c.email, c.phone, c.address as customer_address,
               p.name as project_name, p.code as project_code, p.address as project_address,
               wz.zone_code, wz.zone_name, wz.area
        FROM contracts ct
        LEFT JOIN customers c ON ct.customer_id = c.id
        LEFT JOIN projects p ON ct.project_id = p.id
        LEFT JOIN warehouse_zones wz ON ct.zone_id = wz.id
        WHERE ct.id = ?
    `, [contract_id]);

    if (contracts.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Hợp đồng không tìm thấy'
        });
    }

    const contractData = contracts[0];

    // Lấy template
    const mongoose = require('mongoose');
    const TemplateModel = mongoose.model('DocumentTemplate');
    const template = await TemplateModel.findById(template_id);

    if (!template || !template.is_active) {
        return res.status(404).json({
            success: false,
            message: 'Template không tìm thấy'
        });
    }

    // Replace placeholders với dữ liệu thực
    let content = template.template_content;
    const placeholders = {
        '{{contract_number}}': contractData.contract_number,
        '{{company_name}}': contractData.company_name || '',
        '{{contact_person}}': contractData.contact_person,
        '{{customer_address}}': contractData.customer_address || '',
        '{{project_name}}': contractData.project_name,
        '{{project_address}}': contractData.project_address,
        '{{zone_code}}': contractData.zone_code,
        '{{zone_area}}': contractData.area,
        '{{rental_price}}': new Intl.NumberFormat('vi-VN').format(contractData.rental_price),
        '{{start_date}}': new Date(contractData.start_date).toLocaleDateString('vi-VN'),
        '{{end_date}}': new Date(contractData.end_date).toLocaleDateString('vi-VN'),
        '{{current_date}}': new Date().toLocaleDateString('vi-VN')
    };

    Object.keys(placeholders).forEach(placeholder => {
        content = content.replace(new RegExp(placeholder, 'g'), placeholders[placeholder]);
    });

    await logUserActivity(
        req.user.id,
        'GENERATE_CONTRACT_DOCUMENT',
        'contract',
        contract_id,
        req.ip,
        req.get('User-Agent'),
        { templateId: template_id, templateName: template.template_name }
    );

    res.json({
        success: true,
        message: 'Tạo hợp đồng thành công',
        data: {
            content,
            template_name: template.template_name,
            contract_number: contractData.contract_number
        }
    });
}));

module.exports = router;