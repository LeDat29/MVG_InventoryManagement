/**
 * Rate Limiter Middleware - KHO MVG
 * Giới hạn số lượng request để bảo vệ API
 * 
 * @description Middleware rate limiting với các rule khác nhau cho các endpoint
 */

const rateLimit = require('express-rate-limit');
const { logSecurityEvent } = require('../config/logger');

/**
 * Rate limiter cho API chung
 */
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 phút
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10000, // Tăng lên 10000 requests cho development
    message: {
        success: false,
        message: 'Quá nhiều requests, vui lòng thử lại sau'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // ALWAYS skip rate limit trong development mode
        if (process.env.NODE_ENV !== 'production') {
            return true;
        }
        return false;
    },
    handler: (req, res) => {
        logSecurityEvent('RATE_LIMIT_EXCEEDED', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            userId: req.user ? req.user.id : null
        }, 'medium');

        res.status(429).json({
            success: false,
            message: 'Quá nhiều requests, vui lòng thử lại sau'
        });
    }
});

/**
 * Rate limiter nghiêm ngặt cho login
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 10000, // Tăng lên 10000 login attempts cho development
    skipSuccessfulRequests: true,
    message: {
        success: false,
        message: 'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút'
    },
    skip: (req) => {
        // ALWAYS skip rate limit trong development mode
        if (process.env.NODE_ENV !== 'production') {
            return true;
        }
        return false;
    },
    handler: (req, res) => {
        logSecurityEvent('AUTH_RATE_LIMIT_EXCEEDED', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            requestBody: req.body.username || 'unknown'
        }, 'high');

        res.status(429).json({
            success: false,
            message: 'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút'
        });
    }
});

/**
 * Rate limiter cho file upload
 */
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 phút
    max: 10, // 10 uploads per minute
    message: {
        success: false,
        message: 'Quá nhiều file upload, vui lòng thử lại sau'
    }
});

module.exports = {
    generalLimiter,
    authLimiter,
    uploadLimiter
};