/**
 * Dedicated API Server - KHO MVG
 * Chạy riêng biệt để tránh conflict với static files
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { mysqlPool } = require('./config/database');
const { connectMongoDB } = require('./config/database');
const { logger } = require('./config/logger');

const app = express();
const API_PORT = 5001;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5000', 'null'],
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Auth middleware
const { authenticateToken } = require('./middleware/auth');

async function startAPIServer() {
    try {
        console.log('🔧 Starting dedicated API server...');
        
        // Connect to database
        console.log('✅ MySQL pool ready');
        try {
            await connectMongoDB();
            console.log('✅ MongoDB connected');
        } catch (e) {
            console.log('⚠️  MongoDB not available, using MySQL only');
        }
        
        // Load routes
        const authRoutes = require('./routes/auth');
        const customerRoutes = require('./routes/customers');
        const contractRoutes = require('./routes/contracts');
        const usersRoutes = require('./routes/users');
        
        // Debug middleware - log all requests
        app.use((req, res, next) => {
            console.log(`📝 API Request: ${req.method} ${req.path}`);
            console.log(`📝 Headers:`, req.headers.authorization ? 'Has Auth' : 'No Auth');
            next();
        });
        
        // Register API routes
        app.use('/api/auth', authRoutes);
        app.use('/api/customers', authenticateToken, customerRoutes);
        app.use('/api/contracts', authenticateToken, contractRoutes);
        app.use('/api/users', authenticateToken, usersRoutes);
        
        // Test endpoint
        app.get('/api/test', (req, res) => {
            res.json({ 
                message: 'Dedicated API Server is working!', 
                timestamp: new Date(),
                port: API_PORT 
            });
        });
        
        // Health check
        app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                server: 'api-only',
                timestamp: new Date() 
            });
        });
        
        // Error handler
        app.use((err, req, res, next) => {
            console.error('❌ API Error:', err);
            res.status(500).json({ 
                success: false, 
                message: err.message,
                server: 'api-dedicated'
            });
        });
        
        // 404 handler
        app.use('*', (req, res) => {
            console.log(`❌ API 404: ${req.method} ${req.originalUrl}`);
            res.status(404).json({ 
                success: false, 
                message: `API endpoint not found: ${req.originalUrl}`,
                server: 'api-dedicated'
            });
        });
        
        // Start server
        app.listen(API_PORT, () => {
            console.log(`🚀 Dedicated API Server running on port ${API_PORT}`);
            console.log(`📚 Test endpoint: http://localhost:${API_PORT}/api/test`);
            console.log(`❤️  Health check: http://localhost:${API_PORT}/api/health`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start API server:', error);
        process.exit(1);
    }
}

startAPIServer();

module.exports = app;