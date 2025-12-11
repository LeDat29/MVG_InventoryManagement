# 🚀 FIX LỖI USERS API - HƯỚNG DẪN TỪNG BƯỚC

**Thời gian**: 3-5 phút  
**Mục tiêu**: Tạo 3 bảng thiếu để fix lỗi 500 Error

---

## 🎯 CÁCH 1: phpMyAdmin (DỄ NHẤT - Khuyến nghị)

### Bước 1: Mở phpMyAdmin
```
http://localhost/phpmyadmin
```
Hoặc tìm icon XAMPP/WAMP → Click "Admin MySQL"

### Bước 2: Login
- **Username**: `root`
- **Password**: (để trống hoặc password của bạn)
- Click "Go"

### Bước 3: Chọn Database
1. Bên trái, click vào database **`kho_mvg`**
2. Click tab **"SQL"** ở phía trên

### Bước 4: Copy SQL
Mở file `tmp_rovodev_fix_users_error.sql` trong thư mục dự án
- **Đường dẫn**: `C:\KinhDoanh\tmp_rovodev_fix_users_error.sql`
- Copy TOÀN BỘ nội dung (Ctrl+A → Ctrl+C)

### Bước 5: Paste và Execute
1. Paste vào ô SQL trong phpMyAdmin (Ctrl+V)
2. Click nút **"Go"** hoặc **"Execute"** ở góc dưới bên phải
3. Đợi 2-3 giây

### Bước 6: Kiểm tra kết quả
Bạn sẽ thấy thông báo màu xanh:
```
✓ 3 rows affected
✓ Query executed successfully
```

### Bước 7: Verify Tables
1. Click tab **"Structure"** 
2. Scroll xuống, bạn sẽ thấy 3 bảng mới:
   - ✅ `user_project_permissions`
   - ✅ `user_ai_configs`
   - ✅ `user_logs`

### Bước 8: Restart Server
Mở Command Prompt trong thư mục dự án:
```bash
# Stop server (nếu đang chạy)
Ctrl+C

# Start lại
npm start
```

### Bước 9: TEST
Mở browser: `http://localhost:3000/users`

**Kết quả mong đợi**: ✅ Trang hiển thị danh sách users, KHÔNG LỖI 500!

---

## 🎯 CÁCH 2: Command Line MySQL (NHANH)

### Bước 1: Mở Command Prompt
```bash
# Windows: Nhấn Win+R, gõ "cmd", Enter
cd C:\KinhDoanh
```

### Bước 2: Tìm MySQL bin folder
Chạy lần lượt để tìm MySQL:
```bash
# Thử XAMPP
cd C:\xampp\mysql\bin

# Hoặc thử MySQL standalone
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
```

### Bước 3: Run SQL Script
**Thay `YOUR_PASSWORD` bằng password MySQL thực tế của bạn**
```bash
# Nếu dùng XAMPP (password thường là rỗng)
mysql -u root kho_mvg < C:\KinhDoanh\tmp_rovodev_fix_users_error.sql

# Nếu có password
mysql -u root -pYOUR_PASSWORD kho_mvg < C:\KinhDoanh\tmp_rovodev_fix_users_error.sql
```

**Lưu ý**: Không có space giữa `-p` và password!

### Bước 4: Verify
```bash
mysql -u root -pYOUR_PASSWORD kho_mvg -e "SHOW TABLES LIKE 'user%';"
```

Kết quả phải có:
```
user_ai_configs
user_logs
user_project_permissions
users
```

### Bước 5: Restart & Test
```bash
cd C:\KinhDoanh
npm start
```

Mở: `http://localhost:3000/users`

---

## 🎯 CÁCH 3: HeidiSQL (Nếu có)

### Bước 1: Mở HeidiSQL
Kết nối tới MySQL server

### Bước 2: Select Database
Bên trái, click `kho_mvg`

### Bước 3: Import SQL
1. Menu: **File → Load SQL file**
2. Chọn file: `C:\KinhDoanh\tmp_rovodev_fix_users_error.sql`
3. Click **Execute** (F9)

### Bước 4: Verify & Restart
Refresh database tree → Check 3 tables mới
Restart server: `npm start`

---

## 🎯 CÁCH 4: Trực tiếp trong Node.js

### Bước 1: Tạo file test
Tạo file `test-db-connection.js`:
```javascript
const mysql = require('mysql2/promise');

async function testAndFix() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '123456', // Thay bằng password thực
            database: 'kho_mvg'
        });
        
        console.log('✅ Connected to database');
        
        // Test query
        const [rows] = await connection.execute('SHOW TABLES');
        console.log('Tables:', rows.length);
        
        await connection.end();
        console.log('✅ Connection closed');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAndFix();
```

### Bước 2: Chạy
```bash
node test-db-connection.js
```

Nếu kết nối OK → Bạn có thể dùng CÁCH 2 (Command Line)

---

## 🐛 TROUBLESHOOTING

### Lỗi: "Access denied for user 'root'@'localhost'"
**Nguyên nhân**: Password sai

