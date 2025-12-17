/**
 * Add Sample Data for Testing
 * Thêm dữ liệu mẫu để kiểm thử các trang
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'kho_mvg',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function addSampleData() {
  const connection = await pool.getConnection();
  
  try {
    // Disable sample data insertion to keep DB clean
    console.log('⚠️ Sample data insertion is disabled. No data will be inserted.');
    return;

  } catch (error) {
    console.error('Error adding sample data:', error.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
    process.exit(0);
  }
}

addSampleData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
