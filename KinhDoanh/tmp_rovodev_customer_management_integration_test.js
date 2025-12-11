/**
 * Customer Management Integration Test Suite
 * Run with: npm test -- tmp_rovodev_customer_management_integration_test.js
 */

const request = require('supertest');
const app = require('../server');

describe('Customer Management Integration Tests', () => {
    let authToken;
    let testCustomerId;
    let testContractId;

    // Setup and teardown
    beforeAll(async () => {
        console.log('🚀 Starting Customer Management Integration Tests');
        
        // Login and get auth token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'admin',
                password: 'admin123'
            });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.success).toBe(true);
        authToken = loginResponse.body.data.token;
        
        console.log('✅ Authentication setup complete');
    });

    afterAll(async () => {
        // Cleanup test data
        if (testCustomerId) {
            await request(app)
                .delete(`/api/customers/${testCustomerId}`)
                .set('Authorization', `Bearer ${authToken}`);
        }
        
        if (testContractId) {
            await request(app)
                .delete(`/api/contracts/${testContractId}`)
                .set('Authorization', `Bearer ${authToken}`);
        }
        
        console.log('🧹 Test cleanup complete');
    });

    describe('1. Authentication Tests', () => {
        test('should authenticate with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'admin',
                    password: 'admin123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.token).toBeDefined();
            expect(response.body.data.user).toBeDefined();
        });

        test('should reject invalid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'admin',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        test('should protect customer endpoints without token', async () => {
            const response = await request(app)
                .get('/api/customers');

            expect(response.status).toBe(401);
        });
    });

    describe('2. Customer CRUD Operations', () => {
        test('should get customers list', async () => {
            const response = await request(app)
                .get('/api/customers')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.customers).toBeDefined();
            expect(Array.isArray(response.body.data.customers)).toBe(true);
        });

        test('should get customers with pagination', async () => {
            const response = await request(app)
                .get('/api/customers?page=1&limit=5')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.pagination).toBeDefined();
            expect(response.body.data.pagination.page).toBe(1);
            expect(response.body.data.pagination.limit).toBe(5);
        });

        test('should create a new customer', async () => {
            const customerData = {
                name: `Integration Test Customer ${Date.now()}`,
                representative_name: 'Integration Test Rep',
                phone: '0123456789',
                email: 'integration@test.com',
                address: 'Integration Test Address',
                tax_code: `INT${Date.now()}`,
                representative_phone: '0123456789',
                representative_email: 'integration@test.com',
                customer_type: 'company',
                notes: 'Created by integration test'
            };

            const response = await request(app)
                .post('/api/customers')
                .set('Authorization', `Bearer ${authToken}`)
                .send(customerData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBeDefined();
            
            testCustomerId = response.body.data.id;
        });

        test('should reject invalid customer data', async () => {
            const invalidData = {
                // Missing required fields
                name: '',
                representative_name: '',
                phone: 'invalid-phone'
            };

            const response = await request(app)
                .post('/api/customers')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('should get individual customer details', async () => {
            if (!testCustomerId) {
                throw new Error('Test customer not created');
            }

            const response = await request(app)
                .get(`/api/customers/${testCustomerId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.customer).toBeDefined();
            expect(response.body.data.contracts).toBeDefined();
            expect(response.body.data.statistics).toBeDefined();
        });

        test('should update customer information', async () => {
            if (!testCustomerId) {
                throw new Error('Test customer not created');
            }

            const updateData = {
                name: `Updated Integration Test Customer ${Date.now()}`,
                representative_name: 'Updated Integration Test Rep',
                phone: '0987654321',
                email: 'updated.integration@test.com',
                address: 'Updated Integration Test Address',
                tax_code: `UPD${Date.now()}`,
                representative_phone: '0987654321',
                representative_email: 'updated.integration@test.com',
                customer_type: 'individual',
                notes: 'Updated by integration test'
            };

            const response = await request(app)
                .put(`/api/customers/${testCustomerId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('should search customers', async () => {
            const response = await request(app)
                .get('/api/customers?search=Integration')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('3. Contract Template Operations', () => {
        test('should get contract templates', async () => {
            const response = await request(app)
                .get('/api/contract-templates')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        test('should get individual contract template', async () => {
            // First get templates list to get an ID
            const listResponse = await request(app)
                .get('/api/contract-templates')
                .set('Authorization', `Bearer ${authToken}`);

            expect(listResponse.body.data.length).toBeGreaterThan(0);
            const templateId = listResponse.body.data[0].id;

            const response = await request(app)
                .get(`/api/contract-templates/${templateId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.variables).toBeDefined();
        });
    });

    describe('4. Contract Operations', () => {
        test('should create contract from customer and template', async () => {
            if (!testCustomerId) {
                throw new Error('Test customer not created');
            }

            // Get a template ID
            const templatesResponse = await request(app)
                .get('/api/contract-templates')
                .set('Authorization', `Bearer ${authToken}`);

            expect(templatesResponse.body.data.length).toBeGreaterThan(0);
            const templateId = templatesResponse.body.data[0].id;

            const contractData = {
                contract_title: `Integration Test Contract ${Date.now()}`,
                customer_id: testCustomerId,
                template_id: templateId,
                party_a_name: 'Test Company A',
                party_a_address: 'Test Address A',
                party_a_representative: 'Test Rep A',
                party_a_position: 'Manager',
                party_a_id_number: '123456789',
                party_b_name: 'Test Company B',
                party_b_address: 'Test Address B',
                party_b_representative: 'Test Rep B',
                party_b_position: 'Director',
                party_b_tax_code: 'TEST123',
                warehouse_location: 'Test Warehouse',
                warehouse_area: 100.0,
                rental_price: 5000000,
                deposit_amount: 10000000,
                service_fee: 500000,
                start_date: '2025-01-01',
                end_date: '2025-12-31',
                auto_renewal: true,
                renewal_period: 12,
                payment_cycle: 'monthly',
                payment_due_date: 5,
                payment_method: 'Bank Transfer',
                late_fee_percentage: 2.0,
                special_terms: 'Integration test contract',
                notes: 'Created by integration test',
                assigned_to: 1
            };

            const response = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(contractData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBeDefined();
            expect(response.body.data.contract_number).toBeDefined();
            
            testContractId = response.body.data.id;
        });

        test('should get contract details', async () => {
            if (!testContractId) {
                throw new Error('Test contract not created');
            }

            const response = await request(app)
                .get(`/api/contracts/${testContractId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.contract).toBeDefined();
        });
    });

    describe('5. Error Handling Tests', () => {
        test('should handle invalid customer ID', async () => {
            const response = await request(app)
                .get('/api/customers/99999')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        test('should handle invalid contract template ID', async () => {
            const response = await request(app)
                .get('/api/contract-templates/99999')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        test('should handle malformed JSON in requests', async () => {
            const response = await request(app)
                .post('/api/customers')
                .set('Authorization', `Bearer ${authToken}`)
                .set('Content-Type', 'application/json')
                .send('invalid json');

            expect(response.status).toBe(400);
        });

        test('should validate required fields', async () => {
            const response = await request(app)
                .put(`/api/customers/${testCustomerId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    representative_name: '',  // Required field empty
                    phone: 'invalid'         // Invalid format
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('6. Performance Tests', () => {
        test('should respond to customer list within acceptable time', async () => {
            const startTime = Date.now();
            
            const response = await request(app)
                .get('/api/customers')
                .set('Authorization', `Bearer ${authToken}`);
            
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            expect(response.status).toBe(200);
            expect(responseTime).toBeLessThan(3000); // 3 seconds max
        });

        test('should handle concurrent customer requests', async () => {
            const promises = Array.from({ length: 5 }, () =>
                request(app)
                    .get('/api/customers')
                    .set('Authorization', `Bearer ${authToken}`)
            );

            const responses = await Promise.all(promises);
            
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });
    });

    describe('7. Data Consistency Tests', () => {
        test('should maintain referential integrity in contracts', async () => {
            if (!testCustomerId || !testContractId) {
                throw new Error('Test data not available');
            }

            // Get customer details including contracts
            const customerResponse = await request(app)
                .get(`/api/customers/${testCustomerId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(customerResponse.status).toBe(200);
            
            // Check if our test contract appears in customer's contracts
            const customerContracts = customerResponse.body.data.contracts || [];
            const hasTestContract = customerContracts.some(contract => 
                contract.id === testContractId
            );

            expect(hasTestContract).toBe(true);
        });

        test('should return consistent data formats', async () => {
            const response = await request(app)
                .get('/api/customers')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            
            const customers = response.body.data.customers;
            if (customers.length > 0) {
                const customer = customers[0];
                
                // Check required fields exist and have correct types
                expect(typeof customer.id).toBe('number');
                expect(typeof customer.customer_code).toBe('string');
                expect(customer.created_at).toBeDefined();
                
                // Date fields should be valid dates or null
                if (customer.created_at) {
                    expect(new Date(customer.created_at)).toBeInstanceOf(Date);
                }
            }
        });
    });
});

// Additional manual test helpers
if (require.main === module) {
    console.log('🧪 Customer Management Test Suite');
    console.log('Run with: npm test -- tmp_rovodev_customer_management_integration_test.js');
    console.log('Or run specific test groups:');
    console.log('  npm test -- --grep "Authentication"');
    console.log('  npm test -- --grep "Customer CRUD"');
    console.log('  npm test -- --grep "Performance"');
}