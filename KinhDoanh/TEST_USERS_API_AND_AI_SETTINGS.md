# ✅ HƯỚNG DẪN TEST USERS API & AI SETTINGS

**Status**: Server đã khởi động thành công!  
**MongoDB**: Đã disable (không cần thiết)  
**MySQL**: ✅ Hoạt động với 13 tables

---

## 🎯 BƯỚC 1: TEST USERS API

### Mở Browser và Login

1. **Mở**: http://localhost:3000
2. **Login** với:
   - Username: `admin`
   - Password: `admin123`

3. **Navigate to Users page**:
   - Click menu **"Quản lý User"**
   - Hoặc trực tiếp: http://localhost:3000/users

### Kết quả mong đợi:

✅ **THÀNH CÔNG** nếu:
- Trang load không lỗi
- Hiển thị danh sách users
- Không có lỗi 500 trong Console (F12)
- Không có lỗi đỏ trong Network tab

❌ **VẪN LỖI** nếu:
- Console hiển thị: `GET .../api/users 500 (Internal Server Error)`
- Trang trắng hoặc loading mãi
- Alert "Không thể tải danh sách users"

---

## 🎯 BƯỚC 2: TEST AI SETTINGS CHO ADMIN

### Cách 1: Từ Settings Page

1. **Navigate to Settings**:
   - Click avatar/username ở góc phải trên
   - Click **"Cài đặt"**
   - Hoặc: http://localhost:3000/settings

2. **Click tab "Cấu hình AI"**:
   - Bên trái sidebar có tab với icon 🤖
   - Click vào đó

3. **Test AI Config Manager**:
   - Click button **"Quản lý API Keys"**
   - Modal AIConfigManager mở ra
   - Click **"Thêm cấu hình"**
   - Chọn provider (OpenAI, Gemini, Claude, Copilot)
   - Nhập API key (test key)
   - Click **"Thêm mới"**

### Cách 2: Từ User Management (Recommended)

1. **Go to**: http://localhost:3000/users

2. **Find admin user** trong danh sách

3. **Click icon 🤖** (Robot) trên row của admin user

4. **Modal mở ra** → Thấy AIConfigManager

5. **Thêm/Sửa/Xóa** AI configs

### Kết quả mong đợi:

✅ **AI Settings hoạt động** nếu:
- Settings page có tab "Cấu hình AI"
- Click "Quản lý API Keys" → Modal mở
- Hiển thị 4 providers: OpenAI, Gemini, Claude, Copilot
- Có thể add/edit/delete configs
- Icon 🤖 xuất hiện trên User Management

❌ **Chưa có AI Settings** nếu:
- Settings page không có tab "Cấu hình AI"
- Click robot icon không có gì xảy ra
- Modal không mở

---

## 🐛 NẾU VẪN LỖI USERS API 500

### Debug Steps:

#### 1. Check Server Logs
```bash
# Mở file server_error.txt hoặc xem console
# Tìm error message gần nhất
```

#### 2. Check Browser Console
```
F12 → Console tab
Tìm error messages màu đỏ
```

#### 3. Check Network Tab
```
F12 → Network tab
Filter: XHR
Find: /api/users request
Click → Check Response tab
```

#### 4. Manual API Test
Mở **Postman** hoặc **curl**:

**Login first**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

Copy token từ response, sau đó:

**Test Users API**:
```bash
curl -X GET "http://localhost:5000/api/users?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔧 POSSIBLE FIXES

### Fix 1: Clear Browser Cache
```
Ctrl + Shift + Delete
→ Clear cached images and files
→ Clear cookies and site data
→ Refresh: Ctrl + F5
```

### Fix 2: Restart Everything
```bash
# Stop server
Ctrl+C

# Stop frontend
Ctrl+C trong terminal chạy npm start

# Restart server
npm start

# Restart frontend (trong thư mục client)
cd client
npm start
```

### Fix 3: Check Database Tables Exist
```sql
USE kho_mvg;
SHOW TABLES LIKE 'user%';

-- Phải thấy:
-- user_ai_configs
-- user_logs  
-- user_project_permissions
-- users
```

### Fix 4: Re-run SQL Script (Nếu tables thiếu)
```bash
# Option 1: Node script
node run-sql-fix.js

# Option 2: phpMyAdmin
# Mở: http://localhost/phpmyadmin
# Database: kho_mvg
# SQL tab
# Paste nội dung: tmp_rovodev_fix_users_error.sql
# Execute
```

---

## 📊 EXPECTED RESULTS

### Users API Response (Success):
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "admin",
        "full_name": "Administrator",
        "role": "admin",
        "assigned_projects": 0,
        "ai_configs_count": 0,
        "last_activity": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

### Settings Page (AI Tab):
```
✅ Sidebar có tab "Cấu hình AI" với icon 🤖
✅ Click tab → Content area hiển thị:
   - Alert box hướng dẫn
   - Card "API Keys Cá nhân"
   - Button "Quản lý API Keys"
   - Card "Providers hỗ trợ" với 4 provider cards
✅ Click button → AIConfigManager modal mở
```

---

## 📸 SCREENSHOTS TO TAKE

1. **Users page** - Danh sách users hiển thị
2. **Settings page** - Tab "Cấu hình AI"
3. **AI Config Modal** - AIConfigManager opened
4. **Browser Console** - No errors (F12 → Console)
5. **Network Tab** - Users API returns 200 OK

---

## ✅ SUCCESS CRITERIA

### Users API: ✅
- [ ] No 500 error in console
- [ ] Users list displays correctly
- [ ] Can click 🔑 icon → Permission Manager opens
- [ ] Can click 🤖 icon → AI Config Manager opens

### AI Settings: ✅
- [ ] Settings page has "Cấu hình AI" tab
- [ ] Tab content displays correctly
- [ ] "Quản lý API Keys" button works
- [ ] AIConfigManager modal opens
- [ ] Can add/edit/delete AI configs
- [ ] 4 providers shown: OpenAI, Gemini, Claude, Copilot

---

## 🎯 NEXT STEPS AFTER SUCCESS

1. ✅ Test Permission Manager
2. ✅ Test Activity Logs page
3. ✅ Test Project Tasks feature
4. ✅ Test Google Maps in Project Detail
5. ✅ Test FloatingChatButton

---

## 📞 IF STILL HAVING ISSUES

**Report to me**:
1. Screenshot of error
2. Browser console errors (F12 → Console)
3. Network tab response (F12 → Network)
4. Which step failed?

**Common causes**:
- Tables not created → Run SQL script
- Server not restarted → Restart with `npm start`
- Cache issues → Hard refresh with Ctrl+Shift+R
- Wrong password in .env → Check DB_PASSWORD

---

**Time to test**: 5-10 minutes  
**Difficulty**: ⭐ Easy  
**Tools needed**: Browser + F12 DevTools

🎯 **START TESTING NOW!**

