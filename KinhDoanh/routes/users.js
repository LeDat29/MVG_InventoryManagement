/**
 * Users Management Routes - KHO MVG
 * Phân hệ 2.4 - Quản lý User nâng cao
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult, param } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { logger, logUserActivity } = require('../config/logger');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserPermissions:
 *       type: object
 *       properties:
 *         system_permissions:
 *           type: array
 *           items:
 *             type: string
 *         project_permissions:
 *           type: object
 *           description: "Quyền theo từng dự án (format: project_id -> array of permissions)"
 *         ai_api_configs:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [openai, gemini, copilot, claude]
 *               api_key:
 *                 type: string
 *               model:
 *                 type: string
 *               cost_per_1k_tokens:
 *                 type: number
 *               is_active:
 *                 type: boolean
 *               priority:
 *                 type: integer
 *     
 *     UserActivityLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         action:
 *           type: string
 *         resource_type:
 *           type: string
 *         resource_id:
 *           type: integer
 *         details:
 *           type: object
 *         ip_address:
 *           type: string
 *         user_agent:
 *           type: string
 *         is_ai_assisted:
 *           type: boolean
 *         ai_session_id:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * 2.4.1 - Quản lý thông tin người dùng
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lấy danh sách người dùng với phân quyền chi tiết
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', requireRole(['admin', 'manager']), catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search;
    const role = req.query.role;

    const pool = mysqlPool();
    
    // Use simple query that works reliably
    let baseQuery = `
        SELECT u.id, u.username, u.email, u.full_name, u.role, u.permissions, 
               u.is_active, u.created_at, u.updated_at, u.last_login,
               0 as assigned_projects,
               0 as ai_configs_count,
               NULL as last_activity
        FROM users u
        WHERE u.is_active = TRUE
    `;
    
    const params = [];
    let whereClause = '';

    // Add search filter
    if (search && search.trim()) {
        whereClause += ` AND (u.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)`;
        const searchPattern = `%${search.trim()}%`;
        params.push(searchPattern, searchPattern, searchPattern);
    }

    // Add role filter  
    if (role && role.trim()) {
        whereClause += ` AND u.role = ?`;
        params.push(role.trim());
    }
    
    // Build final query with safe LIMIT/OFFSET
    const finalQuery = baseQuery + whereClause + ` ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    
    console.log('Users Query:', finalQuery);
    console.log('Params:', params);
    
    try {
        // Execute the main query
        const [users] = await pool.execute(finalQuery, params);
        
        // Execute count query
        const countQuery = `SELECT COUNT(*) as total FROM users u WHERE u.is_active = TRUE` + whereClause;
        const [countResult] = await pool.execute(countQuery, params);

        // Process users data
        for (let user of users) {
            // Parse permissions safely
            try {
                user.permissions = user.permissions ? JSON.parse(user.permissions) : [];
            } catch (e) {
                user.permissions = [];
            }
            
            // Remove sensitive data
            delete user.password_hash;
            
            // Add computed fields if needed
            if (user.assigned_projects === null) user.assigned_projects = 0;
            if (user.ai_configs_count === null) user.ai_configs_count = 0;
        }

        // Log user activity
        await logUserActivity(req.user.id, 'VIEW_USERS_LIST', 'user', null, req.ip, req.get('User-Agent'));

        // Return successful response
        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page,
                    limit,
                    total: countResult[0].total,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Users API Error:', error);
        throw new Error('Không thể lấy danh sách người dùng: ' + error.message);
    }
}));

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Lấy chi tiết người dùng với quyền hạn đầy đủ
 */
