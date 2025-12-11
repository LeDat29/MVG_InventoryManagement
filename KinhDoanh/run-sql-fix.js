/**
 * Simple SQL Fix Runner
 * Run this: node run-sql-fix.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function runSQLFix() {
    console.log('🔧 SQL Fix Runner for Users API\n');
    
    try {
        // Ask for database credentials
        console.log('Enter your MySQL credentials:');
        const host = await question('Host (press Enter for localhost): ') || 'localhost';
        const user = await question('Username (press Enter for root): ') || 'root';
        const password = await question('Password (press Enter if none): ');
        const database = await question('Database (press Enter for kho_mvg): ') || 'kho_mvg';
        
        console.log('\n📡 Connecting to MySQL...');
        
        // Create connection
        const connection = await mysql.createConnection({
            host,
            user,
            password,
            database,
            multipleStatements: true
        });
        
        console.log('✅ Connected successfully!\n');
        
        // Read SQL file
        console.log('📄 Reading SQL file...');
        const sqlFile = fs.readFileSync('./tmp_rovodev_fix_users_error.sql', 'utf8');
        
        // Split into statements
        const statements = sqlFile
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        console.log(`Found ${statements.length} SQL statements\n`);
        
        // Execute each statement
        let successCount = 0;
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.toUpperCase().includes('CREATE TABLE')) {
                const tableName = statement.match(/CREATE TABLE.*?`?(\w+)`?/i)?.[1];
                console.log(`Creating table: ${tableName}...`);
                
                try {
                    await connection.execute(statement);
                    console.log(`✅ ${tableName} created`);
                    successCount++;
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        console.log(`⚠️  ${tableName} already exists (OK)`);
                        successCount++;
                    } else {
                        console.error(`❌ Error creating ${tableName}:`, error.message);
                    }
                }
            }
        }
        
        console.log(`\n✅ Success! ${successCount} tables processed\n`);
        
        // Verify tables
        console.log('🔍 Verifying tables...');
        const [tables] = await connection.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ? 
            AND table_name LIKE 'user%'
            ORDER BY table_name
        `, [database]);
        
        console.log('Tables found:');
        tables.forEach(t => {
            const name = t.table_name || t.TABLE_NAME;
            console.log(`  ✅ ${name}`);
        });
        
        await connection.end();
        console.log('\n🔌 Connection closed');
        
        console.log('\n🎉 SUCCESS! Now you can:');
        console.log('1. Restart your server: npm start');
        console.log('2. Test the Users page: http://localhost:3000/users');
        console.log('3. Should see user list without 500 error!');
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n💡 Solution: Check your MySQL password');
            console.log('   - Open .env file');
            console.log('   - Verify DB_PASSWORD is correct');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Solution: MySQL is not running');
            console.log('   - Start MySQL service');
            console.log('   - Check XAMPP/WAMP control panel');
        } else {
            console.log('\n💡 Alternative: Use phpMyAdmin');
            console.log('   1. Open: http://localhost/phpmyadmin');
            console.log('   2. Select database: kho_mvg');
            console.log('   3. Click SQL tab');
            console.log('   4. Paste content from: tmp_rovodev_fix_users_error.sql');
            console.log('   5. Click Go');
        }
    } finally {
        rl.close();
    }
}

// Run
console.log('\n' + '='.repeat(60));
console.log('         SQL FIX RUNNER - KHO MVG PROJECT');
console.log('='.repeat(60) + '\n');

runSQLFix();
