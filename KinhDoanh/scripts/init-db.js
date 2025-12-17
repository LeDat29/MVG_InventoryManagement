/**
 * Database Initialization Script - KHO MVG
 * Script khởi tạo cơ sở dữ liệu và dữ liệu demo
 */

require('dotenv').config();
const { connectMongoDB, connectMySQL, initializeDatabase } = require('../config/database');
const { createExtendedTables, initializeSchemaDocumentation, initializeAIFunctions } = require('../config/database-extended');
const { initializeLogger, logger } = require('../config/logger');
const bcrypt = require('bcryptjs');

// Initialize logger
initializeLogger();

/**
 * Tạo dữ liệu demo cho development
 */
async function createDemoData() {
    logger.info('⏭️ createDemoData skipped (no demo data will be inserted)');
    return;
    
}

/**
 * Main initialization function
 */
async function initializeSystem() {
    try {
        logger.info('🚀 Starting KHO MVG system initialization...');

        // Connect to databases
        logger.info('📡 Connecting to databases...');
        await connectMongoDB();
        logger.info('✅ MongoDB connected');

        await connectMySQL();
        logger.info('✅ MySQL connected');

        // Initialize database schemas
        logger.info('🗄️ Initializing database schemas...');
        await initializeDatabase();
        logger.info('✅ Database schemas initialized');

        // Initialize extended tables for User Management & AI
        logger.info('🚀 Creating extended tables for User Management & AI...');
        await createExtendedTables();
        logger.info('✅ Extended tables created');

        // Initialize database schema documentation for AI
        logger.info('📚 Initializing database schema documentation...');
        await initializeSchemaDocumentation();
        logger.info('✅ Schema documentation initialized');

        // Initialize AI function definitions
        logger.info('🤖 Initializing AI function definitions...');
        await initializeAIFunctions();
        logger.info('✅ AI functions initialized');

        // Skip creating demo data to keep DB clean
        logger.info('⏭️ Skipping demo data creation');

        logger.info('🎉 KHO MVG system initialization completed successfully!');
        logger.info('');
        logger.info('📋 Default Admin Account:');
        logger.info('   Username: admin');
        logger.info('   Password: 12345678');
        logger.info('');
        logger.info('🌐 Access the application at:');
        logger.info(`   Backend:  http://localhost:${process.env.PORT || 5000}`);
        logger.info(`   Frontend: http://localhost:3000`);
        logger.info(`   API Docs: http://localhost:${process.env.PORT || 5000}/api/docs`);
        logger.info('');

    } catch (error) {
        logger.error('❌ System initialization failed:', error);
        process.exit(1);
    } finally {
        // Close database connections
        const { closeDatabases } = require('../config/database');
        await closeDatabases();
        process.exit(0);
    }
}

// Run initialization if this script is executed directly
if (require.main === module) {
    initializeSystem();
}

module.exports = {
    initializeSystem,
    createDemoData
};