/**
 * Metrics Route - KHO MVG
 * API endpoint để thu thập và phân tích performance metrics
 */

const express = require('express');
const router = express.Router();
const { mysqlPool } = require('../config/database');
const { requireAuth, requirePermission } = require('../middleware/auth');

// Middleware để ghi log metrics
router.use('/metrics', (req, res, next) => {
  req.startTime = Date.now();
  next();
});

/**
 * POST /api/metrics
 * Thu thập performance metrics từ frontend
 */
router.post('/metrics', async (req, res) => {
  try {
    const { type, data } = req.body;
    const pool = mysqlPool();
    
    // Tạo bảng metrics nếu chưa tồn tại
    await createMetricsTables(pool);
    
    // Lưu metric vào database
    await pool.execute(`
      INSERT INTO performance_metrics 
      (metric_type, metric_data, user_agent, ip_address, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [
      type,
      JSON.stringify(data),
      req.get('User-Agent') || '',
      req.ip || req.connection.remoteAddress
    ]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving metric:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save metric' 
    });
  }
});

/**
 * GET /api/metrics/summary
 * Lấy tổng quan performance metrics (cần quyền admin)
 */
router.get('/summary', requireAuth, requirePermission('admin'), async (req, res) => {
  try {
    const pool = mysqlPool();
    const { timeframe = '24h' } = req.query;
    
    // Xác định thời gian
    let timeCondition = '';
    switch (timeframe) {
      case '1h':
        timeCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)';
        break;
      case '24h':
        timeCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
        break;
      case '7d':
        timeCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        timeCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      default:
        timeCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
    }
    
    // Lấy metrics summary
    const [pageLoadMetrics] = await pool.execute(`
      SELECT 
        COUNT(*) as total_loads,
        AVG(JSON_EXTRACT(metric_data, '$.loadTime')) as avg_load_time,
        MAX(JSON_EXTRACT(metric_data, '$.loadTime')) as max_load_time,
        AVG(JSON_EXTRACT(metric_data, '$.domReady')) as avg_dom_ready
      FROM performance_metrics 
      WHERE metric_type = 'pageLoad' AND ${timeCondition}
    `);
    
    const [apiCallMetrics] = await pool.execute(`
      SELECT 
        COUNT(*) as total_calls,
        AVG(JSON_EXTRACT(metric_data, '$.duration')) as avg_duration,
        MAX(JSON_EXTRACT(metric_data, '$.duration')) as max_duration,
        SUM(JSON_EXTRACT(metric_data, '$.success') = false) as error_count
      FROM performance_metrics 
      WHERE metric_type = 'apiCall' AND ${timeCondition}
    `);
    
    const [errorMetrics] = await pool.execute(`
      SELECT 
        COUNT(*) as total_errors,
        JSON_EXTRACT(metric_data, '$.message') as error_message,
        COUNT(*) as count
      FROM performance_metrics 
      WHERE metric_type = 'error' AND ${timeCondition}
      GROUP BY JSON_EXTRACT(metric_data, '$.message')
      ORDER BY count DESC
      LIMIT 10
    `);
    
    const [userActionMetrics] = await pool.execute(`
      SELECT 
        JSON_EXTRACT(metric_data, '$.action') as action,
        COUNT(*) as count
      FROM performance_metrics 
      WHERE metric_type = 'userAction' AND ${timeCondition}
      GROUP BY JSON_EXTRACT(metric_data, '$.action')
      ORDER BY count DESC
    `);
    
    // Server metrics
    const serverMetrics = await getServerMetrics(pool, timeCondition);
    
    res.json({
      success: true,
      data: {
        timeframe,
        pageLoad: pageLoadMetrics[0],
        apiCalls: apiCallMetrics[0],
        errors: {
          total: errorMetrics.length > 0 ? errorMetrics.reduce((sum, e) => sum + e.count, 0) : 0,
          topErrors: errorMetrics
        },
        userActions: userActionMetrics,
        server: serverMetrics,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting metrics summary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get metrics summary' 
    });
  }
});

/**
 * GET /api/metrics/dashboard
 * Dashboard metrics cho real-time monitoring
 */
router.get('/dashboard', requireAuth, requirePermission('admin'), async (req, res) => {
  try {
    const pool = mysqlPool();
    
    // Real-time metrics (last 5 minutes)
    const [realtimeMetrics] = await pool.execute(`
      SELECT 
        metric_type,
        COUNT(*) as count,
        AVG(CASE WHEN metric_type = 'apiCall' THEN JSON_EXTRACT(metric_data, '$.duration') END) as avg_api_duration,
        AVG(CASE WHEN metric_type = 'pageLoad' THEN JSON_EXTRACT(metric_data, '$.loadTime') END) as avg_load_time
      FROM performance_metrics 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
      GROUP BY metric_type
    `);
    
    // Active users (estimated from recent page loads)
    const [activeUsers] = await pool.execute(`
      SELECT COUNT(DISTINCT ip_address) as active_users
      FROM performance_metrics 
      WHERE metric_type = 'pageLoad' 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    `);
    
    // System health indicators
    const healthChecks = {
      database: await checkDatabaseHealth(pool),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: {
        realtime: realtimeMetrics,
        activeUsers: activeUsers[0].active_users,
        health: healthChecks
      }
    });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard metrics' 
    });
  }
});

/**
 * POST /api/metrics/alert
 * Tạo alert cho metrics vượt ngưỡng
 */
router.post('/alert', requireAuth, requirePermission('admin'), async (req, res) => {
  try {
    const { metricType, threshold, condition, email } = req.body;
    const pool = mysqlPool();
    
    // Alert functionality removed - metric_alerts table no longer exists
    // This endpoint is kept for API compatibility but does nothing
    
    res.json({ 
      success: true, 
      message: 'Alert endpoint disabled - metric_alerts functionality removed' 
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create alert' 
    });
  }
});

// Helper functions
async function createMetricsTables(pool) {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        metric_type VARCHAR(50) NOT NULL,
        metric_data JSON NOT NULL,
        user_agent TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_metric_type (metric_type),
        INDEX idx_created_at (created_at)
      )
    `);
    
    // Only performance_metrics table is needed now
    // metric_alerts table has been removed
    
    console.log('✅ Metrics tables created/verified');
  } catch (error) {
    console.error('Error creating metrics tables:', error);
  }
}

async function getServerMetrics(pool, timeCondition) {
  try {
    const [dbConnections] = await pool.execute('SHOW PROCESSLIST');
    const [dbSize] = await pool.execute(`
      SELECT 
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS total_size_mb,
        COUNT(*) as table_count
      FROM information_schema.tables 
      WHERE table_schema = 'kho_mvg'
    `);
    
    return {
      database: {
        connections: dbConnections.length,
        size_mb: dbSize[0].total_size_mb,
        tables: dbSize[0].table_count
      },
      nodejs: {
        memory: process.memoryUsage(),
        uptime: Math.floor(process.uptime()),
        version: process.version
      }
    };
  } catch (error) {
    console.error('Error getting server metrics:', error);
    return { error: 'Failed to get server metrics' };
  }
}

async function checkDatabaseHealth(pool) {
  try {
    const start = Date.now();
    await pool.execute('SELECT 1');
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: responseTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = router;