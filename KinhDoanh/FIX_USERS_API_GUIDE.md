# 🔧 HƯỚNG DẪN SỬA LỖI USERS API 500 ERROR

**Vấn đề**: `GET /api/users` trả về 500 Internal Server Error  
**Nguyên nhân**: Thiếu các bảng: `user_project_permissions`, `user_ai_configs`, `user_logs`  
**Giải pháp**: Tạo các bảng bằng 1 trong 3 cách dưới đây

---

## 🎯 GIẢI PHÁP 1: Tự động (Nhanh nhất)

### Bước 1: Kiểm tra file .env
```bash
# Mở file .env và kiểm tra:
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_actual_password_here
DB_NAME=kho_mvg
```

### Bước 2: Chạy script
```bash
node scripts/quick-fix-tables.js
```

**Nếu thành công**: ✅ Restart server và test lại  
**Nếu lỗi**: Chuyển sang Giải pháp 2

---

## 🎯 GIẢI PHÁP 2: MySQL Workbench (Khuyến nghị)

### Bước 1: Mở MySQL Workbench
1. Kết nối tới database `kho_mvg`
2. Click "File" → "Open SQL Script"
3. Chọn file: `tmp_rovodev_fix_users_error.sql`

### Bước 2: Execute Script
1. Click nút "Execute" (⚡ icon) hoặc Ctrl+Shift+Enter
2. Đợi script chạy xong
3. Kiểm tra kết quả trong Output

### Bước 3: Verify
```sql
SHOW TABLES;
-- Phải thấy 3 bảng mới:
-- - user_project_permissions
-- - user_ai_configs
-- - user_logs
```

### Bước 4: Restart Server
```bash
# Stop server (Ctrl+C)
# Start lại
npm start
```

---

## 🎯 GIẢI PHÁP 3: Command Line MySQL

### Bước 1: Mở Command Prompt
```bash
cd C:\KinhDoanh
```

### Bước 2: Tìm MySQL bin folder
```bash
# Thường nằm ở:
C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe
# Hoặc
C:\xampp\mysql\bin\mysql.exe
```

### Bước 3: Chạy SQL script
```bash
# Thay YOUR_PASSWORD bằng password thực tế
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pYOUR_PASSWORD kho_mvg < tmp_rovodev_fix_users_error.sql
```

### Bước 4: Verify & Restart
```bash
# Check tables
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pYOUR_PASSWORD kho_mvg -e "SHOW TABLES;"

# Restart server
npm start
```

---

## 🎯 GIẢI PHÁP 4: Copy-Paste SQL (Dễ nhất)

### Bước 1: Mở file `tmp_rovodev_fix_users_error.sql`

### Bước 2: Copy toàn bộ nội dung SQL

### Bước 3: Paste vào MySQL Workbench hoặc phpMyAdmin
1. Chọn database `kho_mvg`
2. Paste SQL vào query editor
3. Execute

---

## ✅ KIỂM TRA SAU KHI FIX

### Test 1: Check Tables
```sql
USE kho_mvg;
SHOW TABLES LIKE 'user%';

-- Kết quả mong đợi:
-- user_ai_configs
-- user_logs
-- user_project_permissions
-- users
```

### Test 2: Restart Server
```bash
npm start
# Server phải start thành công không lỗi
```

### Test 3: Test API
1. Mở browser: http://localhost:3000
2. Login với admin account
3. Click menu "Quản lý User"
4. **Kết quả mong đợi**: Danh sách users hiển thị, KHÔNG có lỗi 500

---

## 🐛 NẾU VẪN LỖI

### Lỗi 1: "Table doesn't exist"
**Giải pháp**: Chạy lại SQL script, kiểm tra database name đúng chưa

### Lỗi 2: "Access denied"
**Giải pháp**: Kiểm tra password MySQL trong file `.env`

### Lỗi 3: "Foreign key constraint fails"
**Giải pháp**: 
```sql
-- Tắt foreign key check tạm thời
SET FOREIGN_KEY_CHECKS=0;
-- Chạy SQL script
-- Bật lại
SET FOREIGN_KEY_CHECKS=1;
```

---

## 📊 SQL SCRIPT SUMMARY

Script sẽ tạo 3 bảng:

### 1. user_project_permissions
- **Mục đích**: Lưu quyền của user trên từng project
- **Columns**: user_id, project_id, permissions (JSON)
- **Indexes**: user_id, project_id
- **Unique**: (user_id, project_id)

### 2. user_ai_configs
- **Mục đích**: Lưu API keys AI của user
- **Columns**: user_id, provider, api_key, model, cost, usage
- **Indexes**: user_id, is_active
- **Providers**: openai, gemini, claude, copilot

### 3. user_logs
- **Mục đích**: Lưu lịch sử hoạt động của users
- **Columns**: user_id, action, entity_type, entity_id, details
- **Indexes**: user_id, action, created_at
- **AI tracking**: is_ai_assisted flag

---

## 🎉 SAU KHI FIX THÀNH CÔNG

### Features sẽ hoạt động:
1. ✅ Trang Quản lý User
2. ✅ Permission Manager (phân quyền theo project)
3. ✅ AI Config Manager (quản lý API keys)
4. ✅ Activity Logs (lịch sử hoạt động)
5. ✅ Settings page → AI Configuration tab

### Test các features:
1. **User Management**: `/users` - Xem danh sách users
2. **Permissions**: Click icon 🔑 trên user → Gán quyền
3. **AI Config**: Click icon 🤖 trên user → Thêm API key
4. **Activity Logs**: `/admin/activity-logs` - Xem logs
5. **Settings**: `/settings` → Tab "Cấu hình AI" → Quản lý API Keys

---

## 💡 TIPS

### Prevent future issues:
1. Backup database thường xuyên
2. Document schema changes
3. Version control migrations
4. Test in dev environment first

### Backup trước khi fix:
```bash
mysqldump -u root -p kho_mvg > backup_before_fix.sql
```

### Restore nếu có vấn đề:
```bash
mysql -u root -p kho_mvg < backup_before_fix.sql
```

---

## 📞 SUPPORT

Nếu vẫn gặp vấn đề:
1. Check server logs: `server_error.txt`
2. Check browser console (F12)
3. Verify MySQL service is running
4. Restart both MySQL and Node server

---

**Status**: ⏳ Awaiting manual fix  
**Priority**: 🔴 HIGH - Blocking User Management feature  
**Estimated time**: 5-10 minutes  
**Difficulty**: ⭐ Easy (just run SQL)

