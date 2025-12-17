/**
 * Reset Admin Password Script
 * Reset mật khẩu admin về mật khẩu mặc định: 12345678
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kho_mvg'
};

async function resetAdminPassword() {
    let connection;
    
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔐 RESET ADMIN PASSWORD - KHO MVG');
        console.log('='.repeat(80) + '\n');
        
        // Connect to database
        console.log('📡 Đang kết nối database...');
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Kết nối thành công\n');
        
        // New password
        const newPassword = process.env.DEFAULT_ADMIN_PASSWORD || '12345678';
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        // Check if admin exists
        const [users] = await connection.execute(
            'SELECT id, username, email FROM users WHERE username = ? OR role = ?',
            ['admin', 'admin']
        );
        
        if (users.length === 0) {
            // Create new admin user
            console.log('👤 Admin user chưa tồn tại, đang tạo mới...');
            await connection.execute(
                `INSERT INTO users (username, email, password_hash, full_name, role, permissions, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    'admin',
                    'admin@kho-mvg.com',
                    hashedPassword,
                    'System Administrator',
                    'admin',
                    JSON.stringify(['all']),
                    1
                ]
            );
            console.log('✅ Admin user đã được tạo mới');
        } else {
            // Update existing admin password
            const adminUser = users[0];
            console.log(`👤 Tìm thấy admin user: ${adminUser.username} (ID: ${adminUser.id})`);
            console.log('🔄 Đang reset mật khẩu...');
            
            await connection.execute(
                'UPDATE users SET password_hash = ?, is_active = 1 WHERE id = ?',
                [hashedPassword, adminUser.id]
            );
            
            console.log('✅ Mật khẩu đã được reset');
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('🔐 THÔNG TIN ĐĂNG NHẬP ADMIN:');
        console.log('='.repeat(80));
        console.log(`   Username: admin`);
        console.log(`   Password: ${newPassword}`);
        console.log('='.repeat(80) + '\n');
        
        console.log('✅ Hoàn tất! Bạn có thể đăng nhập với thông tin trên.\n');
        
    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n💡 Kiểm tra lại thông tin kết nối database trong file .env');
            console.log('   - DB_HOST');
            console.log('   - DB_USER');
            console.log('   - DB_PASSWORD');
            console.log('   - DB_NAME');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 MySQL server chưa chạy. Vui lòng khởi động MySQL.');
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run script
resetAdminPassword()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Lỗi nghiêm trọng:', error);
        process.exit(1);
    });

