const puppeteer = require('puppeteer');
const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';
const DEV_USERNAME = process.env.DEV_USERNAME || process.env.DEV_USER || 'admin';
const DEV_USER_ID = process.env.DEV_USER_ID || null;

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // Try dev-login to get a token and user object, then inject into localStorage for the page
  let authToken = null;
  let authUser = null;
  try {
    const devAuthPayload = DEV_USER_ID ? { userId: Number(DEV_USER_ID) } : (DEV_USERNAME ? { username: DEV_USERNAME } : { username: 'admin' });
    console.log('Attempting dev-login with', devAuthPayload);
    const resp = await axios.post(`${API_BASE}/auth/dev-login`, devAuthPayload, { timeout: 5000 });
    if (resp && resp.data && resp.data.success && resp.data.data) {
      const { token, user } = resp.data.data;
      if (token) {
        authToken = token;
        authUser = user;
        console.log('Dev login successful, got token for user:', user?.username || user?.id);
      } else {
        console.warn('Dev-login successful but no token returned');
      }
    } else {
      console.warn('Dev-login did not return expected data:', resp && resp.data);
    }
  } catch (e) {
    console.warn('Dev-login request failed:', e.message);
  }

  // Set up request interception to inject auth headers
  if (authToken) {
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/')) {
        const headers = {
          ...request.headers(),
          'Authorization': `Bearer ${authToken}`
        };
        request.continue({ headers });
        console.log('Added auth header to API request:', url);
      } else {
        request.continue();
      }
    });
    console.log('Auth token interceptor set up');
  }

  // Log network requests/responses for /api/projects/*/zones
  page.on('response', async response => {
    try {
      const url = response.url();
      if (/\/api\/projects\/[0-9]+\/zones/.test(url)) {
        const status = response.status();
        const text = await response.text();
        console.log('--- NETWORK RESPONSE ---');
        console.log('URL:', url);
        console.log('STATUS:', status);
        console.log('BODY:', text.substring(0, 2000));
        console.log('--- END RESPONSE ---');
      }
    } catch (e) {
      console.warn('Response read error', e.message);
    }
  });

  try {
    const bases = ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://10.10.1.79:3001', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://10.10.1.79:3000'];
    let base = null;
    // try multiple possible host addresses
    for (const b of bases) {
      try {
        await page.goto(b, { waitUntil: 'networkidle2', timeout: 5000 });
        base = b;
        console.log('Connected to', b);
        break;
      } catch (e) {
        // try next
      }
    }
    if (!base) throw new Error('Could not connect to frontend on known addresses');

    // Inject auth token into localStorage after navigation
    if (authToken && authUser) {
      await page.evaluate((token, user) => {
        try {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          console.log('Auth data injected into localStorage');
        } catch (e) {
          console.error('Failed to inject auth data:', e);
        }
      }, authToken, authUser);
    }

    // Try to navigate to Contracts page heuristically
    const routesToTry = ['/contracts', '/contracts/create', '/contracts/list', '/quan-ly-hop-dong', '/contracts-manager'];
    let landed = false;
    for (const r of routesToTry) {
      const url = base + r;
      try {
        const res = await page.goto(url, { waitUntil: 'networkidle2' });
        if (res && res.status && res.status() < 400) {
          landed = true;
          console.log('Navigated to', url);
          break;
        }
      } catch (e) {
        // continue
      }
    }
    if (!landed) {
      console.log('Could not navigate to a contracts route; staying on home');
    }

    // Wait briefly for page UI
    await sleep(2000);

    // Try to find and click a button that opens ContractCreator modal
    const buttonSelectors = [
      'button:has-text("Tạo hợp đồng")',
      'button:has-text("Tạo hợp đồng mới")',
      'button:has-text("Thêm hợp đồng")',
      'button[title*="Tạo hợp đồng"]',
      '.fa-plus-circle',
      'button.btn:has-text("Tạo")'
    ];

    let clicked = false;
    // Fallback: search buttons by text manually
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const txt = (await page.evaluate(el => el.innerText || el.textContent, btn)).trim();
      if (/Tạo hợp đồng|Tạo hợp đồng mới|Thêm hợp đồng|Tạo hợp đồng/i.test(txt)) {
        await btn.click();
        clicked = true;
        console.log('Clicked button with text:', txt);
        break;
      }
    }

    // If not clicked, try clicking a generic "Thêm" or '+' icon
    if (!clicked) {
      const plus = await page.$('.fa-plus-circle');
      if (plus) {
        await plus.click();
        clicked = true;
        console.log('Clicked .fa-plus-circle');
      }
    }

    // Wait for modal title 'Tạo hợp đồng mới'
    try {
      await page.waitForFunction(() => !!document.querySelector('.modal') && (document.querySelector('.modal').innerText.includes('Tạo hợp đồng') || document.querySelector('.modal').innerText.includes('Tạo hợp đồng mới')), { timeout: 5000 });
      console.log('Modal opened');
    } catch (e) {
      console.log('Modal not found after click; trying to open direct URL if exists');
    }

    // Find project select via DOM and choose the first non-empty option (evaluate runs in page)
    const projectSelectionResult = await page.evaluate(() => {
      function findSelectByLabelText(patterns) {
        const labels = Array.from(document.querySelectorAll('label'));
        for (const lbl of labels) {
          const text = (lbl.innerText || '').trim();
          if (patterns.some(p => text.includes(p))) {
            let el = lbl.nextElementSibling;
            while (el && el.tagName !== 'SELECT') el = el.nextElementSibling;
            if (el && el.tagName === 'SELECT') return el;
          }
        }
        const selects = Array.from(document.querySelectorAll('select'));
        for (const s of selects) {
          const inner = s.innerText || s.textContent || '';
          if (/Chọn dự án|-- Chọn dự án --/.test(inner)) return s;
        }
        return null;
      }

      const sel = findSelectByLabelText(['Chọn dự án', 'Chn dun']);
      if (!sel) return { found: false, options: [] };
      const opts = Array.from(sel.options).map(o => ({ value: o.value, text: o.innerText || o.textContent }));
      const chosen = opts.find(o => o.value && o.value.trim() !== '');
      if (!chosen) return { found: false, options: opts };
      sel.value = chosen.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return { found: true, chosen: chosen.value, options: opts };
    });

    if (!projectSelectionResult || !projectSelectionResult.found) {
      console.error('Project select not found or no valid option — cannot continue automated check');
      await browser.close();
      process.exit(2);
    }

    console.log('Chosen project value:', projectSelectionResult.chosen);

    // Listen for fetch/XHR calls (in case select triggers fetch on change)
    page.on('request', request => {
      const url = request.url();
      if (/\/api\/projects\/[0-9]+\/zones/.test(url)) {
        console.log('--- NETWORK REQUEST ---');
        console.log('METHOD:', request.method());
        console.log('URL:', url);
        console.log('POST DATA:', request.postData());
        console.log('--- END REQUEST ---');
      }
    });

    // Wait for a network response to zones or for zone select to populate
    await sleep(2000);

    // Try to find zone select and list options via page evaluate
    const zonesResult = await page.evaluate(() => {
      function findSelectByLabelText(patterns) {
        const labels = Array.from(document.querySelectorAll('label'));
        for (const lbl of labels) {
          const text = (lbl.innerText || '').trim();
          if (patterns.some(p => text.includes(p))) {
            let el = lbl.nextElementSibling;
            while (el && el.tagName !== 'SELECT') el = el.nextElementSibling;
            if (el && el.tagName === 'SELECT') return el;
          }
        }
        const selects = Array.from(document.querySelectorAll('select'));
        for (const s of selects) {
          const inner = s.innerText || s.textContent || '';
          if (/Vị trí kho|Vị tr i kho|V tr kho/.test(inner)) return s;
        }
        return null;
      }

      const sel = findSelectByLabelText(['Vị trí kho', 'Vị tr i kho']);
      if (!sel) return { found: false, options: [] };
      const opts = Array.from(sel.options).map(o => (o.innerText || o.textContent || '').trim());
      return { found: true, options: opts };
    });

    if (zonesResult && zonesResult.found) {
      console.log('Zone options count:', zonesResult.options.length);
      zonesResult.options.forEach(o => console.log(' -', o));
    } else {
      console.log('Zone select not found or still empty');
    }

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Headless test error:', err);
    await browser.close();
    process.exit(4);
  }
})();
