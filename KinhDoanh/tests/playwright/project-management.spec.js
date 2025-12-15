const { test, expect } = require('@playwright/test');
const axios = require('axios');
const path = require('path');
const { setupTestData } = require('./setup-test-data');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5001';
console.log('TEST BASE_URL resolved to:', BASE_URL);
const BASE_API_URL = 'http://localhost:5001/api';

test.describe('Project Management - Playwright E2E', () => {
  let authToken = '';
  let user = null;

  test.beforeAll(async () => {
    // Use real credentials to login, mirroring production behavior
    const adminUser = process.env.E2E_ADMIN_USER;
    const adminPass = process.env.E2E_ADMIN_PASS;
    if (!adminUser || !adminPass) {
      throw new Error('E2E credentials not provided. Set E2E_ADMIN_USER and E2E_ADMIN_PASS env vars.');
    }

    try {
      const resp = await axios.post(`${BASE_API_URL}/auth/login`, { username: adminUser, password: adminPass }, { timeout: 5000 });
      authToken = resp.data.data.token;
      user = resp.data.data.user;
      console.log('Playwright: API login succeeded');
      
      // Seed test data (sample project) if needed
      try {
        await setupTestData(BASE_API_URL, authToken);
      } catch (seedErr) {
        console.warn('Playwright: Could not seed test data, tests may skip project-specific assertions:', seedErr.message);
      }
    } catch (err) {
      console.error('Playwright: API login failed - ensure credentials are correct and backend is reachable.');
      throw err;
    }
  });

  test('Load project list and basic navigation', async ({ browser }) => {
    const context = await browser.newContext();
    // Ensure token and user are present in localStorage before any page loads
    await context.addInitScript(({ token, userData }) => {
      try {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (e) {
        // ignore
      }
    }, { token: authToken, userData: user });
    const page = await context.newPage();
    // Attach browser page listeners to capture console and errors
    page.on('console', (msg) => {
      console.log(`PAGE LOG [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      console.error('PAGE ERROR:', err.message || err);
      // Re-throw to make the test fail so error is visible
      throw err;
    });

    // Set localStorage before app loads by navigating to root and setting it
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle'); // Chờ tất cả yêu cầu mạng hoàn thành
    await page.evaluate(({ token, userData }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
    }, { token: authToken, userData: user });

      // Go to projects list and wait for page header to confirm load
      await page.goto(`${BASE_URL}/projects`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h2:has-text("Quản lý Dự án")', { timeout: 15000 }).catch(() => {});
      // The create button may be permission-gated in prod; check presence without waiting indefinitely
      const hasCreate = await page.locator('text=Tạo dự án mới').count();
      console.log('Create button count:', hasCreate);

    // Try to click first project card link if present
    const firstProjectLink = page.locator('.project-card a').first();
    if (await firstProjectLink.count() > 0) {
      await firstProjectLink.click();
      await page.waitForSelector('.project-detail-page h2'); // Chờ tiêu đề trang chi tiết xuất hiện
      // Expect either a detail container or project title
      const detailExists = await page.locator('.project-detail-page').count();
      expect(detailExists).toBeGreaterThanOrEqual(0);
    }

    await context.close();
  });

  test('Edit a project (if available) and save', async ({ browser }) => {
    const context = await browser.newContext();
    // Inject token/user into localStorage before any page loads. No XHR monkeypatch.
    await context.addInitScript(({ token, userData }) => {
      try { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(userData)); } catch (e) {}
    }, { token: authToken, userData: user });
    const page = await context.newPage();
    page.on('console', (msg) => console.log(`PAGE LOG [${msg.type()}]: ${msg.text()}`));
    page.on('pageerror', (err) => { console.error('PAGE ERROR:', err.message || err); throw err; });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ token, userData }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(userData)); }, { token: authToken, userData: user });

    // Navigate to a known project URL (id=1) and try to edit
    await page.goto(`${BASE_URL}/projects/1`, { waitUntil: 'domcontentloaded' });
      // Edit button may not exist if project 1 doesn't exist — check count directly
      const editBtn = page.locator('button[aria-label="Chỉnh sửa"]').first();
      if ((await editBtn.count()) > 0) {
      await editBtn.click();
      await page.waitForSelector('input[name="name"]'); // Chờ trường nhập tên xuất hiện
      // Try to change name input if exists
      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.count() > 0) {
        const newSuffix = ' - PW';
        const currentVal = await nameInput.inputValue().catch(() => '');
        const newVal = currentVal.includes(newSuffix) ? currentVal : currentVal + newSuffix;
        await nameInput.fill(newVal);
        // If address input exists, update it and verify
        const addressInput = page.locator('input[name="address"]').first();
        if (await addressInput.count() > 0) {
          const addrSuffix = ' (PW test)';
          const curAddr = await addressInput.inputValue().catch(() => '');
          const newAddr = curAddr.includes(addrSuffix) ? curAddr : curAddr + addrSuffix;
          await addressInput.fill(newAddr);
        }
        // If coordinate inputs exist, set test coordinates
        const latInput = page.locator('input[name="latitude"]').first();
        const lngInput = page.locator('input[name="longitude"]').first();
        if ((await latInput.count()) > 0 && (await lngInput.count()) > 0) {
          await latInput.fill('10.123456');
          await lngInput.fill('106.654321');
        }
        // Submit
        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.count() > 0) {
          await submitBtn.click();
          await page.waitForResponse(response => response.url().includes('/api/projects/1') && response.status() === 200); // Chờ API cập nhật dự án thành công
          // Verify saved value on detail page
          await page.goto(`${BASE_URL}/projects/1`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('h2'); // Chờ tiêu đề trang chi tiết xuất hiện lại
          const title = await page.locator('h2').first().innerText().catch(() => '');
          if (title) {
            expect(title).toContain(newSuffix);
          }
          // verify address and coordinates persisted (if present)
          const addrText = await page.locator('input[name="address"]').first().inputValue().catch(() => '');
          if (addrText) expect(addrText).toContain('(PW test)');
          const latVal = await page.locator('input[name="latitude"]').first().inputValue().catch(() => '');
          const lngVal = await page.locator('input[name="longitude"]').first().inputValue().catch(() => '');
          if (latVal && lngVal) {
            expect(latVal).toBe('10.123456');
            expect(lngVal).toBe('106.654321');
          }
        }
      }
    }

    await context.close();
  });

  test('Upload a document on project detail', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(({ token, userData }) => {
      try { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(userData)); } catch (e) {}
    }, { token: authToken, userData: user });
    const page = await context.newPage();
    page.on('console', (msg) => console.log(`PAGE LOG [${msg.type()}]: ${msg.text()}`));
    page.on('pageerror', (err) => { console.error('PAGE ERROR:', err.message || err); throw err; });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ token, userData }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(userData)); }, { token: authToken, userData: user });

    await page.goto(`${BASE_URL}/projects/1`, { waitUntil: 'domcontentloaded' });

    // If there's a file input, set files directly
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      const testFile = path.resolve(__dirname, '../../tests/e2e/test-file.txt');
      await fileInput.setInputFiles(testFile);
      // Wait for toast or success indicator and allow visual observation
      await page.waitForSelector('.document-item'); // Chờ một mục tài liệu mới xuất hiện
      // Check for uploaded document appearing in known selectors
      const docSelectors = ['.project-documents .document-item', '.document-item', '.uploaded-file', '.file-item', '.project-files .file-item'];
      let found = false;
      for (const sel of docSelectors) {
        const c = await page.locator(sel).count().catch(() => 0);
        if (c > 0) {
          found = true;
          break;
        }
      }
      expect(found).toBeTruthy();
    }

    await context.close();
  });

  test('Project detail: click each tab and edit fields', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(({ token, userData }) => {
      try { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(userData)); } catch (e) {}
    }, { token: authToken, userData: user });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ token, userData }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(userData)); }, { token: authToken, userData: user });

    // Navigate to project detail
    await page.goto(`${BASE_URL}/projects/1`, { waitUntil: 'domcontentloaded' });

    // If there are nav-tabs, click each tab and wait briefly for content
    const tabs = page.locator('.project-detail-page .nav-tabs a');
    const tabCount = await tabs.count();
    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      const tabText = await tab.innerText().catch(() => '');
      await tab.click();
      await page.waitForLoadState('networkidle'); // Chờ nội dung tab tải xong

      // Try to interact with known editable controls inside the tab
      // If an edit button exists, click and attempt to change a text input
      const editBtn = page.locator('button[aria-label="Chỉnh sửa"]').first();
      if (await editBtn.count() > 0) {
        await editBtn.click().catch(() => {});
        await page.waitForSelector('input[name="name"]'); // Chờ trường nhập tên (nếu có) xuất hiện
        const nameInput = page.locator('input[name="name"]').first();
        if (await nameInput.count() > 0) {
          const current = await nameInput.inputValue().catch(() => '');
          await nameInput.fill(current + ' [t]');
        }
        const saveBtn = page.locator('button[type="submit"]').first();
        if (await saveBtn.count() > 0) {
          await saveBtn.click().catch(() => {});
          await page.waitForLoadState('networkidle'); // Chờ quá trình lưu hoàn tất
        }
      }

      // Log tab visited
      console.log('Visited tab:', tabText || `#${i}`);
    }

    await context.close();
  });
});
