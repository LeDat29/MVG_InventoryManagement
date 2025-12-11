/**
 * Server Entry Point - KHO MVG Management System
 * Hệ thống quản lý hỗ trợ kinh doanh các dự án kho xưởng
 * 
 * @description Khởi tạo server Express.js với cấu hình đầy đủ
 * @author KHO MVG Team
 * @version 1.0.0
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// Import configurations và middleware
const { connectMongoDB, connectMySQL } = require('./config/database');
const { initializeLogger, logger } = require('./config/logger');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

// Routes will be imported AFTER database connection is established

const app = express();
// Default to 5001 to match updated server configuration; can be overridden with PORT env var
const PORT = process.env.PORT || 5001;

/**
 * Khởi tạo logger system
 */
initializeLogger();

/**
 * Security và Performance Middleware
 */
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
            styleSrcElem: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "fonts.gstatic.com", "data:", "cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "maps.googleapis.com", "kit.fontawesome.com", "cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "blob:", "*.googleapis.com", "*.gstatic.com"],
            connectSrc: ["'self'", "*.googleapis.com", "kit.fontawesome.com"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
    },
    crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(generalLimiter);

/**
 * CORS Configuration cho PWA support
 * Replace static origin list with function-based origin handler to allow file:// (null origin) during development
 */
app.use(cors({
    origin: function(origin, callback) {
        // In development allow all origins (including file:// which gives null origin)
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        // In production restrict to configured domains
        const allowedOrigins = ['https://your-domain.com'];
        if (!origin) return callback(new Error('CORS policy: Origin header missing'), false);
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy: Origin not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Ensure preflight requests are handled
app.options('*', cors());

// Force JSON content-type for API routes to avoid accidental HTML responses
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// Quick test API to verify routing
app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'API routing works', timestamp: new Date().toISOString() });
});

/**
 * Body parsing middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Logging middleware
 */
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

/**
 * Static files serving - moved after API routes
 */

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV
    });
});

/**
 * PWA Service Worker - TEMPORARILY DISABLED
 */
// app.get('/sw.js', (req, res) => {
//     res.setHeader('Content-Type', 'application/javascript');
//     res.sendFile(path.resolve(__dirname, 'client/build/sw.js'));
// });

// Do not serve frontend here; frontend catch-all is registered after API routes inside startServer().

/**
 * Error handling middleware
 */
app.use(errorHandler);

/**
 * Database connections và server startup
 */
async function startServer() {
    try {
        // Auto-initialize database trước khi connect
        logger.info('🔧 Đang khởi tạo database...');
        const DatabaseAutoInit = require('./scripts/auto-init-db');
        const autoInit = new DatabaseAutoInit();
        const initSuccess = await autoInit.run();
        
        if (!initSuccess) {
            logger.error('❌ Không thể khởi tạo database');
            process.exit(1);
        }
        
        // Kết nối databases
        try {
            await connectMongoDB();
            logger.info('✅ MongoDB connected successfully');
        } catch (error) {
            logger.warn('⚠️  MongoDB không kết nối được, bỏ qua (optional)');
        }
        
        await connectMySQL();
        logger.info('✅ MySQL connected successfully');
        
        // NOW register routes AFTER database is connected
        logger.info('📋 Registering API routes...');
        const authRoutes = require('./routes/auth');
        const projectRoutes = require('./routes/projects');
        const customerRoutes = require('./routes/customers');
        const documentRoutes = require('./routes/documents');
        const apiDocsRoutes = require('./routes/apiDocs');
        const usersRoutes = require('./routes/users');
        const aiAssistantRoutes = require('./routes/ai-assistant');
        const clientErrorsRoutes = require('./routes/client-errors');
        
        app.use('/api/auth', authRoutes);
        app.use('/api/projects', authenticateToken, projectRoutes);
        app.use('/api/customers', authenticateToken, customerRoutes);
        app.use('/api/contracts', authenticateToken, require('./routes/contracts'));
        app.use('/api/contract-templates', authenticateToken, require('./routes/contract-templates'));
        app.use('/api/contract-documents', authenticateToken, require('./routes/contract-documents'));
        app.use('/api/documents', authenticateToken, documentRoutes);
        app.use('/api/users', authenticateToken, usersRoutes);
        app.use('/api/ai-assistant', require('./routes/ai-assistant'));
        app.use('/api/ai-configs', require('./routes/ai-assistant-configs'));
        app.use('/api/client-errors', clientErrorsRoutes);
        app.use('/api', require('./routes/metrics'));
        app.use('/api/docs', apiDocsRoutes);
        logger.info('✅ All API routes registered successfully');

        // Serve static files AFTER API routes to avoid conflicts
        app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
        app.use(express.static(path.join(__dirname, 'client/build')));
        
        // Handle React Router - catch all other routes and return index.html
        app.get('*', (req, res) => {
            // Don't intercept API routes
            if (req.path.startsWith('/api/')) {
                return res.status(404).json({ success: false, message: 'API endpoint not found' });
            }
            res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
        });
        
        // Khởi động server
        const server = app.listen(PORT, () => {
            logger.info(`🚀 KHO MVG Server đang chạy tại port ${PORT}`);
            logger.info(`📱 Environment: ${process.env.NODE_ENV}`);
            logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM nhận được, đang shutdown server...');
            server.close(() => {
                logger.info('Server đã đóng');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            logger.info('SIGINT nhận được, đang shutdown server...');
            server.close(() => {
                logger.info('Server đã đóng');
                process.exit(0);
            });
        });

    } catch (error) {
        logger.error('❌ Lỗi khởi động server:', error);
        process.exit(1);
    }
}

// Khởi động server
startServer();

module.exports = app;