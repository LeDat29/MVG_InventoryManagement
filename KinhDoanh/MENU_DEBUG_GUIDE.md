# 🔧 Menu Debug Guide

## 🚨 Current Issue
- Menu items bị mất, chỉ vào được Dashboard

## 🔍 Possible Causes

### 1. **Permission Issues**
- User không có permissions cho các menu items
- hasPermission() function không hoạt động đúng

### 2. **Browser Cache**
- Code đã sửa nhưng browser cache cũ
- React component không re-render

### 3. **Auth Context Issues**
- User object không load đúng
- Role/permissions bị null

## 🛠️ Debug Steps

### Step 1: Check User Data
```javascript
// Mở Developer Console (F12) và check:
console.log('User:', localStorage.getItem('user'));
console.log('Token:', localStorage.getItem('token'));
```

### Step 2: Check Sidebar Component
```javascript
// In Sidebar component, check visibleMenuItems:
console.log('All menu items:', menuItems);
console.log('Visible menu items:', visibleMenuItems);
console.log('User role:', user?.role);
console.log('User permissions:', user?.permissions);
```

### Step 3: Check Network
- F12 → Network tab
- Reload page
- Check if any API calls fail

## 🔧 Quick Fixes

### Fix 1: Clear Cache
```bash
# Clear browser cache completely
# Or hard reload: Ctrl+Shift+R

# Clear React cache
cd client
rm -rf node_modules/.cache
npm start
```

### Fix 2: Debug Permissions (TEMP)
Đã áp dụng trong Sidebar.js:
```javascript
// Show all menu items temporarily
return true; // Instead of permission checking
```

### Fix 3: Check Mobile vs Desktop
- Is it mobile view? Check hamburger menu button
- Resize browser window to see if sidebar appears

## 📱 Mobile Debug
- Look for hamburger menu button (☰) in top-left
- Click to open sidebar
- Check if sidebar slides in from left

## 🖥️ Desktop Debug
- Sidebar should be visible on left side
- Width: 250px (or 70px if collapsed)
- Background: Purple gradient

## 🚀 Test Commands

### Restart Client:
```bash
cd client
npm start
```

### Check Server:
```bash
# Server should be running on port 5000
curl http://localhost:5000/api/auth/profile
```

### Reset Everything:
```bash
# Clear all storage
localStorage.clear();
sessionStorage.clear();

# Hard reload
location.reload(true);
```

## 🎯 Expected Result

**Desktop:**
```
┌──────────────────┬─────────────────────┐
│                  │ Navbar              │
│   [LOGO]         ├─────────────────────┤
│   KHO MVG        │                     │
│                  │                     │
│   📊 Dashboard   │ Content Area        │
│   🏢 Dự án       │                     │
│   👥 Khách hàng  │                     │
│   📝 Hợp đồng    │                     │
│   📁 Hồ sơ       │                     │
│   📊 Báo cáo     │                     │
│   ⚙️ Cài đặt     │                     │
└──────────────────┴─────────────────────┘
```

**Mobile:**
```
┌─────────────────────────────────────┐
│ [☰]  Navbar                        │
├─────────────────────────────────────┤
│                                     │
│ Content Area (Full Width)           │
│                                     │
│ [Sidebar hidden, slides in on ☰]   │
└─────────────────────────────────────┘
```

---

**🔥 URGENT CHECKS:**
1. Open browser DevTools (F12)
2. Check Console for errors
3. Check if user is logged in: `localStorage.getItem('user')`
4. Check if sidebar CSS is applied
5. Try mobile view (hamburger menu)