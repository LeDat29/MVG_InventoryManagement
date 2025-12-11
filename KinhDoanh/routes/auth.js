/**
 * Authentication Routes - KHO MVG
 * Các route xử lý đăng nhập, đăng ký, quản lý tài khoản
 * 
 * @description Routes cho authentication system với logging đầy đủ
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { logger, logUserActivity, logSecurityEvent } = require('../config/logger');
const { authLimiter } = require('../middleware/rateLimiter');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: Tên đăng nhập hoặc email
 *         password:
 *           type: string
 *           description: Mật khẩu
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         full_name:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, manager, staff, viewer]
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập vào hệ thống
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Thông tin đăng nhập không đúng
 *       429:
 *         description: Quá nhiều lần đăng nhập thất bại
 */
router.post('/login', authLimiter, [
    body('username').trim().notEmpty().withMessage('Username/Email là bắt buộc'),
    body('password').notEmpty().withMessage('Password là bắt buộc')
], catchAsync(async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const { username, password } = req.body;
    const pool = mysqlPool();

    // Tìm user theo username hoặc email
    const [users] = await pool.execute(
        'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = TRUE',
        [username, username]
    );

    if (users.length === 0) {
        logSecurityEvent('LOGIN_FAILED_USER_NOT_FOUND', {
            username,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        }, 'medium');

        return res.status(401).json({
            success: false,
            message: 'Thông tin đăng nhập không đúng'
        });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
        logSecurityEvent('LOGIN_FAILED_WRONG_PASSWORD', {
            userId: user.id,
            username: user.username,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        }, 'medium');

        return res.status(401).json({
            success: false,
            message: 'Thông tin đăng nhập không đúng'
        });
    }

    // Generate tokens
    const tokenPayload = {
        userId: user.id,
        username: user.username,
        role: user.role
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    const refreshToken = jwt.sign(tokenPayload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    });

    // Update last login
    await pool.execute(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
    );

    // Log successful login
    await logUserActivity(
        user.id,
        'LOGIN_SUCCESS',
        'user',
        user.id,
        req.ip,
        req.get('User-Agent'),
        { loginTime: new Date().toISOString() }
    );

    logSecurityEvent('LOGIN_SUCCESS', {
        userId: user.id,
        username: user.username,
        role: user.role,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    }, 'low');

    // Prepare user data (remove sensitive info)
    const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        permissions: Array.isArray(user.permissions) ? user.permissions : (user.permissions ? JSON.parse(user.permissions) : []),
        last_login: user.last_login
    };

    res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
            user: userData,
            token,
            refreshToken
        }
    });
}));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Đăng xuất khỏi hệ thống
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 */
router.post('/logout', authenticateToken, catchAsync(async (req, res) => {
    // Log logout activity
    await logUserActivity(
        req.user.id,
        'LOGOUT',
        'user',
        req.user.id,
        req.ip,
        req.get('User-Agent'),
        { logoutTime: new Date().toISOString() }
    );

    res.json({
        success: true,
        message: 'Đăng xuất thành công'
    });
}));

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token được refresh thành công
 */
router.post('/refresh', catchAsync(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            message: 'Refresh token không được cung cấp'
        });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const pool = mysqlPool();

        // Verify user still exists and is active
        const [users] = await pool.execute(
            'SELECT id, username, role, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0 || !users[0].is_active) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token không hợp lệ'
            });
        }

        const user = users[0];

        // Generate new access token
        const newToken = jwt.sign(
            {
                userId: user.id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'Token được làm mới thành công',
            data: {
                token: newToken
            }
        });
    } catch (error) {
        logSecurityEvent('INVALID_REFRESH_TOKEN', {
            error: error.message,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        }, 'medium');

        return res.status(401).json({
            success: false,
            message: 'Refresh token không hợp lệ'
        });
    }
}));

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Lấy thông tin profile của user hiện tại
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin profile
 */
router.get('/profile', authenticateToken, catchAsync(async (req, res) => {
    const pool = mysqlPool();
    const [users] = await pool.execute(
        'SELECT id, username, email, full_name, phone, role, permissions, created_at, last_login FROM users WHERE id = ?',
        [req.user.id]
    );

    if (users.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'User không tìm thấy'
        });
    }

    const user = users[0];
    user.permissions = Array.isArray(user.permissions) ? user.permissions : (user.permissions ? JSON.parse(user.permissions) : []);

    res.json({
        success: true,
        data: { user }
    });
}));

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Đổi mật khẩu
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 */
router.post('/change-password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Mật khẩu hiện tại là bắt buộc'),
    body('newPassword').isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const { currentPassword, newPassword } = req.body;
    const pool = mysqlPool();

    // Get current user with password hash
    const [users] = await pool.execute(
        'SELECT id, password_hash FROM users WHERE id = ?',
        [req.user.id]
    );

    if (users.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'User không tìm thấy'
        });
    }

    const user = users[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
        logSecurityEvent('CHANGE_PASSWORD_FAILED_WRONG_CURRENT', {
            userId: req.user.id,
            username: req.user.username,
            ip: req.ip
        }, 'medium');

        return res.status(400).json({
            success: false,
            message: 'Mật khẩu hiện tại không đúng'
        });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.execute(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newPasswordHash, req.user.id]
    );

    // Log password change
    await logUserActivity(
        req.user.id,
        'CHANGE_PASSWORD',
        'user',
        req.user.id,
        req.ip,
        req.get('User-Agent')
    );

    logSecurityEvent('PASSWORD_CHANGED', {
        userId: req.user.id,
        username: req.user.username,
        ip: req.ip
    }, 'low');

    res.json({
        success: true,
        message: 'Đổi mật khẩu thành công'
    });
}));

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Lấy danh sách users (Admin only)
 *     tags: [User Management]
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
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách users
 */
router.get('/users', authenticateToken, requireRole(['admin', 'manager']), catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const role = req.query.role;
    const search = req.query.search;

    const pool = mysqlPool();
    let query = 'SELECT id, username, email, full_name, phone, role, is_active, created_at, last_login FROM users WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];

    if (role) {
        query += ' AND role = ?';
        countQuery += ' AND role = ?';
        params.push(role);
    }

    if (search) {
        query += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
        countQuery += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [users] = await pool.execute(query, params);
    const [countResult] = await pool.execute(countQuery, params.slice(0, -2)); // Remove limit and offset

    res.json({
        success: true,
        data: {
            users,
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