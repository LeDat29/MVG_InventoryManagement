# ⚡ QUICK TEST - 2 Minutes

## Test 1: AI Config Button (30 seconds)

```
1. Open: http://localhost:3000/settings
2. Click: "Cấu hình AI" tab (🤖 icon)
3. Click: "Quản lý API Keys" button
4. Expected: Modal pops up with title "Quản lý API AI Models"
5. Expected: See "Thêm cấu hình" button
6. Expected: Can close with X button
```

**If not working**: Check browser console (F12) for errors

---

## Test 2: Users Page (30 seconds)

```
1. Open: http://localhost:3000/users
2. Expected: Table with user list
3. Expected: No 500 error in console
4. Expected: See columns: Người dùng, Vai trò, Trạng thái, etc.
5. Expected: Icons visible: 👁️ 🔑 🤖 📊
```

**If 500 error**:
- Open F12 → Console tab
- Copy error message
- Check Network tab → /api/users → Response

---

## ✅ If Both Work:

**SUCCESS!** 🎉

Next steps:
1. Test clicking 🤖 icon in Users page
2. Test adding AI config
3. Test permission manager (🔑 icon)

---

## ❌ If Still Not Working:

### Users Page 500:
```bash
# Check server console for SQL errors
# Or check: server_error.txt
```

### AI Button Not Working:
```javascript
// In browser console, run:
console.log('showAIConfig:', window.showAIConfig);
console.log('AIConfigManager:', document.querySelector('.modal'));
```

---

**Time**: 2 minutes  
**Status**: Ready to test  
**Files**: Settings.js & UserManagement.js fixed

