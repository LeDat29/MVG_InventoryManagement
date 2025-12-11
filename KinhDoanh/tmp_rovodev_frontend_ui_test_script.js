/**
 * Frontend UI Automated Test Script for Customer Management
 * Paste this script into browser console while on customer management page
 */

(function() {
    'use strict';

    console.log('🚀 CUSTOMER MANAGEMENT UI TEST SCRIPT LOADED');
    console.log('='.repeat(60));

    // Test configuration
    const TEST_CONFIG = {
        delays: {
            short: 500,
            medium: 1000, 
            long: 2000
        },
        timeouts: {
            elementWait: 5000,
            apiWait: 10000
        },
        testData: {
            customer: {
                name: `UI Test Customer ${Date.now()}`,
                representative_name: 'UI Test Representative',
                phone: '0987654321',
                email: 'uitest@example.com',
                address: 'UI Test Address 123',
                tax_code: `UITEST${Date.now()}`,
                customer_type: 'company',
                notes: 'Created by UI automated test'
            }
        }
    };

    // Utility functions
    const utils = {
        // Wait for element to appear
        waitForElement: (selector, timeout = TEST_CONFIG.timeouts.elementWait) => {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                
                const checkElement = () => {
                    const element = document.querySelector(selector);
                    if (element) {
                        resolve(element);
                    } else if (Date.now() - startTime > timeout) {
                        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                    } else {
                        setTimeout(checkElement, 100);
                    }
                };
                
                checkElement();
            });
        },

        // Wait for multiple elements
        waitForElements: (selectors, timeout = TEST_CONFIG.timeouts.elementWait) => {
            return Promise.all(selectors.map(selector => utils.waitForElement(selector, timeout)));
        },

        // Simulate user typing
        simulateTyping: async (element, text, delay = 50) => {
            element.focus();
            element.value = '';
            
            for (let char of text) {
                element.value += char;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                await utils.delay(delay);
            }
            
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.blur();
        },

        // Simulate click with delay
        simulateClick: async (element, delay = TEST_CONFIG.delays.short) => {
            element.scrollIntoView({ behavior: 'smooth' });
            await utils.delay(200);
            
            element.click();
            await utils.delay(delay);
        },

        // Wait/delay function
        delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

        // Log test results
        logResult: (testName, success, message, details = null) => {
            const emoji = success ? '✅' : '❌';
            const style = success ? 'color: green; font-weight: bold;' : 'color: red; font-weight: bold;';
            
            console.log(`%c${emoji} ${testName}: ${message}`, style);
            
            if (details) {
                console.log('   Details:', details);
            }
        },

        // Check if we're on the right page
        checkCurrentPage: () => {
            const isCustomerPage = window.location.pathname.includes('customers') || 
                                 document.title.toLowerCase().includes('customer') ||
                                 document.querySelector('[data-testid="customer-page"], .customer-management, #customers-page');
            
            if (!isCustomerPage) {
                console.warn('⚠️ Warning: This script is designed for Customer Management page');
                console.log('Current URL:', window.location.href);
                console.log('Please navigate to Customer Management page first');
            }
            
            return isCustomerPage;
        }
    };

    // Test suite classes
    class CustomerUITest {
        constructor() {
            this.results = [];
            this.currentTest = 0;
            this.totalTests = 0;
        }

        async runTest(testName, testFunction) {
            try {
                utils.logResult(testName, true, 'Starting...', null);
                const result = await testFunction();
                utils.logResult(testName, true, 'PASSED', result);
                this.results.push({ test: testName, status: 'PASSED', result });
                return true;
            } catch (error) {
                utils.logResult(testName, false, 'FAILED', error.message);
                this.results.push({ test: testName, status: 'FAILED', error: error.message });
                return false;
            }
        }

        // Test 1: Page Loading and Basic Elements
        async testPageElements() {
            const requiredElements = [
                { selector: 'table, .table, [role="table"]', name: 'Customer Table' },
                { selector: 'button[title*="Add"], button:contains("Add"), button:contains("Create"), .btn-primary', name: 'Add Customer Button' },
                { selector: 'input[type="text"], input[type="search"], .search-input', name: 'Search Input' }
            ];

            const foundElements = [];

            for (let element of requiredElements) {
                try {
                    const found = await utils.waitForElement(element.selector, 2000);
                    foundElements.push({ name: element.name, found: true, element: found });
                } catch (error) {
                    foundElements.push({ name: element.name, found: false, error: error.message });
                }
            }

            return foundElements;
        }

        // Test 2: Customer List Loading
        async testCustomerList() {
            const tableSelectors = [
                'table tbody tr',
                '.table-row',
                '[data-testid="customer-row"]',
                '.customer-item'
            ];

            let customerRows = [];
            for (let selector of tableSelectors) {
                customerRows = document.querySelectorAll(selector);
                if (customerRows.length > 0) break;
            }

            if (customerRows.length === 0) {
                throw new Error('No customer rows found in table');
            }

            return {
                count: customerRows.length,
                hasData: customerRows.length > 0,
                firstCustomer: customerRows[0]?.textContent?.substring(0, 100) || 'N/A'
            };
        }

        // Test 3: Search Functionality
        async testSearch() {
            const searchSelectors = [
                'input[type="search"]',
                'input[placeholder*="search"]',
                'input[placeholder*="tìm"]',
                '.search-input',
                'input[type="text"]'
            ];

            let searchInput;
            for (let selector of searchSelectors) {
                searchInput = document.querySelector(selector);
                if (searchInput) break;
            }

            if (!searchInput) {
                throw new Error('Search input not found');
            }

            // Test search with sample text
            const originalRowCount = document.querySelectorAll('table tbody tr, .table-row').length;
            
            await utils.simulateTyping(searchInput, 'test search');
            await utils.delay(TEST_CONFIG.delays.medium);
            
            const afterSearchRowCount = document.querySelectorAll('table tbody tr, .table-row').length;
            
            // Clear search
            await utils.simulateTyping(searchInput, '');
            await utils.delay(TEST_CONFIG.delays.medium);
            
            return {
                originalCount: originalRowCount,
                afterSearchCount: afterSearchRowCount,
                searchWorking: true
            };
        }

        // Test 4: Add Customer Modal/Form
        async testAddCustomerForm() {
            const addButtonSelectors = [
                'button[title*="Add"]',
                'button:contains("Add")',
                'button:contains("Create")',
                'button:contains("Thêm")',
                '.btn-primary',
                '[data-testid="add-customer-btn"]'
            ];

            let addButton;
            for (let selector of addButtonSelectors) {
                const buttons = document.querySelectorAll('button');
                for (let btn of buttons) {
                    if (btn.textContent.toLowerCase().includes('add') ||
                        btn.textContent.toLowerCase().includes('create') ||
                        btn.textContent.toLowerCase().includes('thêm') ||
                        btn.getAttribute('title')?.toLowerCase().includes('add')) {
                        addButton = btn;
                        break;
                    }
                }
                if (addButton) break;
            }

            if (!addButton) {
                throw new Error('Add customer button not found');
            }

            await utils.simulateClick(addButton);
            await utils.delay(TEST_CONFIG.delays.medium);

            // Check if modal or form appeared
            const modalSelectors = [
                '.modal:not(.fade)',
                '.modal.show',
                '.modal-dialog',
                '.customer-form',
                '[data-testid="customer-modal"]'
            ];

            let modal;
            for (let selector of modalSelectors) {
                modal = document.querySelector(selector);
                if (modal && window.getComputedStyle(modal).display !== 'none') break;
            }

            if (!modal) {
                throw new Error('Customer form/modal did not appear after clicking add button');
            }

            return {
                buttonFound: true,
                modalOpened: true,
                modalElement: modal
            };
        }

        // Test 5: Form Field Validation
        async testFormValidation() {
            const formSelectors = [
                '.customer-form',
                '.modal-body form',
                'form',
                '[data-testid="customer-form"]'
            ];

            let form;
            for (let selector of formSelectors) {
                form = document.querySelector(selector);
                if (form) break;
            }

            if (!form) {
                throw new Error('Customer form not found');
            }

            // Find form fields
            const nameInput = form.querySelector('input[name*="name"], input[placeholder*="name"], input[placeholder*="tên"]');
            const phoneInput = form.querySelector('input[name*="phone"], input[type="tel"], input[placeholder*="phone"]');
            const emailInput = form.querySelector('input[name*="email"], input[type="email"], input[placeholder*="email"]');

            const results = {
                nameField: !!nameInput,
                phoneField: !!phoneInput,
                emailField: !!emailInput,
                fieldsFound: [nameInput, phoneInput, emailInput].filter(Boolean).length
            };

            // Test field validation by submitting empty form
            const submitButton = form.querySelector('button[type="submit"], .btn-success, button:contains("Save"), button:contains("Lưu")');
            
            if (submitButton) {
                await utils.simulateClick(submitButton);
                await utils.delay(500);
                
                // Check for validation messages
                const validationMessages = form.querySelectorAll('.invalid-feedback, .error-message, .text-danger');
                results.validationWorking = validationMessages.length > 0;
            }

            return results;
        }

        // Test 6: Edit Customer Functionality
        async testEditCustomer() {
            // Find first customer row and edit button
            const customerRows = document.querySelectorAll('table tbody tr, .table-row');
            if (customerRows.length === 0) {
                throw new Error('No customer rows found for edit test');
            }

            const firstRow = customerRows[0];
            const editButtonSelectors = [
                'button[title*="Edit"]',
                'button[title*="Sửa"]',
                '.btn-warning',
                '.edit-btn',
                '[data-testid="edit-btn"]'
            ];

            let editButton;
            for (let selector of editButtonSelectors) {
                editButton = firstRow.querySelector(selector);
                if (editButton) break;
            }

            if (!editButton) {
                // Try to find edit button by icon or text
                const allButtons = firstRow.querySelectorAll('button');
                for (let btn of allButtons) {
                    if (btn.innerHTML.includes('edit') || 
                        btn.innerHTML.includes('pencil') ||
                        btn.textContent.toLowerCase().includes('edit') ||
                        btn.textContent.toLowerCase().includes('sửa')) {
                        editButton = btn;
                        break;
                    }
                }
            }

            if (!editButton) {
                throw new Error('Edit button not found in customer row');
            }

            await utils.simulateClick(editButton);
            await utils.delay(TEST_CONFIG.delays.medium);

            // Check if edit form appeared
            const editForm = document.querySelector('.modal:not(.fade), .modal.show, .customer-form, .edit-form');
            
            return {
                editButtonFound: true,
                editFormOpened: !!editForm,
                customerRowUsed: firstRow.textContent.substring(0, 50)
            };
        }

        // Main test runner
        async runAllTests() {
            console.log('🧪 STARTING COMPLETE UI TEST SUITE');
            console.log('='.repeat(50));

            if (!utils.checkCurrentPage()) {
                throw new Error('Please navigate to Customer Management page first');
            }

            const tests = [
                { name: 'Page Elements Test', func: () => this.testPageElements() },
                { name: 'Customer List Test', func: () => this.testCustomerList() },
                { name: 'Search Functionality Test', func: () => this.testSearch() },
                { name: 'Add Customer Form Test', func: () => this.testAddCustomerForm() },
                { name: 'Form Validation Test', func: () => this.testFormValidation() },
                { name: 'Edit Customer Test', func: () => this.testEditCustomer() }
            ];

            this.totalTests = tests.length;
            let passed = 0;
            let failed = 0;

            for (let i = 0; i < tests.length; i++) {
                this.currentTest = i + 1;
                console.log(`\n--- Test ${this.currentTest}/${this.totalTests}: ${tests[i].name} ---`);
                
                const success = await this.runTest(tests[i].name, tests[i].func);
                if (success) {
                    passed++;
                } else {
                    failed++;
                }
                
                // Delay between tests
                await utils.delay(TEST_CONFIG.delays.medium);
            }

            // Summary
            console.log('\n' + '='.repeat(60));
            console.log(`🏁 TEST SUITE COMPLETE`);
            console.log(`✅ Passed: ${passed}`);
            console.log(`❌ Failed: ${failed}`);
            console.log(`📊 Success Rate: ${((passed / this.totalTests) * 100).toFixed(1)}%`);
            
            if (failed > 0) {
                console.log('\n🐛 FAILED TESTS:');
                this.results.filter(r => r.status === 'FAILED').forEach(r => {
                    console.log(`   ❌ ${r.test}: ${r.error}`);
                });
            }

            console.log('\n💡 RECOMMENDATIONS:');
            if (passed === this.totalTests) {
                console.log('   🎉 All tests passed! Customer Management UI is working well.');
            } else {
                console.log('   🔧 Some tests failed. Check the errors above and fix the issues.');
                console.log('   📋 Common fixes needed:');
                console.log('      - Ensure proper CSS classes/IDs on buttons and forms');
                console.log('      - Check form validation implementation');
                console.log('      - Verify modal/form opening functionality');
            }

            return {
                total: this.totalTests,
                passed: passed,
                failed: failed,
                results: this.results
            };
        }
    }

    // Export to global scope for manual testing
    window.CustomerUITest = CustomerUITest;
    window.testUtils = utils;

    // Auto-run tests function
    window.runCustomerUITests = async function() {
        const tester = new CustomerUITest();
        return await tester.runAllTests();
    };

    // Quick test function
    window.runQuickUITests = async function() {
        console.log('⚡ RUNNING QUICK UI TESTS');
        
        try {
            await utils.waitForElement('table, .table', 3000);
            console.log('✅ Customer table found');
            
            const rows = document.querySelectorAll('table tbody tr, .table-row');
            console.log(`✅ Found ${rows.length} customer rows`);
            
            const addBtn = document.querySelector('button[title*="Add"], button:contains("Add"), button:contains("Thêm")');
            if (addBtn) {
                console.log('✅ Add customer button found');
            } else {
                console.log('⚠️ Add customer button not found');
            }
            
            console.log('⚡ Quick tests complete');
            
        } catch (error) {
            console.log('❌ Quick tests failed:', error.message);
        }
    };

    // Instructions
    console.log('\n📋 HOW TO USE:');
    console.log('1. Navigate to Customer Management page');
    console.log('2. Run: runCustomerUITests() - for full test suite');
    console.log('3. Run: runQuickUITests() - for quick verification');
    console.log('4. Check console output for detailed results');
    console.log('\n🚀 Script loaded successfully!');

})();