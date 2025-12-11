/**
 * Clean Server Startup - KHO MVG
 * Bypasses potential Node.js configuration issues
 */

// Clear any problematic environment variables
delete process.env.npm_config_localstorage_file;

// Load environment variables
require('dotenv').config();

// Start the main server
console.log('🚀 Starting KHO MVG Server (Clean Mode)...');
console.log('📍 Environment:', process.env.NODE_ENV || 'development');

try {
    // Import and start the main server
    require('./server.js');
} catch (error) {
    console.error('❌ Server startup error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}