/**
 * Logger Configuration - KHO MVG
 * Hệ thống logging toàn diện với Winston
 * 
 * @description Quản lý logs cho toàn bộ hệ thống bao gồm:
 * - Application logs (info, error, debug)
 * - User activity logs
 * - API request/response logs
 * - Security logs
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Tạo thư mục logs nếu chưa tồn tại
const logDir = process.env.LOG_FILE_PATH || './logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }
        
        if (stack) {
            log += `\n${stack}`;
        }
        
        return log;
    })
);

// Console format cho development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${level}: ${message}`;
        
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta, null, 2)}`;
        }
        
        return log;
    })
);

let logger;

/**
 * Khởi tạo logger system
 */
function initializeLogger() {
    const transports = [
        // Console transport cho development
        new winston.transports.Console({
            level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
            format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat
        }),

        // File transport cho tất cả logs
        new winston.transports.File({
            filename: path.join(logDir, 'app.log'),
            level: 'info',
            format: logFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 10
        }),

        // File transport cho error logs
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            format: logFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),

        // File transport cho security logs
        new winston.transports.File({
            filename: path.join(logDir, 'security.log'),
            level: 'warn',
            format: logFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 10
        })
    ];

    logger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: logFormat,
        defaultMeta: {
            service: 'kho-mvg',
            version: '1.0.0'
        },
        transports,
        exceptionHandlers: [
            new winston.transports.File({ 
                filename: path.join(logDir, 'exceptions.log'),
                maxsize: 5242880,
                maxFiles: 3
            })
        ],
        rejectionHandlers: [
            new winston.transports.File({ 
                filename: path.join(logDir, 'rejections.log'),
                maxsize: 5242880,
                maxFiles: 3
            })
        ]
    });

    // Prevent winston from exiting on unhandled exceptions
    logger.exitOnError = false;

    return logger;
}

/**
 * Log user activities vào database
 * @param {number} userId - ID của user
 * @param {string} action - Hành động thực hiện
 * @param {string} resourceType - Loại resource (project, customer, contract...)
 * @param {number} resourceId - ID của resource
 * @param {string} ipAddress - Địa chỉ IP
 * @param {string} userAgent - User agent string
 * @param {object} details - Chi tiết bổ sung
 */
async function logUserActivity(userId, action, resourceType = null, resourceId = null, ipAddress = null, userAgent = null, details = {}) {
    try {
        const { mysqlPool } = require('./database');
        const pool = mysqlPool();
        
        if (pool) {
            await pool.execute(
                `INSERT INTO user_logs (user_id, action, resource_type, resource_id, ip_address, user_agent, details) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    action,
                    resourceType,
                    resourceId,
                    ipAddress,
                    userAgent,
                    JSON.stringify(details)
                ]
            );
        }

        // Log cũng vào winston
        logger.info('User activity', {
            userId,
            action,
            resourceType,
            resourceId,
            ipAddress,
            details
        });
    } catch (error) {
        logger.error('Failed to log user activity:', error);
    }
}

/**
 * Log security events
 * @param {string} event - Loại security event
 * @param {object} details - Chi tiết về event
 * @param {string} severity - Mức độ nghiêm trọng (low, medium, high, critical)
 */
function logSecurityEvent(event, details = {}, severity = 'medium') {
    const logData = {
        securityEvent: event,
        severity,
        timestamp: new Date().toISOString(),
        ...details
    };

    switch (severity) {
        case 'critical':
            logger.error('SECURITY CRITICAL', logData);
            break;
        case 'high':
            logger.error('SECURITY HIGH', logData);
            break;
        case 'medium':
            logger.warn('SECURITY MEDIUM', logData);
            break;
        case 'low':
        default:
            logger.info('SECURITY LOW', logData);
            break;
    }
}

/**
 * Log API requests/responses
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {number} responseTime - Response time in ms
 */
function logAPIRequest(req, res, responseTime) {
    const logData = {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user ? req.user.id : null
    };

    if (res.statusCode >= 400) {
        logger.warn('API Request Error', logData);
    } else {
        logger.info('API Request', logData);
    }
}

/**
 * Log database operations
 * @param {string} operation - Loại operation (SELECT, INSERT, UPDATE, DELETE)
 * @param {string} table - Tên bảng
 * @param {object} details - Chi tiết về operation
 * @param {number} userId - ID của user thực hiện
 */
function logDatabaseOperation(operation, table, details = {}, userId = null) {
    logger.info('Database Operation', {
        operation,
        table,
        userId,
        details,
        timestamp: new Date().toISOString()
    });
}

/**
 * Log file operations
 * @param {string} operation - Loại operation (upload, download, delete)
 * @param {string} filename - Tên file
 * @param {number} userId - ID của user
 * @param {object} details - Chi tiết bổ sung
 */
function logFileOperation(operation, filename, userId, details = {}) {
    logger.info('File Operation', {
        operation,
        filename,
        userId,
        details,
        timestamp: new Date().toISOString()
    });
}

/**
 * Log system events
 * @param {string} event - Loại system event
 * @param {object} details - Chi tiết về event
 */
function logSystemEvent(event, details = {}) {
    logger.info('System Event', {
        event,
        details,
        timestamp: new Date().toISOString()
    });
}

module.exports = {
    initializeLogger,
    logger: logger || console, // Fallback to console if logger not initialized
    logUserActivity,
    logSecurityEvent,
    logAPIRequest,
    logDatabaseOperation,
    logFileOperation,
    logSystemEvent
};