const fetch = require('node-fetch');
const mysql = require('mysql2/promise');

class TestChecker {
    constructor() {
        this.results = [];
        this.token = null;
    }

    log(test, status, message = '') {
        const result = { test, status, message, timestamp: new Date().toISOString() };
        this.results.push(result);
        const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${emoji} ${test}: ${status} ${message}`);
    }

    async testServerHealth() {
        try {
            const response = await fetch('http://localhost:5000/api/health');
            const data = await response.json();
            this.log('Server Health Check', data.status === 'OK' ? 'PASS' : 'FAIL', `Version: ${data.version}`);
            return data.status === 'OK';
        } catch (error) {
            this.log('Server Health Check', 'FAIL', error.message);
            return false;
        }
    }

    async testFrontendHealth() {
        try {
            const response = await fetch('http://localhost:3000');
            this.log('Frontend Health Check', response.status === 200 ? 'PASS' : 'FAIL', `Status: ${response.status}`);
            return response.status === 200;
        } catch (error) {
            this.log('Frontend Health Check', 'FAIL', error.message);
            return false;
        }
    }

    async testMySQLConnection() {
        try {
            const conn = await mysql.createConnection({
                host: 'localhost',
                user: 'root',
                password: '',
                database: 'kho_mvg'
            });
            
            const [tables] = await conn.execute('SHOW TABLES');
            await conn.end();
            
            this.log('MySQL Connection', 'PASS', `Found ${tables.length} tables`);
            return true;
        } catch (error) {
            this.log('MySQL Connection', 'FAIL', error.message);
            return false;
        }
    }

    async testLogin() {
        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'admin123' })
            });
            
            const data = await response.json();
            
            if (data.success && data.token) {
                this.token = data.token;
                this.log('Admin Login', 'PASS', 'Token received');
                return true;
            } else {
                this.log('Admin Login', 'FAIL', data.message || 'No token received');
                return false;
            }
        } catch (error) {
            this.log('Admin Login', 'FAIL', error.message);
            return false;
        }
    }

    async testUsersAPI() {
        if (!this.token) {
            this.log('Users API Test', 'SKIP', 'No valid token');
            return false;
        }

        try {
            const response = await fetch('http://localhost:5000/api/users', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.log('Users API', 'PASS', `Found ${data.data?.length || 0} users`);
                return true;
            } else {
                this.log('Users API', 'FAIL', data.message || 'API returned error');
                return false;
            }
        } catch (error) {
            this.log('Users API', 'FAIL', error.message);
            return false;
        }
    }

    async testAIConfig() {
        if (!this.token) {
            this.log('AI Config Test', 'SKIP', 'No valid token');
            return false;
        }

        try {
            const response = await fetch('http://localhost:5000/api/ai-assistant/providers', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.data?.free_providers) {
                const freeCount = data.data.free_providers.length;
                this.log('AI Config - Free Providers', freeCount >= 5 ? 'PASS' : 'WARN', `Found ${freeCount} free providers`);
                return freeCount >= 5;
            } else {
                this.log('AI Config - Free Providers', 'FAIL', 'No free providers found');
                return false;
            }
        } catch (error) {
            this.log('AI Config - Free Providers', 'FAIL', error.message);
            return false;
        }
    }

    async runFullTest() {
        console.log('🚀 STARTING FULL TEST CHECKLIST - KHO MVG');
        console.log('=' .repeat(60));
        
        // Infrastructure tests
        await this.testServerHealth();
        await this.testFrontendHealth();
        await this.testMySQLConnection();
        
        // Authentication tests
        await this.testLogin();
        
        // API tests
        await this.testUsersAPI();
        await this.testAIConfig();
        
        // Summary
        console.log('\n' + '=' .repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('=' .repeat(60));
        
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const warnings = this.results.filter(r => r.status === 'WARN').length;
        const skipped = this.results.filter(r => r.status === 'SKIP').length;
        
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⚠️  Warnings: ${warnings}`);
        console.log(`⏭️  Skipped: ${skipped}`);
        console.log(`📊 Total: ${this.results.length}`);
        
        if (failed === 0) {
            console.log('\n🎉 ALL CRITICAL TESTS PASSED! System is ready for use.');
        } else {
            console.log('\n🔧 Some tests failed. Please check the issues above.');
        }
        
        return { passed, failed, warnings, skipped, total: this.results.length };
    }
}

// Run the tests
const checker = new TestChecker();
checker.runFullTest().catch(console.error);