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
const fs = require('fs'); // Import fs module

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
 */
const corsOptions = {
    origin: function(origin, callback) {
        // In development allow all origins (including null origin for file://)
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        // In production restrict to configured domains
        const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://your-domain.com'];
        if (!origin) {
            // Allow requests with no origin (like mobile apps or curl requests)
            return callback(null, true);
        }
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy: Origin not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'Pragma',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
    ],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

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
async function startServer(options = { listen: true }) {
    try {
        logger.info('📋 Starting KHO MVG Server...');
        logger.info(`Current NODE_ENV: ${process.env.NODE_ENV}`);

        // Log NODE_ENV to a file for E2E test verification
        fs.writeFileSync(path.join(__dirname, 'temp_env.txt'), process.env.NODE_ENV);
        logger.info('✅ Server environment logged to temp_env.txt');

        // Auto-initialize database before connecting. Ensure test environment is seeded.
        logger.info('🔧 Đang khởi tạo database...');
        try {
            const DatabaseAutoInit = require('./scripts/auto-init-db');
            const autoInit = new DatabaseAutoInit();
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    logger.warn('⚠️  Database init timeout - continuing');
                    resolve(true);
                }, 5000);
            });
            const initPromise = autoInit.run();
            const initSuccess = await Promise.race([initPromise, timeoutPromise]);
            logger.info(`✅ Database initialization: ${initSuccess ? 'success' : 'skipped'}`);
        } catch (e) {
            logger.warn('⚠️  Auto-init script error:', e.message);
            logger.warn('⚠️  Auto-init script error:', e.message);
        }

        // Kết nối databases
        try {
            logger.info('🔄 Connecting to MongoDB...');
            await connectMongoDB();
            logger.info('✅ MongoDB initialization completed');
        } catch (error) {
            logger.warn('⚠️  MongoDB error:', error.message);
        }

        logger.info('🔄 Connecting to MySQL...');
        await connectMySQL();
        logger.info('✅ MySQL connected successfully');

        // Ensure tables exist in test environment
        if (process.env.NODE_ENV === 'test') {
            try {
                const { initializeDatabase } = require('./config/database');
                await initializeDatabase();
                logger.info('✅ Database tables initialized for test environment');
            } catch (initErr) {
                logger.warn('⚠️  Could not initialize database in test env:', initErr.message);
            }
        }

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

        // Register auth route
        app.use('/api/auth', authRoutes);

        // Always protect API routes with authentication middleware.
        // Tests should authenticate via real `/api/auth/login` and obtain a valid JWT.
        app.use('/api/projects', authenticateToken, projectRoutes);
        app.use('/api/customers', authenticateToken, customerRoutes);
        app.use('/api/contracts', authenticateToken, require('./routes/contracts'));
        app.use('/api/contract-templates', authenticateToken, require('./routes/contract-templates'));
        app.use('/api/contract-documents', authenticateToken, require('./routes/contract-documents'));
        app.use('/api/documents', authenticateToken, documentRoutes);
        app.use('/api/users', authenticateToken, usersRoutes);
        app.use('/api/client-errors', clientErrorsRoutes);
        app.use('/api', require('./routes/metrics'));

        app.use('/api/ai-assistant', aiAssistantRoutes);
        app.use('/api/ai-configs', require('./routes/ai-assistant-configs'));
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

        if (options.listen) {
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
                    process.exit(1);
                });
            });
        }

        // Print summary
        await (require('./scripts/auto-init-db')).prototype?.printSummary?.call?.({})
            .catch(() => {});

        return true;
    } catch (error) {
        logger.error('❌ Lỗi khởi động server:', error);
        if (process.env.NODE_ENV === 'test') {
            return false;
        }
        process.exit(1);
    }
}

// Register API routes function to be callable synchronously
let routesRegistered = false;
function registerRoutes() {
    if (routesRegistered) return;
    routesRegistered = true;

    logger.info('📋 Registering API routes (sync)...');
    const authRoutes = require('./routes/auth');
    const projectRoutes = require('./routes/projects');
    const customerRoutes = require('./routes/customers');
    const documentRoutes = require('./routes/documents');
    const apiDocsRoutes = require('./routes/apiDocs');
    const usersRoutes = require('./routes/users');
    const aiAssistantRoutes = require('./routes/ai-assistant');
    const clientErrorsRoutes = require('./routes/client-errors');

    // In test environment, inject test auth middleware to set req.user for routes
    if (process.env.NODE_ENV === 'test') {
        try {
            const { requireAuth } = require('./middleware/auth');
            app.use('/api', requireAuth);
            logger.info('✅ Test requireAuth middleware applied to /api');
        } catch (e) {
            logger.warn('Test requireAuth not available:', e.message);
        }
    }

    app.use('/api/auth', authRoutes);

    if (process.env.NODE_ENV === 'test') {
        app.use('/api/projects', projectRoutes);
        app.use('/api/customers', customerRoutes);
        app.use('/api/contracts', require('./routes/contracts'));
        app.use('/api/contract-templates', require('./routes/contract-templates'));
        app.use('/api/contract-documents', require('./routes/contract-documents'));
        app.use('/api/documents', documentRoutes);
        app.use('/api/users', usersRoutes);
        app.use('/api/client-errors', clientErrorsRoutes);
        app.use('/api', require('./routes/metrics'));
    } else {
        app.use('/api/projects', authenticateToken, projectRoutes);
        app.use('/api/customers', authenticateToken, customerRoutes);
        app.use('/api/contracts', authenticateToken, require('./routes/contracts'));
        app.use('/api/contract-templates', authenticateToken, require('./routes/contract-templates'));
        app.use('/api/contract-documents', authenticateToken, require('./routes/contract-documents'));
        app.use('/api/documents', authenticateToken, documentRoutes);
        app.use('/api/users', authenticateToken, usersRoutes);
        app.use('/api/client-errors', clientErrorsRoutes);
        app.use('/api', require('./routes/metrics'));
    }

    app.use('/api/ai-assistant', aiAssistantRoutes);
    app.use('/api/ai-configs', require('./routes/ai-assistant-configs'));
    app.use('/api/docs', apiDocsRoutes);
    logger.info('✅ All API routes registered successfully (sync)');
}

// Register routes synchronously so tests can hit endpoints immediately
// This is removed, as startServer() will handle route registration.

// existing startServer will also call registerRoutes but it's guarded

// export app
module.exports = app;
module.exports.startServer = startServer;

// If this file is executed directly (e.g. `node server.js`), start the server.
if (require.main === module) {
    
    (async () => {
        try {
            const ok = await startServer();
            if (!ok) {
                logger.error('❌ Server startup failed');
                process.exit(1);
            }
        } catch (err) {
            logger.error('❌ Fatal error starting server:', err);
            process.exit(1);
        }
    })();
}