#!/usr/bin/env node

/**
 * Comprehensive Test Runner and Auto-Fix Script for Customer Management
 * This script runs all tests, identifies issues, and provides fixes
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class CustomerManagementTestRunner {
    constructor() {
        this.results = {
            backend: { passed: 0, failed: 0, tests: [] },
            frontend: { passed: 0, failed: 0, tests: [] },
            integration: { passed: 0, failed: 0, tests: [] }
        };
        this.fixes = [];
        this.errors = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const emoji = {
            info: 'ℹ️',
            success: '✅', 
            error: '❌',
            warning: '⚠️',
            fix: '🔧'
        }[type] || 'ℹ️';
        
        console.log(`${timestamp} ${emoji} ${message}`);
    }

    // Backend API Tests
    async runBackendTests() {
        this.log('Starting Backend API Tests...', 'info');
        
        try {
            // Test database connection
            await this.testDatabaseConnection();
            
            // Test customer API endpoints
            await this.testCustomerEndpoints();
            
            // Test contract template endpoints
            await this.testContractTemplateEndpoints();
            
            // Test contract creation endpoints
            await this.testContractEndpoints();
            
            // Test authentication
            await this.testAuthentication();
            
            this.log('Backend tests completed', 'success');
            
        } catch (error) {
            this.log(`Backend tests failed: ${error.message}`, 'error');
            this.errors.push({ type: 'backend', error: error.message });
        }
    }

    async testDatabaseConnection() {
        this.log('Testing database connection...', 'info');
        
        try {
            const { connectMySQL, mysqlPool } = require('./config/database');
            await connectMySQL();
            const pool = mysqlPool();
            
            // Test basic query
            const [rows] = await pool.execute('SELECT 1 as test');
            if (rows[0].test === 1) {
                this.results.backend.passed++;
                this.results.backend.tests.push({ name: 'Database Connection', status: 'PASSED' });
                this.log('Database connection: PASSED', 'success');
            }
            
            // Test customers table
            const [customers] = await pool.execute('SELECT COUNT(*) as count FROM customers');
            this.results.backend.tests.push({ 
                name: 'Customers Table', 
                status: 'PASSED', 
                details: `${customers[0].count} customers found` 
            });
            
            // Test contracts table
            const [contracts] = await pool.execute('SELECT COUNT(*) as count FROM contracts');
            this.results.backend.tests.push({ 
                name: 'Contracts Table', 
                status: 'PASSED', 
                details: `${contracts[0].count} contracts found` 
            });
            
            // Test contract_templates table
            const [templates] = await pool.execute('SELECT COUNT(*) as count FROM contract_templates');
            this.results.backend.tests.push({ 
                name: 'Contract Templates Table', 
                status: 'PASSED', 
                details: `${templates[0].count} templates found` 
            });
            
            await pool.end();
            this.results.backend.passed += 3;
            
        } catch (error) {
            this.results.backend.failed++;
            this.results.backend.tests.push({ name: 'Database Connection', status: 'FAILED', error: error.message });
            this.log(`Database connection failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async testAuthentication() {
        this.log('Testing authentication...', 'info');
        
        try {
            const response = await fetch('http://localhost:5001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'admin123' })
            });
            
            const data = await response.json();
            
            if (data.success && data.data.token) {
                this.results.backend.passed++;
                this.results.backend.tests.push({ name: 'Authentication', status: 'PASSED' });
                this.log('Authentication: PASSED', 'success');
                return data.data.token;
            } else {
                throw new Error(`Authentication failed: ${data.message}`);
            }
            
        } catch (error) {
            this.results.backend.failed++;
            this.results.backend.tests.push({ name: 'Authentication', status: 'FAILED', error: error.message });
            this.log(`Authentication failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async testCustomerEndpoints() {
        this.log('Testing customer endpoints...', 'info');
        
        try {
            const token = await this.testAuthentication();
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            // Test GET customers
            const getResponse = await fetch('http://localhost:5001/api/customers', { headers });
            const getData = await getResponse.json();
            
            if (getData.success) {
                this.results.backend.passed++;
                this.results.backend.tests.push({ 
                    name: 'GET Customers', 
                    status: 'PASSED',
                    details: `${getData.data.customers?.length || 0} customers loaded`
                });
            } else {
                throw new Error('GET customers failed');
            }

            // Test GET individual customer
            if (getData.data.customers?.length > 0) {
                const customerId = getData.data.customers[0].id;
                const individualResponse = await fetch(`http://localhost:5001/api/customers/${customerId}`, { headers });
                const individualData = await individualResponse.json();
                
                if (individualData.success) {
                    this.results.backend.passed++;
                    this.results.backend.tests.push({ name: 'GET Individual Customer', status: 'PASSED' });
                } else {
                    throw new Error('GET individual customer failed');
                }
            }

            // Test CREATE customer
            const createData = {
                name: `Test Customer ${Date.now()}`,
                representative_name: 'Test Representative',
                phone: '0123456789',
                email: 'test@example.com',
                address: 'Test Address',
                tax_code: `TEST${Date.now()}`,
                representative_phone: '0123456789',
                representative_email: 'test@example.com',
                customer_type: 'company',
                notes: 'Test customer'
            };

            const createResponse = await fetch('http://localhost:5001/api/customers', {
                method: 'POST',
                headers,
                body: JSON.stringify(createData)
            });
            
            const createResult = await createResponse.json();
            
            if (createResult.success) {
                this.results.backend.passed++;
                this.results.backend.tests.push({ name: 'CREATE Customer', status: 'PASSED' });
                
                // Test UPDATE customer
                const updateData = { ...createData, name: 'Updated Test Customer' };
                const updateResponse = await fetch(`http://localhost:5001/api/customers/${createResult.data.id}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(updateData)
                });
                
                const updateResult = await updateResponse.json();
                
                if (updateResult.success) {
                    this.results.backend.passed++;
                    this.results.backend.tests.push({ name: 'UPDATE Customer', status: 'PASSED' });
                } else {
                    this.results.backend.failed++;
                    this.results.backend.tests.push({ 
                        name: 'UPDATE Customer', 
                        status: 'FAILED', 
                        error: updateResult.message 
                    });
                }
                
            } else {
                this.results.backend.failed++;
                this.results.backend.tests.push({ 
                    name: 'CREATE Customer', 
                    status: 'FAILED', 
                    error: createResult.message 
                });
            }

        } catch (error) {
            this.results.backend.failed++;
            this.results.backend.tests.push({ name: 'Customer Endpoints', status: 'FAILED', error: error.message });
            this.log(`Customer endpoints test failed: ${error.message}`, 'error');
        }
    }

    async testContractTemplateEndpoints() {
        this.log('Testing contract template endpoints...', 'info');
        
        try {
            const token = await this.testAuthentication();
            const headers = { 'Authorization': `Bearer ${token}` };

            const response = await fetch('http://localhost:5001/api/contract-templates', { headers });
            const data = await response.json();
            
            if (data.success && Array.isArray(data.data)) {
                this.results.backend.passed++;
                this.results.backend.tests.push({ 
                    name: 'GET Contract Templates', 
                    status: 'PASSED',
                    details: `${data.data.length} templates found`
                });
                
                // Test individual template
                if (data.data.length > 0) {
                    const templateId = data.data[0].id;
                    const individualResponse = await fetch(`http://localhost:5001/api/contract-templates/${templateId}`, { headers });
                    const individualData = await individualResponse.json();
                    
                    if (individualData.success) {
                        this.results.backend.passed++;
                        this.results.backend.tests.push({ name: 'GET Individual Template', status: 'PASSED' });
                    } else {
                        this.results.backend.failed++;
                        this.results.backend.tests.push({ 
                            name: 'GET Individual Template', 
                            status: 'FAILED', 
                            error: individualData.message 
                        });
                    }
                }
            } else {
                throw new Error('Contract templates endpoint failed');
            }
            
        } catch (error) {
            this.results.backend.failed++;
            this.results.backend.tests.push({ name: 'Contract Template Endpoints', status: 'FAILED', error: error.message });
            this.log(`Contract template endpoints test failed: ${error.message}`, 'error');
        }
    }

    async testContractEndpoints() {
        this.log('Testing contract endpoints...', 'info');
        
        try {
            const token = await this.testAuthentication();
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            // Get existing contracts
            const getResponse = await fetch('http://localhost:5001/api/contracts', { headers });
            const getData = await getResponse.json();
            
            if (getData.success) {
                this.results.backend.passed++;
                this.results.backend.tests.push({ 
                    name: 'GET Contracts', 
                    status: 'PASSED',
                    details: `${getData.data?.contracts?.length || 0} contracts found`
                });
                
                // Test individual contract if any exist
                if (getData.data?.contracts?.length > 0) {
                    const contractId = getData.data.contracts[0].id;
                    const individualResponse = await fetch(`http://localhost:5001/api/contracts/${contractId}`, { headers });
                    const individualData = await individualResponse.json();
                    
                    if (individualData.success) {
                        this.results.backend.passed++;
                        this.results.backend.tests.push({ name: 'GET Individual Contract', status: 'PASSED' });
                    } else {
                        this.results.backend.failed++;
                        this.results.backend.tests.push({ 
                            name: 'GET Individual Contract', 
                            status: 'FAILED', 
                            error: individualData.message 
                        });
                    }
                }
            } else {
                throw new Error('Contracts endpoint failed');
            }
            
        } catch (error) {
            this.results.backend.failed++;
            this.results.backend.tests.push({ name: 'Contract Endpoints', status: 'FAILED', error: error.message });
            this.log(`Contract endpoints test failed: ${error.message}`, 'error');
        }
    }

    // Frontend Tests
    async runFrontendTests() {
        this.log('Starting Frontend Tests...', 'info');
        
        try {
            // Check if client build exists
            await this.checkClientBuild();
            
            // Test customer service
            await this.testCustomerService();
            
            // Test component structure
            await this.testComponentStructure();
            
            this.log('Frontend tests completed', 'success');
            
        } catch (error) {
            this.log(`Frontend tests failed: ${error.message}`, 'error');
            this.errors.push({ type: 'frontend', error: error.message });
        }
    }

    async checkClientBuild() {
        this.log('Checking client build...', 'info');
        
        try {
            // Check if build directory exists
            if (fs.existsSync('./client/build')) {
                this.results.frontend.passed++;
                this.results.frontend.tests.push({ name: 'Client Build Exists', status: 'PASSED' });
            } else {
                this.results.frontend.failed++;
                this.results.frontend.tests.push({ name: 'Client Build Exists', status: 'FAILED', error: 'Build directory not found' });
                this.fixes.push({
                    issue: 'Client not built',
                    fix: 'Run: cd client && npm run build'
                });
            }
            
            // Check key files
            const keyFiles = [
                './client/src/services/customerService.js',
                './client/src/components/Customers/CustomerFormTabs.js',
                './client/src/pages/Customers/index.js'
            ];
            
            let filesFound = 0;
            keyFiles.forEach(file => {
                if (fs.existsSync(file)) {
                    filesFound++;
                } else {
                    this.results.frontend.tests.push({ 
                        name: `File Check: ${path.basename(file)}`, 
                        status: 'FAILED', 
                        error: 'File not found' 
                    });
                }
            });
            
            if (filesFound === keyFiles.length) {
                this.results.frontend.passed++;
                this.results.frontend.tests.push({ name: 'Key Files Present', status: 'PASSED' });
            } else {
                this.results.frontend.failed++;
                this.results.frontend.tests.push({ 
                    name: 'Key Files Present', 
                    status: 'FAILED', 
                    error: `${keyFiles.length - filesFound} files missing` 
                });
            }
            
        } catch (error) {
            this.results.frontend.failed++;
            this.results.frontend.tests.push({ name: 'Client Build Check', status: 'FAILED', error: error.message });
        }
    }

    async testCustomerService() {
        this.log('Testing customer service...', 'info');
        
        try {
            const serviceFile = './client/src/services/customerService.js';
            if (fs.existsSync(serviceFile)) {
                const content = fs.readFileSync(serviceFile, 'utf8');
                
                // Check for required methods
                const requiredMethods = ['getCustomers', 'getCustomer', 'updateCustomer', 'createCustomer'];
                let methodsFound = 0;
                
                requiredMethods.forEach(method => {
                    if (content.includes(method)) {
                        methodsFound++;
                    }
                });
                
                if (methodsFound === requiredMethods.length) {
                    this.results.frontend.passed++;
                    this.results.frontend.tests.push({ name: 'Customer Service Methods', status: 'PASSED' });
                } else {
                    this.results.frontend.failed++;
                    this.results.frontend.tests.push({ 
                        name: 'Customer Service Methods', 
                        status: 'FAILED', 
                        error: `${requiredMethods.length - methodsFound} methods missing` 
                    });
                }
                
                // Check for proper error handling
                if (content.includes('handleResponse') && content.includes('catch')) {
                    this.results.frontend.passed++;
                    this.results.frontend.tests.push({ name: 'Error Handling', status: 'PASSED' });
                } else {
                    this.results.frontend.failed++;
                    this.results.frontend.tests.push({ 
                        name: 'Error Handling', 
                        status: 'FAILED', 
                        error: 'Proper error handling not found' 
                    });
                }
            }
            
        } catch (error) {
            this.results.frontend.failed++;
            this.results.frontend.tests.push({ name: 'Customer Service Test', status: 'FAILED', error: error.message });
        }
    }

    async testComponentStructure() {
        this.log('Testing component structure...', 'info');
        
        try {
            const componentFile = './client/src/components/Customers/CustomerFormTabs.js';
            if (fs.existsSync(componentFile)) {
                const content = fs.readFileSync(componentFile, 'utf8');
                
                // Check for key React patterns
                const patterns = [
                    { name: 'useState hook', pattern: 'useState' },
                    { name: 'useEffect hook', pattern: 'useEffect' },
                    { name: 'Form handling', pattern: 'onSubmit\\|onClick' },
                    { name: 'Proper exports', pattern: 'export default' }
                ];
                
                let patternsFound = 0;
                patterns.forEach(({ name, pattern }) => {
                    if (new RegExp(pattern).test(content)) {
                        patternsFound++;
                        this.results.frontend.tests.push({ name: `Component: ${name}`, status: 'PASSED' });
                    } else {
                        this.results.frontend.tests.push({ 
                            name: `Component: ${name}`, 
                            status: 'FAILED', 
                            error: `${name} pattern not found` 
                        });
                    }
                });
                
                if (patternsFound === patterns.length) {
                    this.results.frontend.passed++;
                } else {
                    this.results.frontend.failed++;
                }
            }
            
        } catch (error) {
            this.results.frontend.failed++;
            this.results.frontend.tests.push({ name: 'Component Structure Test', status: 'FAILED', error: error.message });
        }
    }

    // Generate test report
    generateReport() {
        this.log('Generating test report...', 'info');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                backend: this.results.backend,
                frontend: this.results.frontend,
                total: {
                    passed: this.results.backend.passed + this.results.frontend.passed,
                    failed: this.results.backend.failed + this.results.frontend.failed
                }
            },
            fixes: this.fixes,
            errors: this.errors,
            details: this.results
        };
        
        // Save detailed report
        const reportFile = `./customer_management_test_report_${Date.now()}.json`;
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        // Console summary
        console.log('\n' + '='.repeat(80));
        console.log('🏁 CUSTOMER MANAGEMENT TEST REPORT');
        console.log('='.repeat(80));
        console.log(`📊 SUMMARY:`);
        console.log(`   ✅ Total Passed: ${report.summary.total.passed}`);
        console.log(`   ❌ Total Failed: ${report.summary.total.failed}`);
        console.log(`   📈 Success Rate: ${((report.summary.total.passed / (report.summary.total.passed + report.summary.total.failed)) * 100).toFixed(1)}%`);
        
        console.log(`\n📋 BACKEND TESTS:`);
        console.log(`   ✅ Passed: ${report.summary.backend.passed}`);
        console.log(`   ❌ Failed: ${report.summary.backend.failed}`);
        
        console.log(`\n📱 FRONTEND TESTS:`);
        console.log(`   ✅ Passed: ${report.summary.frontend.passed}`);
        console.log(`   ❌ Failed: ${report.summary.frontend.failed}`);
        
        if (this.fixes.length > 0) {
            console.log(`\n🔧 RECOMMENDED FIXES:`);
            this.fixes.forEach((fix, index) => {
                console.log(`   ${index + 1}. ${fix.issue}`);
                console.log(`      Fix: ${fix.fix}`);
            });
        }
        
        if (this.errors.length > 0) {
            console.log(`\n🐛 CRITICAL ERRORS:`);
            this.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.type.toUpperCase()}: ${error.error}`);
            });
        }
        
        console.log(`\n📄 Detailed report saved to: ${reportFile}`);
        console.log('='.repeat(80));
        
        return report;
    }

    // Main test runner
    async runAllTests() {
        this.log('🚀 Starting Comprehensive Customer Management Tests', 'info');
        console.log('='.repeat(80));
        
        try {
            // Check if server is running
            try {
                const healthCheck = await fetch('http://localhost:5001/api/health');
                this.log('Server is running', 'success');
            } catch (error) {
                this.log('⚠️ Warning: Server may not be running on port 5001', 'warning');
                this.fixes.push({
                    issue: 'Server not running',
                    fix: 'Start server with: npm start'
                });
            }
            
            // Run backend tests
            await this.runBackendTests();
            
            // Run frontend tests
            await this.runFrontendTests();
            
            // Generate and return report
            return this.generateReport();
            
        } catch (error) {
            this.log(`Test suite failed: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Main execution
if (require.main === module) {
    const runner = new CustomerManagementTestRunner();
    
    runner.runAllTests()
        .then(report => {
            process.exit(report.summary.total.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('Test runner failed:', error);
            process.exit(1);
        });
}

module.exports = CustomerManagementTestRunner;