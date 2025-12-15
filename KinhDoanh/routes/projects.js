/**
 * Project Routes - KHO MVG
 * Quản lý các dự án kho xưởng
 * 
 * @description Routes cho phân hệ quản lý dự án:
 * - CRUD thông tin dự án
 * - Quản lý vị trí Google Maps
 * - Quản lý zones kho bên trong
 * - Import/Export bản vẽ
 * - Quản lý công việc định kỳ
 */

const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { mysqlPool } = require('../config/database');
const { logger, logUserActivity } = require('../config/logger');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { requireRole, requirePermission, requireResourceAccess } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/projects/');
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
        files: 5
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/dwg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new AppError('Loại file không được hỗ trợ', 400), false);
        }
    }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       required:
 *         - name
 *         - code
 *         - address
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *           description: Tên dự án
 *         code:
 *           type: string
 *           description: Mã dự án (unique)
 *         description:
 *           type: string
 *           description: Mô tả dự án
 *         address:
 *           type: string
 *           description: Địa chỉ dự án
 *         province:
 *           type: string
 *         district:
 *           type: string
 *         ward:
 *           type: string
 *         latitude:
 *           type: number
 *           format: float
 *         longitude:
 *           type: number
 *           format: float
 *         total_area:
 *           type: number
 *           format: float
 *           description: Diện tích tổng (m²)
 *         used_area:
 *           type: number
 *           format: float
 *           description: Diện tích đã sử dụng (m²)
 *         available_area:
 *           type: number
 *           format: float
 *           description: Diện tích còn trống (m²)
 *         fixed_area:
 *           type: number
 *           format: float
 *           description: Diện tích cố định (m²)
 *         status:
 *           type: string
 *           enum: [planning, construction, operational, maintenance]
 *         owner_info:
 *           type: object
 *           description: Thông tin chủ sở hữu
 *         legal_documents:
 *           type: object
 *           description: Hồ sơ pháp lý
 *         map_data:
 *           type: object
 *           description: Dữ liệu Google Maps polygon
 *         warehouse_layout:
 *           type: object
 *           description: Layout các khu vực kho
 *     
 *     WarehouseZone:
 *       type: object
 *       required:
 *         - project_id
 *         - zone_code
 *         - area
 *       properties:
 *         id:
 *           type: integer
 *         project_id:
 *           type: integer
 *         zone_code:
 *           type: string
 *           description: Mã khu vực
 *         zone_name:
 *           type: string
 *           description: Tên khu vực
 *         area:
 *           type: number
 *           format: float
 *           description: Diện tích (m²)
 *         zone_type:
 *           type: string
 *           enum: [rental, fixed_service, common_area]
 *         status:
 *           type: string
 *           enum: [available, rented, deposited, maintenance]
 *           description: "available: chưa cho thuê (đỏ), rented: đã cho thuê (xanh), deposited: đã cọc (cam), maintenance: bảo trì (trắng)"
 *         rental_price:
 *           type: number
 *           format: float
 *         coordinates:
 *           type: object
 *           description: Tọa độ khu vực trên bản đồ
 *         facilities:
 *           type: object
 *           description: Tiện ích có sẵn
 */

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Lấy danh sách dự án
 *     tags: [Projects]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planning, construction, operational, maintenance]
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           description: Tìm kiếm theo tên hoặc mã dự án
 *     responses:
 *       200:
 *         description: Danh sách dự án
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     projects:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Project'
 *                     pagination:
 *                       type: object
 */
