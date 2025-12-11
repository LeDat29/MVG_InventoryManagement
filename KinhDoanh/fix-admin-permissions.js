/**
 * Fix Admin User Permissions
 * Sửa permissions field từ string sang JSON array
 */

const mysql = require('mysql2/promise');

async function fixAdminPermissions() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'kho_mvg'
        });

        console.log('✅ Connected to database');

        // Check current permissions
        const [users] = await connection.execute(
            'SELECT id, username, role, permissions FROM users WHERE username = ?',
            ['admin']
        );

        if (users.length === 0) {
            console.log('❌ Admin user not found');
            process.exit(1);
        }

        console.log('\n📋 Current admin user:');
        console.log(users[0]);
        console.log('\nCurrent permissions type:', typeof users[0].permissions);
        console.log('Current permissions value:', users[0].permissions);

        // Fix permissions to proper JSON array
        const correctPermissions = JSON.stringify(['all']);
        
        await connection.execute(
            'UPDATE users SET permissions = ? WHERE username = ?',
            [correctPermissions, 'admin']
        );

        console.log('\n✅ Updated permissions to:', correctPermissions);

        // Verify
        const [updated] = await connection.execute(
            'SELECT id, username, role, permissions FROM users WHERE username = ?',
            ['admin']
        );

        console.log('\n📋 Updated admin user:');
        console.log(updated[0]);
        console.log('\nNew permissions type:', typeof updated[0].permissions);
        console.log('New permissions value:', updated[0].permissions);
        
        // Test parsing
        try {
            const parsed = JSON.parse(updated[0].permissions);
            console.log('\n✅ Permissions can be parsed successfully:', parsed);
        } catch (e) {
            console.log('\n❌ Permissions still cannot be parsed:', e.message);
        }

        await connection.end();
        console.log('\n🎉 Done!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixAdminPermissions();
