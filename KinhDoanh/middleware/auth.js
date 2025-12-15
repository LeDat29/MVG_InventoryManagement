/**
 * Authentication & Authorization Middleware - KHO MVG
 * Xác thực và phân quyền người dùng
 * 
 * @description Middleware xử lý JWT authentication và role-based authorization
 * Hỗ trợ logging đầy đủ các hoạt động xác thực
 */

const jwt = require('jsonwebtoken');
const { mysqlPool } = require('../config/database');
const { logger, logSecurityEvent, logUserActivity } = require('../config/logger');

/**
 * Middleware xác thực JWT token
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Next middleware function
 */
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            logSecurityEvent('MISSING_AUTH_TOKEN', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                url: req.originalUrl
            }, 'medium');

            return res.status(401).json({
                success: false,
                message: 'Token xác thực không được cung cấp'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Lấy thông tin user từ database
        const pool = mysqlPool();
        const [users] = await pool.execute(
            'SELECT id, username, email, full_name, role, permissions, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            logSecurityEvent('INVALID_USER_TOKEN', {
                userId: decoded.userId,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            }, 'high');

            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ'
            });
        }

        const user = users[0];

        // Kiểm tra user có bị vô hiệu hóa
        if (!user.is_active) {
            logSecurityEvent('DISABLED_USER_ACCESS', {
                userId: user.id,
                username: user.username,
                ip: req.ip
            }, 'high');

            return res.status(401).json({
                success: false,
                message: 'Tài khoản đã bị vô hiệu hóa'
            });
        }

        // Parse permissions từ JSON (MySQL2 có thể đã auto-parse)
        user.permissions = Array.isArray(user.permissions) 
            ? user.permissions 
            : (user.permissions ? JSON.parse(user.permissions) : []);

        // Gán user vào request object
        req.user = user;

        // Update last login
        await pool.execute(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            logSecurityEvent('INVALID_JWT_TOKEN', {
                error: error.message,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            }, 'high');

            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ'
            });
        }

        if (error.name === 'TokenExpiredError') {
            logSecurityEvent('EXPIRED_JWT_TOKEN', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            }, 'medium');

            return res.status(401).json({
                success: false,
                message: 'Token đã hết hạn'
            });
        }

        logger.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi xác thực'
        });
    }
}

/**
 * Middleware kiểm tra quyền theo role
 * @param {string[]} allowedRoles - Danh sách các role được phép
 * @returns {function} Middleware function
 */
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Chưa xác thực'
            });
        }

        const hasRole = allowedRoles.includes(req.user.role);
        
        if (!hasRole) {
            logSecurityEvent('UNAUTHORIZED_ROLE_ACCESS', {
                userId: req.user.id,
                username: req.user.username,
                userRole: req.user.role,
                requiredRoles: allowedRoles,
                url: req.originalUrl,
                method: req.method,
                ip: req.ip
            }, 'high');

            return res.status(403).json({
                success: false,
                message: 'Không có quyền truy cập'
            });
        }

        next();
    };
}

/**
 * Middleware kiểm tra quyền theo permission cụ thể
 * @param {string} permission - Permission cần kiểm tra
 * @returns {function} Middleware function
 */
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Chưa xác thực'
            });
        }

        // Admin có tất cả quyền
        if (req.user.role === 'admin' || req.user.permissions.includes('all')) {
            return next();
        }

        const hasPermission = req.user.permissions.includes(permission);
        
        if (!hasPermission) {
            logSecurityEvent('UNAUTHORIZED_PERMISSION_ACCESS', {
                userId: req.user.id,
                username: req.user.username,
                userPermissions: req.user.permissions,
                requiredPermission: permission,
                url: req.originalUrl,
                method: req.method,
                ip: req.ip
            }, 'high');

            return res.status(403).json({
                success: false,
                message: `Không có quyền: ${permission}`
            });
        }

        next();
    };
}

/**
 * Middleware kiểm tra quyền truy cập resource cụ thể
 * @param {string} resourceType - Loại resource (project, customer, contract...)
 * @param {string} paramName - Tên parameter chứa resource ID (mặc định 'id')
 * @returns {function} Middleware function
 */
function requireResourceAccess(resourceType, paramName = 'id') {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Chưa xác thực'
                });
            }

            // Admin có quyền truy cập tất cả
            if (req.user.role === 'admin') {
                return next();
            }

            const resourceId = req.params[paramName];
            if (!resourceId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID resource không hợp lệ'
                });
            }

            const pool = mysqlPool();
            let hasAccess = false;

            // Kiểm tra quyền dựa trên loại resource
            switch (resourceType) {
                case 'project':
                    // Manager có thể truy cập tất cả project
                    // Staff chỉ có thể truy cập project được assign
                    if (req.user.role === 'manager') {
                        hasAccess = true;
                    } else {
                        // Check project assignment from user_project_permissions table
                        const [assignments] = await pool.execute(
                            'SELECT COUNT(*) as count FROM user_project_permissions WHERE user_id = ? AND project_id = ?',
                            [req.user.id, resourceId]
                        );
                        hasAccess = assignments[0].count > 0;
                    }
                    break;

                case 'customer':
                    // Check customer assignment through projects
                    if (req.user.role === 'manager') {
                        hasAccess = true;
                    } else {
                        const [customerAccess] = await pool.execute(
                            `SELECT COUNT(DISTINCT p.customer_id) as count 
                             FROM user_project_permissions upp
                             JOIN projects p ON upp.project_id = p.id
                             WHERE upp.user_id = ? AND p.customer_id = ?`,
                            [req.user.id, resourceId]
                        );
                        hasAccess = customerAccess[0].count > 0;
                    }
                    break;

                default:
                    hasAccess = true; // Mặc định cho phép
            }

            if (!hasAccess) {
                logSecurityEvent('UNAUTHORIZED_RESOURCE_ACCESS', {
                    userId: req.user.id,
                    username: req.user.username,
                    resourceType,
                    resourceId,
                    url: req.originalUrl,
                    method: req.method,
                    ip: req.ip
                }, 'medium');

                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền truy cập resource này'
                });
            }

            next();
        } catch (error) {
            logger.error('Resource access check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi kiểm tra quyền truy cập'
            });
        }
    };
}

/**
 * Middleware optional authentication (không bắt buộc phải đăng nhập)
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const pool = mysqlPool();
                const [users] = await pool.execute(
                    'SELECT id, username, email, full_name, role, permissions, is_active FROM users WHERE id = ?',
                    [decoded.userId]
                );

                if (users.length > 0 && users[0].is_active) {
                    const user = users[0];
                    user.permissions = Array.isArray(user.permissions) 
                        ? user.permissions 
                        : (user.permissions ? JSON.parse(user.permissions) : []);
                    req.user = user;
                }
            } catch (tokenError) {
                // Token không hợp lệ, nhưng không trả lỗi
                req.user = null;
            }
        }

        next();
    } catch (error) {
        logger.error('Optional auth error:', error);
        next();
    }
}

// Alias for authenticateToken (for compatibility)
let requireAuth;
if (process.env.NODE_ENV === 'test') {
    // In test environment, bypass authentication at route-level and inject a default admin user
    requireAuth = (req, res, next) => {
        req.user = {
            id: 1,
            username: 'test_admin',
            email: 'test@local',
            full_name: 'Test Admin',
            role: 'admin',
            permissions: ['all'],
            is_active: 1
        };
        return next();
    };
} else {
    requireAuth = authenticateToken;
}

module.exports = {
    authenticateToken,
    requireAuth,
    requireRole,
    requirePermission,
    requireResourceAccess,
    logUserActivity,
    optionalAuth
};