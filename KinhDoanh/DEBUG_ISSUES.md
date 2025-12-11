# 🐛 DEBUG GUIDE - Users Page & AI Config Button

**Issues**:
1. Users page still showing 500 error
2. "Quản lý API Keys" button not working

---

## 🔍 ISSUE 1: Users Page 500 Error

### Current Status:
- ✅ Code fixed with token header
- ✅ Table existence check added
- ⏳ Need to verify server logs

### Debug Steps:

#### Step 1: Check Server Logs
```bash
# Open server console or check server_error.txt
# Look for errors related to /api/users
```

#### Step 2: Check Browser Console
```javascript
// Open F12 → Console
// Look for exact error message
// Example: "TypeError: ..." or "Error loading users..."
```

#### Step 3: Test API Directly
```bash
# Method 1: Browser (after login)
# Go to: http://localhost:3000
# Login, then open Console and run:

fetch('/api/users?page=1&limit=5', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => r.json())
.then(d => console.log('Users API:', d))
.catch(e => console.error('Error:', e));
```

#### Step 4: Check Database Tables
```sql
-- Verify tables exist
USE kho_mvg;
SHOW TABLES LIKE 'user%';

-- Should show:
-- user_ai_configs
-- user_logs
-- user_project_permissions  
-- users
```

#### Step 5: Check routes/users.js Query
The query should gracefully fallback if tables don't exist.

**If still 500 error**:
- Server logs will show exact error
- Most likely: Database query issue
- Solution: Check server console for SQL errors

---

## 🔍 ISSUE 2: AI Config Button Not Working

### Current Status:
- ✅ Button exists in Settings.js
- ✅ onClick handler added with console.log
- ✅ showAIConfig state exists
- ✅ AIConfigManager imported
- ✅ Modal render code added

### Debug Steps:

#### Step 1: Basic Check
```
1. Open: http://localhost:3000/settings
2. Click tab: "Cấu hình AI" 🤖
3. See 4 provider cards? ✅/❌
4. See button "Quản lý API Keys"? ✅/❌
```

#### Step 2: Click Button & Check Console
```
1. Open F12 → Console
2. Click "Quản lý API Keys" button
3. See message: "Opening AI Config Manager..."? ✅/❌
4. Any error messages? Write them down
```

#### Step 3: Check State
```javascript
// In Console, after clicking button, run:
console.log('showAIConfig state:', window.showAIConfig);
// Or check React DevTools
```

#### Step 4: Check if Modal Renders
```
1. After clicking button
2. Inspect page (F12 → Elements)
3. Search for "ai-config-manager" or "AIConfigManager"
4. Does modal DOM exist? ✅/❌
```

#### Step 5: Check AIConfigManager Component
```javascript
// Check if component is valid
import AIConfigManager from '../components/Users/AIConfigManager';
console.log('AIConfigManager:', AIConfigManager);
// Should not be undefined
```

### Possible Issues:

#### Issue A: Button Click Not Firing
**Symptoms**: No console.log message
**Cause**: Event handler not attached
**Solution**: Check React DevTools for event listeners

#### Issue B: State Not Updating
**Symptoms**: Console.log shows but modal doesn't appear
**Cause**: useState not working or component not re-rendering
**Solution**: 
```javascript
// Try force update
setShowAIConfig(false);
setTimeout(() => setShowAIConfig(true), 100);
```

#### Issue C: Modal Renders But Hidden
**Symptoms**: DOM exists but not visible
**Cause**: CSS z-index or display issue
**Solution**: Check CSS in Settings.css or AIConfigManager.css

#### Issue D: Component Import Error
**Symptoms**: Console shows "Cannot read property of undefined"
**Cause**: AIConfigManager not exported properly
**Solution**: Check export in AIConfigManager.js

---

## 🔧 QUICK FIXES

### Fix 1: Restart Everything
```bash
# Stop server
Ctrl+C

# Stop frontend  
Ctrl+C in client terminal

# Clear npm cache
npm cache clean --force
cd client && npm cache clean --force

# Restart
npm start
cd client && npm start
```

### Fix 2: Hard Refresh Browser
```
Ctrl + Shift + R
Or
Ctrl + F5
```

### Fix 3: Check Import Path
```javascript
// In Settings.js, verify:
import AIConfigManager from '../components/Users/AIConfigManager';

// Should be:
// client/src/pages/Settings.js
//   imports from
// client/src/components/Users/AIConfigManager.js

// Path is: ../components = go up one level (from pages to src), then into components
```

### Fix 4: Add Error Boundary
```javascript
// Wrap AIConfigManager with error boundary
{showAIConfig && user && (
  <ErrorBoundary>
    <AIConfigManager
      userId={user.id}
      onClose={() => setShowAIConfig(false)}
    />
  </ErrorBoundary>
)}
```

---

## 📊 CHECKLIST

### Users Page:
- [ ] Server is running (check http://localhost:5000)
- [ ] Database tables exist (run: SHOW TABLES LIKE 'user%')
- [ ] Token is in localStorage (check: localStorage.getItem('token'))
- [ ] Navigate to /users
- [ ] Open F12 Console
- [ ] Check for error messages
- [ ] Check Network tab for /api/users request
- [ ] Check Response tab for error details

### AI Config Button:
- [ ] Navigate to /settings
- [ ] Tab "Cấu hình AI" exists and clickable
- [ ] Tab content shows 4 provider cards
- [ ] Button "Quản lý API Keys" exists
- [ ] Open F12 Console before clicking
- [ ] Click button
- [ ] See console.log: "Opening AI Config Manager..."
- [ ] Modal appears (or check why not)
- [ ] If modal appears, check if userId is passed
- [ ] If modal doesn't appear, check console for errors

---

## 🎯 EXPECTED BEHAVIOR

### Users Page (Working):
```
1. Navigate to /users
2. Page loads with user list
3. Table shows columns: Người dùng, Vai trò, Trạng thái, etc.
4. No 500 error in console
5. Can see user data
6. Icons (🔑 🤖 📊) are clickable
```

### AI Config Button (Working):
```
1. Navigate to /settings
2. Click "Cấu hình AI" tab
3. See 4 provider cards
4. Click "Quản lý API Keys" button
5. AIConfigManager modal slides in from right/center
6. Modal shows title: "Quản lý API AI Models"
7. Can see provider options: OpenAI, Gemini, Claude, Copilot
8. Can click "Thêm cấu hình"
9. Can close modal with X button
```

---

## 🆘 IF NOTHING WORKS

### Last Resort:
```bash
# 1. Backup your changes
git status
git diff > my_changes.patch

# 2. Reset to last working state
git stash

# 3. Re-apply changes manually one by one
git stash pop

# 4. Or start fresh with clean slate
git reset --hard HEAD
npm install
cd client && npm install
```

### Get Help:
1. Take screenshot of error
2. Copy full error message from console
3. Check server logs: server_error.txt
4. Share error details

---

## 📝 TESTING SCRIPT

Run this in browser console after login:

```javascript
// Test Users API
console.log('Testing Users API...');
fetch('/api/users?page=1&limit=5', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => {
  console.log('Status:', r.status);
  return r.json();
})
.then(d => {
  console.log('✅ Users API works:', d);
  console.log('Users count:', d.data?.users?.length);
})
.catch(e => console.error('❌ Users API failed:', e));

// Test AI Config Button State
console.log('Testing AI Config...');
console.log('showAIConfig state:', window.showAIConfig);
console.log('user object:', window.user);
```

---

**Created**: 2024-12-05  
**Status**: Debug in progress  
**Priority**: HIGH - Blocking features

