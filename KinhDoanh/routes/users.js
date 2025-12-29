const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult, param } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { logger, logUserActivity } = require('../config/logger');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();




router.get('/', requireRole(['admin', 'manager']), catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search;
    const role = req.query.role;

    const pool = mysqlPool();
    
    let baseQuery = `
        SELECT u.id, u.username, u.email, u.full_name, u.role, u.permissions, 
               u.is_active, u.created_at, u.updated_at, u.last_login,
               0 as assigned_projects,
               0 as ai_configs_count,
               NULL as last_activity
        FROM users u
        WHERE 1=1
    `;
    
    const params = [];
    let whereClause = '';

    if (search && search.trim()) {
        whereClause += ` AND (u.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)`;
        const searchPattern = `%${search.trim()}%`;
        params.push(searchPattern, searchPattern, searchPattern);
    }

    if (role && role.trim()) {
        whereClause += ` AND u.role = ?`;
        params.push(role.trim());
    }
    
    const finalQuery = baseQuery + whereClause + ` ORDER BY u.is_active DESC, u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    
    try {
        const [users] = await pool.execute(finalQuery, params);
        const countQuery = `SELECT COUNT(*) as total FROM users u WHERE 1=1` + whereClause;
        const [countResult] = await pool.execute(countQuery, params);

        for (let user of users) {
            try {
                user.permissions = user.permissions ? JSON.parse(user.permissions) : [];
            } catch (e) {
                user.permissions = [];
            }
            delete user.password_hash;
            if (user.assigned_projects === null) user.assigned_projects = 0;
            if (user.ai_configs_count === null) user.ai_configs_count = 0;
        }

        await logUserActivity(req.user.id, 'VIEW_USERS_LIST', 'user', null, req.ip, req.get('User-Agent'));
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


router.get('/:id', [
    param('id').isInt().withMessage('User ID phải là số nguyên')
], requirePermission('user_view'), catchAsync(async (req, res) => {
    const userId = req.params.id;
    const pool = mysqlPool();

    try {
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

        let aiConfigs = [];
        try {
            const [aiResult] = await pool.execute(
                'SELECT * FROM user_ai_configs WHERE user_id = ? ORDER BY priority ASC',
                [userId]
            );
            aiConfigs = aiResult || [];

            const EncryptionService = require('../utils/encryption');
            aiConfigs.forEach(config => {
                if (config.api_key) {
                    try {
                        const decryptedKey = EncryptionService.decrypt(config.api_key);
                        config.api_key = EncryptionService.maskAPIKey(decryptedKey);
                    } catch (error) {
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

    const passwordHash = await bcrypt.hash(password, 12);

    try {
        const [result] = await pool.execute(`
            INSERT INTO users (username, email, password_hash, full_name, phone, role, permissions, is_active, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)
        `, [username, email, passwordHash, full_name, phone || null, role, JSON.stringify(permissions), req.user.id]);

        await logUserActivity(req.user.id, 'CREATE_USER', 'user', result.insertId, req.ip, req.get('User-Agent'), {
            username, email, full_name, role
        });

        const [verifyUser] = await pool.execute(
            'SELECT id, username, email, is_active FROM users WHERE id = ?',
            [result.insertId]
        );

        if (verifyUser.length === 0) {
            throw new Error('User was not created in database');
        }

        res.status(201).json({
            success: true,
            message: 'Tạo người dùng thành công',
            data: {
                id: result.insertId,
                username,
                email,
                full_name,
                role,
                is_active: true
            }
        });
    } catch (dbError) {
        throw new Error('Lỗi khi tạo người dùng trong database: ' + dbError.message);
    }
}));


router.put('/:id/permissions', [
    param('id').isInt().withMessage('User ID phải là số nguyên'),
    body('permissions').isArray().withMessage('Permissions phải là array')
], requirePermission('user_permissions_manage'), catchAsync(async (req, res) => {
    const userId = req.params.id;
    const { permissions } = req.body;
    const pool = mysqlPool();

    try {
        const [users] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tìm thấy'
            });
        }

        const validPermissions = Array.isArray(permissions) ? permissions : [];
        
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


router.post('/:id/project-permissions', [
    param('id').isInt().withMessage('User ID phải là số nguyên'),
    body('project_id').isInt().withMessage('Project ID phải là số nguyên'),
    body('permissions').isArray().withMessage('Permissions phải là array')
], requirePermission('user_permissions_manage'), catchAsync(async (req, res) => {
    const userId = req.params.id;
    const { project_id, permissions } = req.body;
    const pool = mysqlPool();

    const [projects] = await pool.execute('SELECT id FROM projects WHERE id = ?', [project_id]);
    if (projects.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Dự án không tìm thấy'
        });
    }

    const [existing] = await pool.execute(
        'SELECT id FROM user_project_permissions WHERE user_id = ? AND project_id = ?',
        [userId, project_id]
    );

    if (existing.length > 0) {
        await pool.execute(
            'UPDATE user_project_permissions SET permissions = ?, updated_by = ?, updated_at = NOW() WHERE user_id = ? AND project_id = ?',
            [JSON.stringify(permissions), req.user.id, userId, project_id]
        );
    } else {
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


router.post('/:id/ai-configs', [
    body('provider').isIn(['openai', 'gemini', 'copilot', 'claude']).withMessage('Provider không hợp lệ'),
    body('api_key').notEmpty().withMessage('API key là bắt buộc'),
    body('model').notEmpty().withMessage('Model là bắt buộc'),
    body('cost_per_1k_tokens').isFloat({ min: 0 }).withMessage('Cost phải là số dương')
], requirePermission('user_ai_manage'), catchAsync(async (req, res) => {
    const userId = req.params.id;
    const { provider, api_key, model, cost_per_1k_tokens, priority = 1 } = req.body;
    const pool = mysqlPool();

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

    logs.forEach(log => {
        log.details = log.details ? JSON.parse(log.details) : null;
    });

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


router.put('/:id/deactivate', [
    param('id').isInt().withMessage('User ID phải là số nguyên')
], requirePermission('user_delete'), catchAsync(async (req, res) => {
    const userId = req.params.id;
    const pool = mysqlPool();

    try {
        const [users] = await pool.execute('SELECT id, username, full_name, is_active FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tìm thấy'
            });
        }

        const user = users[0];

        if (parseInt(userId, 10) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Bạn không thể vô hiệu hóa chính mình'
            });
        }

        await pool.execute(
            'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
            [userId]
        );

        await logUserActivity(req.user.id, 'DEACTIVATE_USER', 'user', userId, req.ip, req.get('User-Agent'), {
            deactivated_user: user.username,
            deactivated_user_name: user.full_name
        });

        res.json({
            success: true,
            message: 'Vô hiệu hóa người dùng thành công'
        });
        
    } catch (error) {
        console.error('Deactivate user error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi vô hiệu hóa người dùng: ' + error.message
        });
    }
}));


router.put('/:id/activate', [
    param('id').isInt().withMessage('User ID phải là số nguyên')
], requirePermission('user_delete'), catchAsync(async (req, res) => {
    const userId = req.params.id;
    const pool = mysqlPool();

    try {
        const [users] = await pool.execute('SELECT id, username, full_name, is_active FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tìm thấy'
            });
        }

        const user = users[0];

        if (user.is_active) {
            return res.status(400).json({
                success: false,
                message: 'Người dùng đã được kích hoạt'
            });
        }

        await pool.execute(
            'UPDATE users SET is_active = TRUE, updated_at = NOW() WHERE id = ?',
            [userId]
        );

        await logUserActivity(req.user.id, 'ACTIVATE_USER', 'user', userId, req.ip, req.get('User-Agent'), {
            activated_user: user.username,
            activated_user_name: user.full_name
        });

        res.json({
            success: true,
            message: 'Khôi phục người dùng thành công'
        });
        
    } catch (error) {
        console.error('Activate user error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi khôi phục người dùng: ' + error.message
        });
    }
}));

module.exports = router;