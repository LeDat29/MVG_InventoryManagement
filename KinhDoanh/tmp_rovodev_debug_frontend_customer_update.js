// Debug script để test frontend customer update workflow

console.log('🔍 DEBUGGING FRONTEND CUSTOMER UPDATE ISSUES');
console.log('='.repeat(60));

// Simulate the customer service call that's failing
const debugCustomerUpdate = async () => {
  try {
    console.log('1. 🔑 Checking authentication...');
    const token = localStorage.getItem('token');
    console.log('Token exists:', !!token);
    console.log('Token preview:', token ? token.substring(0, 30) + '...' : 'null');
    
    if (!token) {
      console.log('❌ No token found - authentication issue!');
      return;
    }
    
    console.log('2. 🧪 Testing API endpoint directly...');
    
    const testPayload = {
      name: "Frontend Debug Test",
      representative_name: "Debug Representative", 
      phone: "0123456789",
      email: "debug@test.com",
      address: "Debug Address",
      tax_code: "DEBUG123",
      representative_phone: "0123456789",
      representative_email: "debug@test.com",
      customer_type: "company",
      notes: "Frontend debug test"
    };
    
    console.log('Test payload:', testPayload);
    
    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
    console.log('API Base URL:', API_BASE);
    
    const response = await fetch(`${API_BASE}/customers/14`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('3. 📊 Response analysis...');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', response.headers);
    
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    if (response.ok) {
      console.log('✅ API call successful!');
      const data = JSON.parse(responseText);
      console.log('Parsed data:', data);
    } else {
      console.log('❌ API call failed!');
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', errorData);
      } catch (parseError) {
        console.log('Could not parse error response');
      }
    }
    
  } catch (error) {
    console.log('❌ Frontend error caught:');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    console.log('Error stack:', error.stack);
    
    // Check specific error types
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.log('🔍 Network/CORS issue detected');
    } else if (error.message.includes('JSON')) {
      console.log('🔍 JSON parsing issue detected');
    } else if (error.message.includes('token')) {
      console.log('🔍 Authentication issue detected');
    }
  }
};

// Execute the debug
debugCustomerUpdate();

// Also provide instructions for manual testing
console.log(`
📋 MANUAL TESTING INSTRUCTIONS:
1. Copy and paste this entire script into browser console
2. Run it and check the output
3. Look for specific error types and messages
4. Check Network tab during execution for actual HTTP requests

🔧 COMMON FIXES:
1. If token error: Re-login to get fresh token
2. If CORS error: Check API server is running on correct port
3. If 400 error: Check payload format matches backend expectations
4. If 500 error: Check server logs for backend errors

🎯 EXPECTED BEHAVIOR:
- Should see "✅ API call successful!" 
- Response should contain: {"success": true, "message": "..."}
`);

console.log('🎬 Debug script loaded. Check output above.');