router.get('/:id', [
    param('id').isInt().withMessage('User ID phải là số nguyên')
], requirePermission('user_view'), catchAsync(async (req, res) => {
    const userId = req.params.id;
    const pool = mysqlPool();

    try {
        // Get user basic info with safe query
        const [users] = await pool.execute(
            'SELECT id, username, email, full_name, phone, role, permissions, is_active, created_at, last_login FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tìm thấy'
            });
        }

        const user = users[0];
        
        // Parse permissions safely
        try {
            if (user.permissions && typeof user.permissions === 'string') {
                user.permissions = JSON.parse(user.permissions);
            } else if (!user.permissions || !Array.isArray(user.permissions)) {
                user.permissions = [];
            }
        } catch (e) {
            console.warn('Error parsing user permissions:', e.message);
            user.permissions = [];
        }

        // Get project permissions safely
        let projectPerms = [];
        try {
            const [projectResult] = await pool.execute(`
                SELECT upp.*, p.name as project_name, p.code as project_code
                FROM user_project_permissions upp
                LEFT JOIN projects p ON upp.project_id = p.id
                WHERE upp.user_id = ?
            `, [userId]);
            projectPerms = projectResult || [];
        } catch (projectError) {
            console.warn('Could not load project permissions:', projectError.message);
        }

        // Get AI configurations safely
        let aiConfigs = [];
        try {
            const [aiResult] = await pool.execute(
                'SELECT * FROM user_ai_configs WHERE user_id = ? ORDER BY priority ASC',
                [userId]
            );
            aiConfigs = aiResult || [];

            // Mask API keys for display
            const EncryptionService = require('../utils/encryption');
            aiConfigs.forEach(config => {
                if (config.api_key) {
                    try {
                        const decryptedKey = EncryptionService.decrypt(config.api_key);
                        config.api_key = EncryptionService.maskAPIKey(decryptedKey);
                    } catch (error) {
                        // If decryption fails (old unencrypted keys), just mask
                        config.api_key = '****' + (config.api_key.length > 4 ? config.api_key.slice(-4) : '****');
                    }
                }
            });
        } catch (aiError) {
            console.warn('Could not load AI configs:', aiError.message);
        }

        await logUserActivity(req.user.id, 'VIEW_USER_DETAIL', 'user', userId, req.ip, req.get('User-Agent'));

        res.json({
            success: true,
            data: {
                user,
                project_permissions: projectPerms,
                ai_configurations: aiConfigs
            }
        });
        
    } catch (error) {
        console.error('Get user detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin người dùng: ' + error.message
        });
    }
}));

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Tạo người dùng mới
 */