router.get('/', catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const province = req.query.province;
    const search = req.query.search;

    const pool = mysqlPool();
    // Build base query without GROUP BY to avoid ONLY_FULL_GROUP_BY issues
    let query = `
        SELECT 
            p.*, 
            u.username as created_by_username,
            (SELECT COUNT(*) FROM warehouse_zones wz WHERE wz.project_id = p.id AND wz.is_active = 1) as zone_count,
            (SELECT COALESCE(SUM(CASE WHEN wz2.status = 'rented' THEN wz2.area ELSE 0 END), 0) FROM warehouse_zones wz2 WHERE wz2.project_id = p.id AND wz2.is_active = 1) as rented_area,
            (SELECT COALESCE(SUM(CASE WHEN wz3.status = 'available' THEN wz3.area ELSE 0 END), 0) FROM warehouse_zones wz3 WHERE wz3.project_id = p.id AND wz3.is_active = 1) as available_area_calc
        FROM projects p 
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.is_active = 1
    `;
    
    let countQuery = 'SELECT COUNT(*) as total FROM projects p WHERE p.is_active = 1';
    const params = [];
    const countParams = [];

    if (status) {
        query += ' AND p.status = ?';
        countQuery += ' AND p.status = ?';
        params.push(status);
        countParams.push(status);
    }

    if (province) {
        query += ' AND p.province = ?';
        countQuery += ' AND p.province = ?';
        params.push(province);
        countParams.push(province);
    }

    if (search) {
        query += ' AND (p.name LIKE ? OR p.code LIKE ?)';
        countQuery += ' AND (p.name LIKE ? OR p.code LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
        countParams.push(searchPattern, searchPattern);
    }

    query += ` ORDER BY p.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    try {
        const [projects] = await pool.execute(query, params);
        const [countResult] = await pool.execute(countQuery, countParams);

        // Parse JSON fields
        projects.forEach(project => {
            project.owner_info = project.owner_info ? JSON.parse(project.owner_info) : null;
            project.legal_documents = project.legal_documents ? JSON.parse(project.legal_documents) : null;
            project.map_data = project.map_data ? JSON.parse(project.map_data) : null;
            project.warehouse_layout = project.warehouse_layout ? JSON.parse(project.warehouse_layout) : null;
        });

        if (req.user && req.user.id) {
            await logUserActivity(req.user.id, 'VIEW_PROJECTS_LIST', 'project', null, req.ip, req.get('User-Agent'));
        }

        res.json({
            success: true,
            data: {
                projects,
                pagination: {
                    page,
                    limit,
                    total: countResult[0].total,
                    pages: Math.ceil(countResult[0].total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi truy vấn danh sách dự án', error: error.message });
    }
}));

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Lấy chi tiết dự án
 *     tags: [Projects]
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
 *         description: Chi tiết dự án
 *       404:
 *         description: Dự án không tìm thấy
 */
router.get('/:id', [
    param('id').isInt().withMessage('ID dự án phải là số nguyên')
], requireResourceAccess('project'), catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const projectId = req.params.id;
    const pool = mysqlPool();

    // Lấy thông tin dự án
    const [projects] = await pool.execute(`
        SELECT p.*, u.username as created_by_username
        FROM projects p 
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.id = ? AND p.is_active = TRUE
    `, [projectId]);

    if (projects.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Dự án không tìm thấy'
        });
    }

    const project = projects[0];

    // Parse JSON fields
    project.owner_info = project.owner_info ? JSON.parse(project.owner_info) : null;
    project.legal_documents = project.legal_documents ? JSON.parse(project.legal_documents) : null;
    project.map_data = project.map_data ? JSON.parse(project.map_data) : null;
    project.warehouse_layout = project.warehouse_layout ? JSON.parse(project.warehouse_layout) : null;

    // Lấy danh sách zones
    const [zones] = await pool.execute(`
        SELECT * FROM warehouse_zones 
        WHERE project_id = ? AND is_active = TRUE
        ORDER BY zone_code
    `, [projectId]);

    zones.forEach(zone => {
        zone.coordinates = zone.coordinates ? JSON.parse(zone.coordinates) : null;
        zone.facilities = zone.facilities ? JSON.parse(zone.facilities) : null;
    });

    // Thống kê
    const [stats] = await pool.execute(`
        SELECT 
            COUNT(*) as total_zones,
            SUM(area) as total_zone_area,
            SUM(CASE WHEN status = 'available' THEN area ELSE 0 END) as available_area,
            SUM(CASE WHEN status = 'rented' THEN area ELSE 0 END) as rented_area,
            SUM(CASE WHEN status = 'deposited' THEN area ELSE 0 END) as deposited_area,
            COUNT(CASE WHEN status = 'available' THEN 1 END) as available_zones,
            COUNT(CASE WHEN status = 'rented' THEN 1 END) as rented_zones,
            COUNT(CASE WHEN status = 'deposited' THEN 1 END) as deposited_zones
        FROM warehouse_zones 
        WHERE project_id = ? AND is_active = TRUE
    `, [projectId]);

    if (req.user && req.user.id) {
      await logUserActivity(req.user.id, 'VIEW_PROJECT_DETAIL', 'project', projectId, req.ip, req.get('User-Agent'));
    }

    res.json({
        success: true,
        data: {
            project,
            zones,
            statistics: stats[0]
        }
    });
}));

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Tạo dự án mới
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       201:
 *         description: Tạo dự án thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       409:
 *         description: Mã dự án đã tồn tại
 */
router.post('/', requirePermission('project_create'), [
    body('name').trim().notEmpty().withMessage('Tên dự án là bắt buộc'),
    body('code').trim().notEmpty().withMessage('Mã dự án là bắt buộc')
        .isLength({ max: 50 }).withMessage('Mã dự án không được quá 50 ký tự'),
    body('address').trim().notEmpty().withMessage('Địa chỉ là bắt buộc'),
    body('total_area').isFloat({ min: 0 }).withMessage('Diện tích tổng phải là số dương'),
    body('latitude').optional().isFloat().withMessage('Latitude phải là số'),
    body('longitude').optional().isFloat().withMessage('Longitude phải là số')
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
        name, code, description, address, province, district, ward,
        latitude, longitude, total_area, owner_info, legal_documents,
        map_data, status = 'planning'
    } = req.body;

    const pool = mysqlPool();

    // Kiểm tra mã dự án đã tồn tại
    const [existingProjects] = await pool.execute(
        'SELECT id FROM projects WHERE code = ? AND is_active = TRUE',
        [code]
    );

    if (existingProjects.length > 0) {
        return res.status(409).json({
            success: false,
            message: 'Mã dự án đã tồn tại'
        });
    }

    // Tạo dự án mới
    const [result] = await pool.execute(`
        INSERT INTO projects (
            name, code, description, address, province, district, ward,
            latitude, longitude, total_area, available_area, status,
            owner_info, legal_documents, map_data, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        name, code, description, address, province, district, ward,
        latitude, longitude, total_area, total_area, status,
        owner_info ? JSON.stringify(owner_info) : null,
        legal_documents ? JSON.stringify(legal_documents) : null,
        map_data ? JSON.stringify(map_data) : null,
        req.user.id
    ]);

    await logUserActivity(
        req.user.id,
        'CREATE_PROJECT',
        'project',
        result.insertId,
        req.ip,
        req.get('User-Agent'),
        { projectName: name, projectCode: code }
    );

    res.status(201).json({
        success: true,
        message: 'Tạo dự án thành công',
        data: {
            id: result.insertId,
            code,
            name
        }
    });
}));

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Cập nhật dự án
 *     tags: [Projects]
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
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Dự án không tìm thấy
 */