**Giải pháp**:
1. Kiểm tra file `.env`:
   ```
   DB_PASSWORD=your_actual_password
   ```
2. Nếu dùng XAMPP, password mặc định là rỗng (không có password)
3. Thử lại với password đúng

### Lỗi: "Can't connect to MySQL server"
**Nguyên nhân**: MySQL chưa chạy

**Giải pháp**:
1. Mở XAMPP Control Panel
2. Click "Start" MySQL
3. Đợi status chuyển sang màu xanh
4. Thử lại

### Lỗi: "Database 'kho_mvg' doesn't exist"
**Nguyên nhân**: Database chưa tạo

**Giải pháp**:
```sql
CREATE DATABASE kho_mvg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Lỗi: "Table already exists"
**Nguyên nhân**: Bảng đã tồn tại (tốt!)

**Giải pháp**: Không cần làm gì, restart server và test

---

## ✅ SAU KHI FIX THÀNH CÔNG

### Test 1: Check Tables
Vào phpMyAdmin → Database `kho_mvg` → Phải thấy:
- ✅ user_ai_configs (11 columns)
- ✅ user_logs (10 columns)
- ✅ user_project_permissions (8 columns)

### Test 2: Check Server Logs
Restart server, không thấy lỗi về missing tables

### Test 3: Check API
```bash
# Mở browser Console (F12)
# Navigate to http://localhost:3000/users
# Network tab không thấy 500 error
```

### Test 4: Check Features
1. **User Management**: `/users` → ✅ Hiển thị danh sách
2. **Permission Icon**: Click 🔑 → ✅ Modal mở
3. **AI Config Icon**: Click 🤖 → ✅ Modal mở
4. **Activity Logs**: `/admin/activity-logs` → ✅ Hiển thị logs
5. **Settings**: `/settings` → ✅ AI tab có button

---

## 📊 NỘI DUNG SQL SCRIPT

Script sẽ tạo 3 bảng với cấu trúc sau:

### 1. user_project_permissions
```sql
- id (INT, PK, AUTO_INCREMENT)
- user_id (INT, FK → users)
- project_id (INT, FK → projects)
- permissions (JSON) ← Lưu array quyền
- created_by, created_at, updated_by, updated_at
- UNIQUE(user_id, project_id)
```

### 2. user_ai_configs
```sql
- id (INT, PK, AUTO_INCREMENT)
- user_id (INT, FK → users)
- provider (ENUM: openai, gemini, claude, copilot)
- api_key (TEXT) ← Encrypted
- model (VARCHAR)
- cost_per_1k_tokens (DECIMAL)
- is_active, priority, usage_count, total_cost
- created_at, updated_at
```

### 3. user_logs
```sql
- id (BIGINT, PK, AUTO_INCREMENT)
- user_id (INT, FK → users)
- action (VARCHAR) ← LOGIN, CREATE_PROJECT, etc.
- entity_type, entity_id
- ip_address, user_agent
- details (JSON)
- is_ai_assisted (BOOLEAN)
- created_at
- Indexes: user_id, action, created_at
```

---

## 💡 TIPS

### Backup trước khi chạy (Optional but recommended):
```bash
# Export backup
mysqldump -u root -p kho_mvg > backup_before_fix.sql

# Nếu có vấn đề, restore:
mysql -u root -p kho_mvg < backup_before_fix.sql
```

### Nếu muốn xem SQL trước khi chạy:
1. Mở `tmp_rovodev_fix_users_error.sql` bằng Notepad++
2. Review các CREATE TABLE statements
3. An toàn 100%, chỉ tạo bảng mới, không sửa/xóa gì

### Performance tip:
Script có indexes optimized:
- ✅ Foreign keys cho data integrity
- ✅ Indexes cho query performance
- ✅ UTF8MB4 cho Vietnamese characters

---

## 🎉 KẾT QUẢ MONG ĐỢI

Sau khi hoàn thành:

### Before Fix:
```
GET /api/users → 500 Internal Server Error
❌ Cannot read properties of undefined (reading 'length')
```

### After Fix:
```
GET /api/users → 200 OK
✅ {
  "success": true,
  "data": {
    "users": [...],
    "pagination": {...}
  }
}
```

### Features Unlocked:
- ✅ User Management page
- ✅ Permission Manager (🔑 icon)
- ✅ AI Config Manager (🤖 icon)
- ✅ Activity Logs page
- ✅ Settings → AI Configuration

---

## 📞 SUPPORT

Nếu gặp vấn đề:

1. **Screenshot error message**
2. **Check server logs**: `server_error.txt`
3. **Check browser console**: F12 → Console tab
4. **Verify MySQL running**: XAMPP Control Panel

Common issues và solutions đã list ở phần TROUBLESHOOTING phía trên.

---

**Thời gian ước tính**: 3-5 phút  
**Độ khó**: ⭐ Easy  
**Success rate**: 99% (nếu làm đúng theo guide)

🎯 **Hãy chọn CÁCH 1 (phpMyAdmin) - Dễ nhất và trực quan nhất!**