router.post('/', requirePermission('user_create'), [
    body('username').trim().isLength({ min: 3 }).withMessage('Username phải có ít nhất 3 ký tự'),
    body('email').isEmail().withMessage('Email không hợp lệ'),
    body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
    body('full_name').trim().notEmpty().withMessage('Tên đầy đủ là bắt buộc'),
    body('role').isIn(['admin', 'manager', 'staff', 'viewer']).withMessage('Vai trò không hợp lệ')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const { username, email, password, full_name, phone, role, permissions = [] } = req.body;
    const pool = mysqlPool();

    // Check if username or email exists
    const [existing] = await pool.execute(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
    );

    if (existing.length > 0) {
        return res.status(409).json({
            success: false,
            message: 'Username hoặc email đã tồn tại'
        });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [result] = await pool.execute(`
        INSERT INTO users (username, email, password_hash, full_name, phone, role, permissions, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [username, email, passwordHash, full_name, phone, role, JSON.stringify(permissions), req.user.id]);

    await logUserActivity(req.user.id, 'CREATE_USER', 'user', result.insertId, req.ip, req.get('User-Agent'), {
        username, email, full_name, role
    });

    res.status(201).json({
        success: true,
        message: 'Tạo người dùng thành công',
        data: {
            id: result.insertId,
            username,
            email,
            full_name,
            role
        }
    });
}));

/**
 * @swagger
 * /api/users/{id}/permissions:
 *   put:
 *     summary: Cập nhật quyền hệ thống của người dùng
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id/permissions', [
    param('id').isInt().withMessage('User ID phải là số nguyên'),
    body('permissions').isArray().withMessage('Permissions phải là array')
], requirePermission('user_permissions_manage'), catchAsync(async (req, res) => {
    const userId = req.params.id;
    const { permissions } = req.body;
    const pool = mysqlPool();

    try {
        // Verify user exists
        const [users] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tìm thấy'
            });
        }

        // Validate permissions array
        const validPermissions = Array.isArray(permissions) ? permissions : [];
        
        // Update user permissions
        await pool.execute(
            'UPDATE users SET permissions = ?, updated_at = NOW() WHERE id = ?',
            [JSON.stringify(validPermissions), userId]
        );

        await logUserActivity(req.user.id, 'UPDATE_USER_SYSTEM_PERMISSIONS', 'user', userId, req.ip, req.get('User-Agent'), {
            permissions: validPermissions
        });

        res.json({
            success: true,
            message: 'Cập nhật quyền hệ thống thành công'
        });
        
    } catch (error) {
        console.error('Update permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật quyền hệ thống: ' + error.message
        });
    }
}));

/**
 * 2.4.2 - Quản lý quyền hạn theo dự án
 */

/**
 * @swagger
 * /api/users/{id}/project-permissions:
 *   post:
 *     summary: Gán quyền cho người dùng theo dự án cụ thể
 */
router.post('/:id/project-permissions', [
    param('id').isInt().withMessage('User ID phải là số nguyên'),
    body('project_id').isInt().withMessage('Project ID phải là số nguyên'),
    body('permissions').isArray().withMessage('Permissions phải là array')
], requirePermission('user_permissions_manage'), catchAsync(async (req, res) => {
    const userId = req.params.id;
    const { project_id, permissions } = req.body;
    const pool = mysqlPool();

    // Verify project exists
    const [projects] = await pool.execute('SELECT id FROM projects WHERE id = ?', [project_id]);
    if (projects.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Dự án không tìm thấy'
        });
    }

    // Check if permission already exists
    const [existing] = await pool.execute(
        'SELECT id FROM user_project_permissions WHERE user_id = ? AND project_id = ?',
        [userId, project_id]
    );

    if (existing.length > 0) {
        // Update existing permissions
        await pool.execute(
            'UPDATE user_project_permissions SET permissions = ?, updated_by = ?, updated_at = NOW() WHERE user_id = ? AND project_id = ?',
            [JSON.stringify(permissions), req.user.id, userId, project_id]
        );
    } else {
        // Create new permissions
        await pool.execute(`
            INSERT INTO user_project_permissions (user_id, project_id, permissions, created_by)
            VALUES (?, ?, ?, ?)
        `, [userId, project_id, JSON.stringify(permissions), req.user.id]);
    }

    await logUserActivity(req.user.id, 'UPDATE_USER_PROJECT_PERMISSIONS', 'user', userId, req.ip, req.get('User-Agent'), {
        project_id, permissions
    });

    res.json({
        success: true,
        message: 'Cập nhật quyền dự án thành công'
    });
}));

/**
 * 2.4.3 - Quản lý API các mô hình AI
 */

/**
 * @swagger
 * /api/users/{id}/ai-configs:
 *   get:
 *     summary: Lấy cấu hình AI của người dùng
 */
router.get('/:id/ai-configs', requirePermission('user_ai_manage'), catchAsync(async (req, res) => {
    const userId = req.params.id;
    const pool = mysqlPool();

    const [configs] = await pool.execute(`
        SELECT id, provider, model, cost_per_1k_tokens, is_active, priority, created_at,
               CONCAT(LEFT(api_key, 4), '****', RIGHT(api_key, 4)) as masked_api_key
        FROM user_ai_configs 
        WHERE user_id = ? 
        ORDER BY priority ASC, created_at DESC
    `, [userId]);

    res.json({
        success: true,
        data: { ai_configurations: configs }
    });
}));

/**
 * @swagger
 * /api/users/{id}/ai-configs:
 *   post:
 *     summary: Thêm cấu hình AI cho người dùng
 */
router.post('/:id/ai-configs', [
    body('provider').isIn(['openai', 'gemini', 'copilot', 'claude']).withMessage('Provider không hợp lệ'),
    body('api_key').notEmpty().withMessage('API key là bắt buộc'),
    body('model').notEmpty().withMessage('Model là bắt buộc'),
    body('cost_per_1k_tokens').isFloat({ min: 0 }).withMessage('Cost phải là số dương')
], requirePermission('user_ai_manage'), catchAsync(async (req, res) => {
    const userId = req.params.id;
    const { provider, api_key, model, cost_per_1k_tokens, priority = 1 } = req.body;
    const pool = mysqlPool();

    // Check if user already has config for this provider
    const [existing] = await pool.execute(
        'SELECT id FROM user_ai_configs WHERE user_id = ? AND provider = ?',
        [userId, provider]
    );

    if (existing.length > 0) {
        return res.status(409).json({
            success: false,
            message: `Đã có cấu hình ${provider} cho user này`
        });
    }

    // Encrypt API key before storing
    const EncryptionService = require('../utils/encryption');
    const encryptedApiKey = EncryptionService.encrypt(api_key);

    const [result] = await pool.execute(`
        INSERT INTO user_ai_configs (user_id, provider, api_key, model, cost_per_1k_tokens, priority, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, provider, encryptedApiKey, model, cost_per_1k_tokens, priority, req.user.id]);

    await logUserActivity(req.user.id, 'ADD_USER_AI_CONFIG', 'user', userId, req.ip, req.get('User-Agent'), {
        provider, model, cost_per_1k_tokens
    });

    res.status(201).json({
        success: true,
        message: 'Thêm cấu hình AI thành công',
        data: { id: result.insertId }
    });
}));

