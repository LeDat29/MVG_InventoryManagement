// Debug customer update error
const axios = require('axios');

async function testCustomerUpdateError() {
    console.log('🔍 Testing customer update to debug 400 error...');
    
    // Test data similar to what frontend might send
    const testUpdateData = {
        name: 'Test Company Updated',
        full_name: 'Nguyen Van A Updated', 
        representative_name: 'Nguyen Van A',
        phone: '0123456789',
        email: 'test@example.com',
        id_number: '123456789012',
        warehouse_purpose: 'Lưu trữ hàng hóa xuất nhập khẩu',
        address: 'Test Address',
        tax_code: '0123456789',
        customer_type: 'company',
        notes: 'Test notes',
        representative_phone: '0123456789',
        representative_email: 'test@example.com'
    };
    
    try {
        console.log('📤 Sending PUT request to update customer...');
        console.log('Data:', JSON.stringify(testUpdateData, null, 2));
        
        const response = await axios.put('http://localhost:5001/api/customers/19', testUpdateData, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000
        });
        
        console.log('✅ Success:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('❌ Server responded with error:');
            console.log('  Status:', error.response.status);
            console.log('  Status Text:', error.response.statusText);
            console.log('  Headers:', error.response.headers);
            console.log('  Response Data:', JSON.stringify(error.response.data, null, 2));
            
            // Check for validation errors specifically
            if (error.response.data && error.response.data.errors) {
                console.log('\n🔍 Validation Errors:');
                error.response.data.errors.forEach(err => {
                    console.log(`  - Field: ${err.path || err.param}, Error: ${err.msg}`);
                });
            }
            
        } else if (error.request) {
            console.log('❌ No response received:', error.request);
        } else {
            console.log('❌ Error setting up request:', error.message);
        }
    }
}

testCustomerUpdateError();