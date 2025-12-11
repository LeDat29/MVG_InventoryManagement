// Test authentication directly to see error
const http = require('http');

function testAuthDirect() {
    const postData = JSON.stringify({
        username: 'admin',
        password: 'admin123'
    });

    const options = {
        hostname: 'localhost',
        port: 5001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    console.log('🔐 Testing auth directly...');

    const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers:`, res.headers);

        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log('Response body:', data);
            
            if (res.statusCode === 500) {
                console.log('❌ 500 Error - Server issue');
                console.log('Raw response:', data.substring(0, 500));
            } else {
                try {
                    const jsonData = JSON.parse(data);
                    console.log('✅ JSON Response:', JSON.stringify(jsonData, null, 2));
                } catch (e) {
                    console.log('❌ Parse error:', e.message);
                }
            }
        });
    });

    req.on('error', (e) => {
        console.log(`❌ Request error: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

testAuthDirect();