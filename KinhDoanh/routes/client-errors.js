/**
 * Client Error Logging Routes - KHO MVG
 * Nhận và lưu trữ lỗi từ client để tracking và debugging
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { logger } = require('../config/logger');
const { catchAsync } = require('../middleware/errorHandler');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/client-errors - Log client-side errors
 */
router.post('/', optionalAuth, [
    body('message').notEmpty().withMessage('Error message is required'),
    body('stack').optional().isString(),
    body('context').optional().isObject()
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Invalid data',
            errors: errors.array()
        });
    }

    const { message, stack, context } = req.body;
    const userId = req.user?.id || null;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    try {
        const pool = mysqlPool();
        
        // Store error in database
        await pool.execute(`
            INSERT INTO client_errors (user_id, error_message, stack_trace, context, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            userId,
            message.substring(0, 500),
            stack ? stack.substring(0, 2000) : null,
            JSON.stringify(context),
            ipAddress,
            userAgent ? userAgent.substring(0, 255) : null
        ]);

        // Log to server logger as well
        logger.error('Client Error:', {
            userId,
            message,
            context,
            ipAddress,
            userAgent
        });

        res.json({
            success: true,
            message: 'Error logged'
        });
    } catch (error) {
        // Don't fail if error logging fails
        logger.error('Failed to log client error:', error);
        res.json({
            success: true,
            message: 'Error received'
        });
    }
}));

/**
 * POST /api/client-analytics - Track client-side actions
 */
router.post('/analytics', optionalAuth, [
    body('action').notEmpty().withMessage('Action is required'),
    body('data').optional().isObject()
], catchAsync(async (req, res) => {
    const { action, data } = req.body;
    const userId = req.user?.id || null;

    try {
        const pool = mysqlPool();
        
        await pool.execute(`
            INSERT INTO client_analytics (user_id, action, data, ip_address)
            VALUES (?, ?, ?, ?)
        `, [
            userId,
            action,
            JSON.stringify(data),
            req.ip
        ]);

        res.json({ success: true });
    } catch (error) {
        logger.error('Failed to log client analytics:', error);
        res.json({ success: true });
    }
}));

/**
 * GET /api/client-errors - Get client errors (Admin only)
 */
router.get('/', optionalAuth, catchAsync(async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const pool = mysqlPool();
    const [errors] = await pool.execute(`
        SELECT ce.*, u.username, u.full_name
        FROM client_errors ce
        LEFT JOIN users u ON ce.user_id = u.id
        ORDER BY ce.created_at DESC
        LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM client_errors');

    // Parse context JSON
    errors.forEach(error => {
        try {
            error.context = JSON.parse(error.context);
        } catch (e) {
            error.context = {};
        }
    });

    res.json({
        success: true,
        data: {
            errors,
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
