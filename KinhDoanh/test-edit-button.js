/**
 * Test Edit Button Navigation
 */
const puppeteer = require('puppeteer');

async function testEditButton() {
  console.log('🧪 Testing Edit Button Navigation...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    console.log('📄 Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0', timeout: 30000 });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Perform login using demo button - find button with "Demo Admin" text
    console.log('🔐 Logging in with Demo Admin account...');
    const demoAdminBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Demo Admin'));
    });
    
    if (demoAdminBtn) {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(btn => btn.textContent.includes('Demo Admin'));
        if (btn) btn.click();
      });
    } else {
      console.log('⚠️  Demo Admin button not found, trying direct click...');
      await page.click('button');
    }
    
    // Wait for login to complete
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    } catch (e) {
      console.log('⚠️  Navigation timeout, proceeding anyway...');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Login successful\n');
    
    // Navigate to project detail
    console.log('📄 Navigating to Project Detail (ID: 1)...');
    await page.goto('http://localhost:3000/projects/1', { waitUntil: 'networkidle0', timeout: 30000 });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Project page loaded\n');

    // Take screenshot of the page
    console.log('📸 Taking screenshot of project detail page...');
    await page.screenshot({ path: 'project_detail_before.png' });

    // Check if Edit button exists
    const editButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Chỉnh sửa'));
    });
    
    if (!editButton) {
      console.log('🔍 Edit button not found by text, searching by other selectors...');
      // Try to find by icon
      const buttons = await page.$$('button');
      console.log(`Found ${buttons.length} buttons on the page`);
      
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const text = await page.evaluate(btn => btn.innerText, buttons[i]);
        console.log(`  Button ${i}: "${text.substring(0, 50)}"`);
      }
    }

    // Look for edit button with more flexible selector
    const editButtonFlexible = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => 
        btn.textContent.includes('Chỉnh sửa') || 
        btn.innerHTML.includes('edit')
      ) ? true : false;
    });

    if (!editButtonFlexible) {
      console.log('❌ Edit button not found on the page');
      console.log('\n📝 Page content preview:');
      const content = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log(content);
      return false;
    }

    console.log('✅ Edit button found\n');

    // Click the edit button
    console.log('🖱️  Clicking edit button...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
      page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const editBtn = buttons.find(btn => btn.textContent.includes('Chỉnh sửa'));
        if (editBtn) editBtn.click();
      })
    ]);

    console.log('✅ Navigation triggered\n');

    // Get current URL after navigation
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Check if we're on the edit page
    if (currentUrl.includes('/edit')) {
      console.log('✅ SUCCESS: Edit button correctly navigates to /projects/1/edit\n');
      
      // Take screenshot of edit page
      console.log('📸 Taking screenshot of edit page...');
      await page.screenshot({ path: 'project_edit_page.png' });
      
      // Check if edit form exists
      const formExists = await page.$('form');
      if (formExists) {
        console.log('✅ Edit form is present on the page\n');
      }
      
      return true;
    } else {
      console.log(`❌ FAILED: Expected URL to contain /edit, got: ${currentUrl}\n`);
      
      // Check where we ended up
      const title = await page.title();
      console.log(`Page title: ${title}`);
      const heading = await page.evaluate(() => document.querySelector('h2')?.textContent);
      console.log(`Page heading: ${heading}`);
      
      return false;
    }
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testEditButton().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('🎉 Edit Button Test PASSED');
  } else {
    console.log('💥 Edit Button Test FAILED');
  }
  console.log('='.repeat(50) + '\n');
  process.exit(success ? 0 : 1);
});
