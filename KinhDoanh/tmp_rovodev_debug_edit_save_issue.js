const { connectMySQL, mysqlPool } = require('./config/database');

async function debugEditSaveIssue() {
  await connectMySQL();
  const pool = mysqlPool();
  
  try {
    console.log('🔍 DEBUGGING CUSTOMER EDIT SAVE ISSUE');
    console.log('='.repeat(60));
    
    // Step 1: Get a test customer to edit
    console.log('1. 📋 Finding customer to test edit...');
    const [customers] = await pool.execute('SELECT * FROM customers LIMIT 1');
    
    if (customers.length === 0) {
      console.log('❌ No customers found for testing');
      return;
    }
    
    const testCustomer = customers[0];
    console.log('✅ Test customer found:');
    console.log('   ID:', testCustomer.id);
    console.log('   Name:', testCustomer.name);
    console.log('   Representative:', testCustomer.representative_name);
    console.log('   Phone:', testCustomer.phone);
    console.log('   Email:', testCustomer.email);
    
    // Step 2: Test the exact update scenario
    console.log('\n2. 🧪 Testing customer update with realistic data...');
    
    const updateData = {
      name: `Updated ${testCustomer.name}`,
      representative_name: `Updated ${testCustomer.representative_name || 'Rep'}`,
      phone: '0999888777', // Changed phone
      email: 'updated@debug.com', // Changed email
      address: 'Updated Address 123',
      tax_code: testCustomer.tax_code || 'DEBUG123',
      representative_phone: '0999888777',
      representative_email: 'updated@debug.com',
      customer_type: testCustomer.customer_type || 'company',
      notes: 'Updated by debug test'
    };
    
    console.log('Update data to send:');
    console.table(updateData);
    
    // Step 3: Test API call directly
    console.log('\n3. 🌐 Testing API call...');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjUzNTMwMTIsImV4cCI6MTc2NTk1NzgxMn0.rGhWiRs6WFPhjHSe2slWrDr363Ps7uxkiTMerqdQhhA';
    
    try {
      const apiResponse = await fetch(`http://localhost:5001/api/customers/${testCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      console.log('API Response Status:', apiResponse.status);
      console.log('API Response Headers:', Object.fromEntries(apiResponse.headers.entries()));
      
      const responseText = await apiResponse.text();
      console.log('API Response Body:', responseText);
      
      if (apiResponse.ok) {
        console.log('✅ API call successful');
        
        // Step 4: Verify changes in database
        console.log('\n4. 🔍 Verifying changes in database...');
        
        const [updatedCustomer] = await pool.execute('SELECT * FROM customers WHERE id = ?', [testCustomer.id]);
        
        if (updatedCustomer.length > 0) {
          const customer = updatedCustomer[0];
          console.log('Updated customer from database:');
          console.log('   Name:', customer.name, `(was: ${testCustomer.name})`);
          console.log('   Representative:', customer.representative_name, `(was: ${testCustomer.representative_name})`);
          console.log('   Phone:', customer.phone, `(was: ${testCustomer.phone})`);
          console.log('   Email:', customer.email, `(was: ${testCustomer.email})`);
          
          // Check if changes were actually saved
          const changes = {};
          if (customer.name !== testCustomer.name) changes.name = '✅ Changed';
          if (customer.representative_name !== testCustomer.representative_name) changes.representative_name = '✅ Changed';
          if (customer.phone !== testCustomer.phone) changes.phone = '✅ Changed';
          if (customer.email !== testCustomer.email) changes.email = '✅ Changed';
          
          console.log('\n📊 Change verification:');
          console.table(changes);
          
          if (Object.keys(changes).length > 0) {
            console.log('✅ Changes were saved to database successfully');
          } else {
            console.log('❌ No changes detected in database - UPDATE may have failed');
            
            // Debug: Check if UPDATE query is working
            console.log('\n🔧 Testing direct UPDATE query...');
            try {
              await pool.execute(
                'UPDATE customers SET notes = ? WHERE id = ?',
                [`Debug test at ${new Date().toISOString()}`, testCustomer.id]
              );
              console.log('✅ Direct UPDATE query successful');
            } catch (updateError) {
              console.log('❌ Direct UPDATE query failed:', updateError.message);
            }
          }
        }
      } else {
        console.log('❌ API call failed');
        try {
          const errorData = JSON.parse(responseText);
          console.log('Error details:', errorData);
        } catch (e) {
          console.log('Could not parse error response');
        }
      }
      
    } catch (fetchError) {
      console.log('❌ API fetch error:', fetchError.message);
    }
    
    // Step 5: Test frontend data transformation
    console.log('\n5. 📱 Testing frontend data transformation...');
    
    const frontendFormData = {
      personal: {
        customer_code: testCustomer.customer_code,
        customer_type: testCustomer.customer_type || 'company',
        full_name: 'Frontend Test Name',
        phone: '0888777666',
        email: 'frontend@test.com',
        address: 'Frontend Test Address',
        notes: 'Frontend test notes'
      },
      companies: [{
        id: null,
        tax_code: testCustomer.tax_code || 'FRONTEND123',
        company_name: 'Frontend Test Company',
        invoice_address: 'Frontend Invoice Address',
        warehouse_purpose: '',
        is_primary: true
      }],
      contracts: []
    };
    
    // Transform like frontend does
    const transformedData = {
      name: frontendFormData.companies[0].company_name || frontendFormData.personal.full_name || '',
      representative_name: frontendFormData.personal.full_name || '',
      phone: frontendFormData.personal.phone || '',
      email: frontendFormData.personal.email || '',
      address: frontendFormData.personal.address || frontendFormData.companies[0].invoice_address || '',
      customer_type: frontendFormData.personal.customer_type || 'individual',
      notes: frontendFormData.personal.notes || '',
      tax_code: frontendFormData.companies[0].tax_code || '',
      representative_phone: frontendFormData.personal.phone || '',
      representative_email: frontendFormData.personal.email || ''
    };
    
    console.log('Frontend form data transformation:');
    console.log('Original form data:');
    console.log(JSON.stringify(frontendFormData, null, 2));
    console.log('\nTransformed API data:');
    console.log(JSON.stringify(transformedData, null, 2));
    
    // Test with transformed data
    console.log('\n6. 🧪 Testing with frontend-transformed data...');
    
    try {
      const frontendApiResponse = await fetch(`http://localhost:5001/api/customers/${testCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transformedData)
      });
      
      const frontendResponseText = await frontendApiResponse.text();
      
      if (frontendApiResponse.ok) {
        console.log('✅ Frontend-style API call successful');
        
        // Verify changes
        const [finalCustomer] = await pool.execute('SELECT * FROM customers WHERE id = ?', [testCustomer.id]);
        const final = finalCustomer[0];
        
        console.log('Final verification:');
        console.log('   Name saved:', final.name === transformedData.name ? '✅' : '❌');
        console.log('   Phone saved:', final.phone === transformedData.phone ? '✅' : '❌');
        console.log('   Email saved:', final.email === transformedData.email ? '✅' : '❌');
        
      } else {
        console.log('❌ Frontend-style API call failed');
        console.log('Response:', frontendResponseText);
      }
      
    } catch (frontendError) {
      console.log('❌ Frontend API test error:', frontendError.message);
    }
    
    console.log('\n🎯 DIAGNOSIS COMPLETE');
    console.log('Check the results above to identify where the save issue occurs');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await pool.end();
  }
}

debugEditSaveIssue();