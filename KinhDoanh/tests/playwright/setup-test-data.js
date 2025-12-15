const axios = require('axios');

/**
 * Setup test data: create sample projects for E2E tests
 * Call this in test beforeAll to ensure test data exists
 */
async function setupTestData(baseApiUrl, authToken) {
  try {
    const headers = { 'Authorization': `Bearer ${authToken}` };
    
    // Create a sample project for testing
    const projectData = {
      name: 'Test Project E2E',
      description: 'Sample project created by E2E tests',
      status: 'active',
      province: 'HCM',
      address: '123 Test Street, HCM',
      latitude: 10.762622,
      longitude: 106.660172,
      area: 5000
    };

    try {
      const response = await axios.post(
        `${baseApiUrl}/projects`,
        projectData,
        { headers, timeout: 5000 }
      );
      console.log('✅ Test project created:', response.data.data?.id || 'ID unknown');
      return response.data.data?.id || 1;
    } catch (createErr) {
      // If project already exists (409) or other error, log and continue
      if (createErr.response?.status === 409) {
        console.log('⚠️  Test project already exists (409)');
      } else if (createErr.response?.status === 400) {
        console.log('⚠️  Skipping project creation (validation error - may lack required fields)');
      } else {
        console.warn('⚠️  Could not create test project:', createErr.message);
      }
      // Return default ID 1 anyway (assume it exists or test will gracefully skip if not)
      return 1;
    }
  } catch (err) {
    console.error('❌ Setup test data failed:', err.message);
    throw err;
  }
}

module.exports = { setupTestData };
