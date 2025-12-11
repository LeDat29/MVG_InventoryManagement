const mysql = require('mysql2/promise');

async function checkAdmin() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'kho_mvg'
        });
        
        const [users] = await conn.execute('SELECT id, username, email, role FROM users WHERE role = "admin"');
        console.log('Admin users found:', users.length);
        users.forEach(user => {
            console.log(`- ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
        });
        
        await conn.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkAdmin();