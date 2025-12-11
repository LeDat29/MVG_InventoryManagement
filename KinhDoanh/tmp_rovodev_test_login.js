const fetch = require('node-fetch');

async function testLogin() {
    try {
        console.log('🔐 Testing login with admin/admin123...');
        
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (data.success && data.token) {
            console.log('✅ Login successful!');
            console.log('Token:', data.token.substring(0, 20) + '...');
            
            // Test Users API with token
            console.log('\n👥 Testing Users API...');
            const usersResponse = await fetch('http://localhost:5000/api/users', {
                headers: {
                    'Authorization': `Bearer ${data.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const usersData = await usersResponse.json();
            console.log('Users API response:', usersData.success ? '✅ SUCCESS' : '❌ FAILED');
            if (usersData.data) {
                console.log(`Found ${usersData.data.length} users`);
            }
            
            return data.token;
        } else {
            console.log('❌ Login failed:', data.message);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

testLogin();