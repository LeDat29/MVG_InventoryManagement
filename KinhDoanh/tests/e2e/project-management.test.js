const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs'); // Import fs module
const path = require('path'); // Import path module

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5001'; // Default to prod server port 5001
const BASE_API_URL = 'http://localhost:5001/api'; // Assuming the API runs on port 5001

describe('Project Management E2E Test', () => {
    let browser;
    let page;
    let authToken = '';
    let user = null;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true, // Run in headless mode
            slowMo: 50, // slow down by 50ms
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        // Open the app first so localStorage is writable in the page context
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

        // Try to confirm server environment via health endpoint
        let serverEnv = null;
        try {
            const health = await axios.get(`${BASE_API_URL}/health`);
            serverEnv = health.data.environment;
            console.log('Server /api/health environment:', serverEnv);
        } catch (err) {
            console.warn('Could not read /api/health:', err.message);
        }

        // 1. Perform login via API; if it fails, fall back to a mock token/user
        const loginCredentials = { username: 'admin', password: 'admin' };
        try {
            const response = await axios.post(`${BASE_API_URL}/auth/login`, loginCredentials, { timeout: 5000 });
            authToken = response.data.data.token;
            user = response.data.data.user;
            console.log('✅ E2E Login successful (API)');
        } catch (error) {
            console.warn('E2E API login failed; falling back to mock auth:', error.response?.data || error.message);
            authToken = 'mock-e2e-token';
            user = {
                id: 1,
                username: 'e2e_test_user',
                full_name: 'E2E Test User',
                email: 'e2e@test.com',
                role: 'admin'
            };
        }

        // 2. Set localStorage items in the already-opened page so AuthContext picks them up
        await page.evaluate((token, userData) => {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
        }, authToken, user);

        // Give AuthContext a moment to process localStorage and set up Axios headers
        await new Promise((r) => setTimeout(r, 1000));
    });

    afterAll(async () => {
        await browser.close();
    });

    test('should load the project list', async () => {
        await page.goto(`${BASE_URL}/projects`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('button:has-text("Tạo dự án mới")');
        const projectCards = await page.$$('.project-card');
        expect(projectCards.length).toBeGreaterThan(0);
    });

    test('should navigate to the project detail page', async () => {
        await page.goto(`${BASE_URL}/projects`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.project-card a');
        await page.click('.project-card a');
        await page.waitForSelector('.project-detail-page');
        const projectName = await page.$eval('h2', el => el.textContent);
        expect(projectName).toContain('Kho xưởng');
    });

    test('should navigate to the project edit page and modify a field', async () => {
        await page.goto(`${BASE_URL}/projects/1`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.project-detail-page h2');
        await page.click('button[aria-label="Chỉnh sửa"]');
        await page.waitForSelector('.project-edit-page');
        await page.type('input[name="name"]', ' - Edited');
        const editedName = await page.$eval('input[name="name"]', el => el.value);
        expect(editedName).toContain('- Edited');
    });
    
    test('should save the edited project', async () => {
        await page.goto(`${BASE_URL}/projects/1/edit`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.project-edit-page h5');
        await page.click('button[type="submit"]');
        await page.waitForSelector('.project-detail-page');
        const projectName = await page.$eval('h2', el => el.textContent);
        expect(projectName).toContain('- Edited');
    });

    test('should upload a document', async () => {
        await page.goto(`${BASE_URL}/projects/1`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.project-detail-page .nav-tabs');
        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click('button[aria-label="Upload tài liệu"]'),
        ]);
        await fileChooser.accept(['./tests/e2e/test-file.txt']);
        await page.waitForSelector('.toast-body');
        const toastMessage = await page.$eval('.toast-body', el => el.textContent);
        expect(toastMessage).toContain('Đã tải lên 1 tài liệu.');
    });
});
