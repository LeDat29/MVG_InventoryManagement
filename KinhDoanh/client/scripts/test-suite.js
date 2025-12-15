/**
 * Comprehensive Test Suite v3.0 - KHO MVG
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5001';

const testResults = {
  timestamp: new Date().toISOString(),
  pages: {},
  summary: { total: 0, passed: 0, failed: 0 }
};

async function login(page) {
  try {
    console.log('🔐 Attempting dev-login...');
    const response = await page.evaluate(() => {
      return fetch('http://localhost:5001/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin' })
      }).then(res => res.json());
    });

    if (response.data && response.data.token) {
      await page.evaluate((token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({
          id: 1, username: 'admin', role: 'admin'
        }));
      }, response.data.token);
      console.log('✅ Login successful');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
}

async function testPage(page, name, url) {
  try {
      console.log(`  Testing ${name}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));
    
    const loaded = await page.evaluate(() => document.body.innerText.length > 100);
    
    if (loaded) {
      console.log(`✅ ${name}`);
      testResults.pages[name] = 'PASS';
      testResults.summary.passed++;
    } else {
      console.log(`❌ ${name}`);
      testResults.pages[name] = 'FAIL';
      testResults.summary.failed++;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    testResults.pages[name] = 'ERROR';
    testResults.summary.failed++;
  }
  testResults.summary.total++;
}

async function runTests() {
  let browser;
  try {
    console.log('\n🚀 Comprehensive Test Suite v3.0\n');

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('📄 Navigating to login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    if (!await login(page)) {
      throw new Error('Cannot login');
    }

    await new Promise(r => setTimeout(r, 2000));

    console.log('\n📝 Testing pages:\n');
    
    const pages = [
      ['Dashboard', `${BASE_URL}/`],
      ['Projects', `${BASE_URL}/projects`],
      ['Customers', `${BASE_URL}/customers`],
      ['Contracts', `${BASE_URL}/contracts`],
      ['Documents', `${BASE_URL}/documents`],
      ['Reports', `${BASE_URL}/reports`],
      ['Settings', `${BASE_URL}/settings`],
      ['Profile', `${BASE_URL}/profile`],
      ['Users', `${BASE_URL}/users`],
      ['Activity Logs', `${BASE_URL}/activity-logs`]
    ];

    for (const [name, url] of pages) {
      await testPage(page, name, url);
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 RESULTS: ${testResults.summary.passed}/${testResults.summary.total} passed`);
    console.log('='.repeat(50) + '\n');

    const reportDir = path.join(__dirname, '../test-reports');
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    
    const reportFile = path.join(reportDir, `test-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
    console.log(`📝 Report saved: ${reportFile}\n`);

    await browser.close();
    process.exit(testResults.summary.passed === 10 ? 0 : 1);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    if (browser) await browser.close();
    process.exit(1);
  }
}

runTests();