router.put('/:id', [
    param('id').isInt().withMessage('ID dự án phải là số nguyên'),
    body('name').optional().trim().notEmpty().withMessage('Tên dự án không được rỗng'),
    body('total_area').optional().isFloat({ min: 0 }).withMessage('Diện tích tổng phải là số dương')
], requireResourceAccess('project'), requirePermission('project_update'), catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const projectId = req.params.id;
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
        'name', 'description', 'address', 'province', 'district', 'ward',
        'latitude', 'longitude', 'total_area', 'status', 'owner_info',
        'legal_documents', 'map_data', 'warehouse_layout'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            if (field === 'owner_info' || field === 'legal_documents' || 
                field === 'map_data' || field === 'warehouse_layout') {
                updateFields.push(`${field} = ?`);
                updateValues.push(JSON.stringify(req.body[field]));
            } else {
                updateFields.push(`${field} = ?`);
                updateValues.push(req.body[field]);
            }
        }
    });

    if (updateFields.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Không có dữ liệu để cập nhật'
        });
    }

    updateValues.push(projectId);

    const pool = mysqlPool();
    const [result] = await pool.execute(
        `UPDATE projects SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_active = TRUE`,
        updateValues
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({
            success: false,
            message: 'Dự án không tìm thấy'
        });
    }

    await logUserActivity(
        req.user.id,
        'UPDATE_PROJECT',
        'project',
        projectId,
        req.ip,
        req.get('User-Agent'),
        { updatedFields: Object.keys(req.body) }
    );

    res.json({
        success: true,
        message: 'Cập nhật dự án thành công'
    });
}));

// Import middleware để xử lý các route con
router.use('/:id/zones', require('./projectZones'));
router.use('/:id/tasks', require('./projectTasks'));
// TODO: Implement this route in future
// router.use('/:id/files', require('./projectFiles'));

// Lấy danh sách kho (zones) của dự án (API đơn giản cho ContractCreator)
router.get('/:id/zones', async (req, res) => {
  try {
    const pool = mysqlPool();
    
    // Check if warehouse_zones table exists before querying
    const [tableCheck] = await pool.execute('SHOW TABLES LIKE "warehouse_zones"');
    if (tableCheck.length === 0) {
        return res.status(200).json({ success: true, data: { zones: [] } });
    }

    const [zones] = await pool.execute('SELECT id, zone_code, zone_name FROM warehouse_zones WHERE project_id = ? ORDER BY zone_code', [req.params.id]);
    res.json({ success: true, data: { zones } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách kho', error: error.message });
  }
});

module.exports = router;