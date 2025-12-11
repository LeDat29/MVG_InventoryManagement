/**
 * Error Handler Middleware - KHO MVG
 * Xử lý lỗi toàn cục cho ứng dụng
 * 
 * @description Middleware xử lý tất cả các lỗi trong ứng dụng
 * và trả về response phù hợp cho client
 */

const { logger, logSecurityEvent } = require('../config/logger');

/**
 * Custom Error Class
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Next middleware function
 */
function errorHandler(err, req, res, next) {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error('Error Handler:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userId: req.user ? req.user.id : null
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource không tìm thấy';
        error = new AppError(message, 404);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const value = Object.values(err.keyValue)[0];
        const message = `Dữ liệu '${value}' đã tồn tại`;
        error = new AppError(message, 400);
    }

    // MySQL duplicate entry
    if (err.code === 'ER_DUP_ENTRY') {
        const message = 'Dữ liệu đã tồn tại';
        error = new AppError(message, 400);
    }

    // MySQL foreign key constraint
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        const message = 'Dữ liệu tham chiếu không hợp lệ';
        error = new AppError(message, 400);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(val => val.message);
        const message = `Dữ liệu không hợp lệ: ${errors.join(', ')}`;
        error = new AppError(message, 400);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Token không hợp lệ';
        error = new AppError(message, 401);
        
        logSecurityEvent('INVALID_JWT_IN_ERROR', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl
        }, 'medium');
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token đã hết hạn';
        error = new AppError(message, 401);
    }

    // File upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        const message = 'File quá lớn';
        error = new AppError(message, 400);
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
        const message = 'Quá nhiều file';
        error = new AppError(message, 400);
    }

    // Database connection errors
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED') {
        const message = 'Lỗi kết nối database';
        error = new AppError(message, 500);
        
        logger.error('Database connection error:', err);
    }

    // Send error response
    sendErrorResponse(error, req, res);
}

/**
 * Send error response
 * @param {AppError} err - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function sendErrorResponse(err, req, res) {
    // Operational errors: send message to client
    if (err.isOperational) {
        res.status(err.statusCode || 500).json({
            success: false,
            message: err.message,
            ...(process.env.NODE_ENV === 'development' && {
                error: err,
                stack: err.stack
            })
        });
    } else {
        // Programming errors: log error, send generic message
        logger.error('Programming Error:', err);

        // Log potential security issues
        if (err.statusCode >= 500) {
            logSecurityEvent('SERVER_ERROR', {
                error: err.message,
                url: req.originalUrl,
                method: req.method,
                ip: req.ip,
                userId: req.user ? req.user.id : null
            }, 'high');
        }

        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi hệ thống',
            ...(process.env.NODE_ENV === 'development' && {
                error: err,
                stack: err.stack
            })
        });
    }
}

/**
 * Async error catcher wrapper
 * @param {function} fn - Async function
 * @returns {function} Express middleware function
 */
function catchAsync(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}

/**
 * 404 Handler
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Next middleware function
 */
function notFoundHandler(req, res, next) {
    const err = new AppError(`Route ${req.originalUrl} không tìm thấy`, 404);
    next(err);
}

module.exports = {
    AppError,
    errorHandler,
    catchAsync,
    notFoundHandler
};