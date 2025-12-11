/**
 * Activity Logger Utility
 * Logs user activities for audit trail
 */

const { mysqlPool } = require('../config/database');

/**
 * Log user activity
 * @param {number} userId - ID of the user performing the action
 * @param {string} action - Action performed (CREATE, UPDATE, DELETE, etc.)
 * @param {string} resourceType - Type of resource (customer, contract, etc.)
 * @param {number} resourceId - ID of the resource affected
 * @param {string} ipAddress - IP address of the user
 * @param {string} userAgent - User agent string
 * @param {object} details - Additional details about the action
 */
async function logUserActivity(userId, action, resourceType, resourceId, ipAddress, userAgent, details = {}) {
    try {
        const pool = mysqlPool();
        
        await pool.execute(`
            INSERT INTO user_logs (
                user_id, action, resource_type, resource_id, 
                ip_address, user_agent, details, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            userId,
            action,
            resourceType,
            resourceId,
            ipAddress || 'unknown',
            userAgent || 'unknown',
            JSON.stringify(details)
        ]);
        
        console.log(`✅ Activity logged: ${action} on ${resourceType} ${resourceId} by user ${userId}`);
    } catch (error) {
        console.error('❌ Failed to log activity:', error.message);
        // Don't throw error to avoid breaking the main operation
    }
}

/**
 * Get user activity logs
 * @param {object} filters - Filter options
 * @returns {Promise<Array>} Array of activity logs
 */
async function getUserActivityLogs(filters = {}) {
    try {
        const pool = mysqlPool();
        
        let whereConditions = ['ul.id IS NOT NULL'];
        const queryParams = [];
        
        if (filters.userId) {
            whereConditions.push('ul.user_id = ?');
            queryParams.push(filters.userId);
        }
        
        if (filters.action) {
            whereConditions.push('ul.action = ?');
            queryParams.push(filters.action);
        }
        
        if (filters.resourceType) {
            whereConditions.push('ul.resource_type = ?');
            queryParams.push(filters.resourceType);
        }
        
        if (filters.dateFrom) {
            whereConditions.push('ul.created_at >= ?');
            queryParams.push(filters.dateFrom);
        }
        
        if (filters.dateTo) {
            whereConditions.push('ul.created_at <= ?');
            queryParams.push(filters.dateTo);
        }
        
        const limit = filters.limit || 100;
        const offset = filters.offset || 0;
        
        const [logs] = await pool.execute(`
            SELECT 
                ul.*,
                u.username,
                u.full_name
            FROM user_logs ul
            LEFT JOIN users u ON ul.user_id = u.id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY ul.created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset]);
        
        return logs;
    } catch (error) {
        console.error('❌ Failed to get activity logs:', error.message);
        return [];
    }
}

module.exports = {
    logUserActivity,
    getUserActivityLogs
};