/**
 * 2.4.4 - Quản lý lịch sử thao tác (Admin only)
 */

/**
 * @swagger
 * /api/users/activity-logs:
 *   get:
 *     summary: Lấy lịch sử hoạt động của tất cả users (Admin only)
 */
router.get('/activity-logs', requireRole(['admin']), catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const userId = req.query.user_id;
    const action = req.query.action;
    const isAiAssisted = req.query.is_ai_assisted;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    const pool = mysqlPool();
    let query = `
        SELECT ul.*, u.username, u.full_name
        FROM user_logs ul
        LEFT JOIN users u ON ul.user_id = u.id
        WHERE 1=1
    `;
    const params = [];

    if (userId) {
        query += ' AND ul.user_id = ?';
        params.push(userId);
    }

    if (action) {
        query += ' AND ul.action = ?';
        params.push(action);
    }

    if (isAiAssisted !== undefined) {
        query += ' AND ul.is_ai_assisted = ?';
        params.push(isAiAssisted === 'true');
    }

    if (startDate) {
        query += ' AND ul.created_at >= ?';
        params.push(startDate);
    }

    if (endDate) {
        query += ' AND ul.created_at <= ?';
        params.push(endDate);
    }

    query += ' ORDER BY ul.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [logs] = await pool.execute(query, params);

    // Parse details JSON
    logs.forEach(log => {
        log.details = log.details ? JSON.parse(log.details) : null;
    });

    // Get statistics
    const [stats] = await pool.execute(`
        SELECT 
            COUNT(*) as total_actions,
            COUNT(CASE WHEN is_ai_assisted = TRUE THEN 1 END) as ai_assisted_actions,
            COUNT(DISTINCT user_id) as active_users,
            COUNT(DISTINCT DATE(created_at)) as active_days
        FROM user_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    await logUserActivity(req.user.id, 'VIEW_ACTIVITY_LOGS', 'system', null, req.ip, req.get('User-Agent'), {
        filters: { userId, action, isAiAssisted, startDate, endDate }
    });

    res.json({
        success: true,
        data: {
            logs,
            statistics: stats[0],
            pagination: {
                page,
                limit,
                total: logs.length
            }
        }
    });
}));

/**
 * @swagger
 * /api/users/{id}/activity-logs:
 *   get:
 *     summary: Lấy lịch sử hoạt động của người dùng cụ thể
 */
router.get('/:id/activity-logs', [
    param('id').isInt().withMessage('User ID phải là số nguyên')
], requirePermission('user_logs_view'), catchAsync(async (req, res) => {
    const userId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const pool = mysqlPool();
    const [logs] = await pool.execute(`
        SELECT * FROM user_logs 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    const [countResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM user_logs WHERE user_id = ?',
        [userId]
    );

    // Parse details
    logs.forEach(log => {
        log.details = log.details ? JSON.parse(log.details) : null;
    });

    res.json({
        success: true,
        data: {
            logs,
            pagination: {
                page,
                limit,
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        }
    });
}));

module.exports = router;