# HƯỚNG DẪN SETUP DATABASE TỰ ĐỘNG - KHO MVG

## 🚀 Tính Năng Tự Động

Hệ thống **tự động khởi tạo và cập nhật database** mỗi khi start server!

### ✅ Những gì được tự động:

1. ✅ **Tạo database** `kho_mvg` nếu chưa tồn tại
2. ✅ **Tạo tất cả tables** cần thiết
3. ✅ **Áp dụng indexes** để tối ưu performance
4. ✅ **Tạo bảng client_errors** để track lỗi từ client
5. ✅ **Tạo admin user** với mật khẩu random an toàn
6. ✅ **Hiển thị thống kê** database và thông tin đăng nhập

---

## 📋 YÊU CẦU

### MySQL Server
- MySQL 5.7+ hoặc MariaDB 10.2+
- Server phải đang chạy

### Cấu Hình (file `.env`)
```bash
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=kho_mvg
```

---

## 🎯 CÁCH SỬ DỤNG

### 1. Start Server (Tự động init database)

```bash
npm run start
```

Hoặc với nodemon:
```bash
npm run dev
```

**Điều gì xảy ra:**
1. Server kiểm tra MySQL connection
2. Tạo database `kho_mvg` nếu chưa có
3. Tạo/cập nhật tables
4. Áp dụng indexes
5. Tạo admin user (nếu chưa có)
6. Hiển thị summary và khởi động server

**Output mẫu:**
```
================================================================================
🚀 AUTO DATABASE INITIALIZATION - KHO MVG
================================================================================

✅ Kết nối MySQL thành công
✅ Database 'kho_mvg' đã sẵn sàng

🆕 Database mới, khởi tạo lần đầu...

📋 Khởi tạo tables...
✅ Tables cơ bản đã được tạo

🔧 Áp dụng indexes...
✅ Indexes đã được áp dụng

📊 Tạo bảng client errors...
✅ Client error tables đã được tạo

👤 Kiểm tra admin user...
✅ Admin user đã được tạo
================================================================================
🔐 THÔNG TIN ĐĂNG NHẬP ADMIN:
   Username: admin
   Password: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ⚠️  QUAN TRỌNG: Đổi mật khẩu này NGAY sau lần đăng nhập đầu tiên!
================================================================================

================================================================================
📊 DATABASE SUMMARY
================================================================================

📋 Tổng số tables: 15

Top 10 tables:
┌─────────────────────────────┬──────────┬────────────┐
│ Table Name                  │ Rows     │ Size (MB)  │
├─────────────────────────────┼──────────┼────────────┤
│ users                       │        1 │       0.02 │
│ projects                    │        0 │       0.01 │
│ customers                   │        0 │       0.01 │
│ warehouse_zones             │        0 │       0.01 │
│ contracts                   │        0 │       0.01 │
└─────────────────────────────┴──────────┴────────────┘

✅ Database sẵn sàng sử dụng!
================================================================================

✅ MongoDB connected successfully
✅ MySQL connected successfully
🚀 KHO MVG Server đang chạy tại port 5000
📱 Environment: development
📚 API Docs: http://localhost:5000/api/docs
```

---

### 2. Manual Init/Reset Database

Nếu bạn muốn chạy init database riêng (không start server):

```bash
npm run db:init
```

Hoặc reset database:
```bash
npm run db:reset
```

---

## 🔧 CẤU TRÚC FILES

### Script Files
```
scripts/
├── auto-init-db.js           # Auto-init script (NEW!)
├── init-db.js                # Original init script
├── add-indexes.sql           # Performance indexes
└── add-client-error-tables.sql  # Client error tracking
```

### Auto-init Logic Flow
```
1. Connect to MySQL (without database)
2. CREATE DATABASE IF NOT EXISTS kho_mvg
3. USE kho_mvg
4. Check if tables exist
   ├─ No  → Run full initialization
   │        ├─ Create all tables (init-db.js)
   │        ├─ Apply indexes (add-indexes.sql)
   │        ├─ Create client error tables
   │        └─ Create admin user
   └─ Yes → Run updates only
            ├─ Apply new indexes (if any)
            ├─ Create missing tables
            └─ Check admin user
5. Display database summary
6. Continue with server startup
```

---

## 📊 DATABASE SCHEMA

### Core Tables (Tự động tạo)
```
✅ users                    - User accounts
✅ projects                 - Warehouse projects
✅ customers                - Customers
✅ contracts                - Contracts
✅ warehouse_zones          - Warehouse zones
✅ user_project_permissions - Project assignments
✅ user_ai_configs          - AI configurations
✅ ai_chat_sessions         - AI chat sessions
✅ ai_chat_messages         - AI messages
✅ ai_query_cache           - Query cache
✅ user_logs                - Activity logs
✅ database_schema_docs     - Schema documentation
✅ ai_function_definitions  - AI functions
✅ client_errors            - Client-side errors
✅ client_analytics         - Analytics tracking
```

---

## 🔐 ADMIN USER

### Default Admin Account
- **Username**: `admin`
- **Password**: Random 32-character secure password
- **Role**: `admin`
- **Permissions**: `["all"]`

### Lấy lại password admin
Password hiển thị trong console khi admin được tạo lần đầu.

Nếu quên:
1. Stop server
2. Xóa user admin trong database:
   ```sql
   DELETE FROM users WHERE username = 'admin';
   ```
3. Start server lại → admin mới sẽ được tạo

---

## 🛠️ TROUBLESHOOTING

### Lỗi: "Cannot connect to MySQL"
**Nguyên nhân**: MySQL server không chạy

**Giải pháp**:
```bash
# Windows
net start MySQL80

# Linux/Mac
sudo service mysql start
# hoặc
sudo systemctl start mysql
```

---

### Lỗi: "Access denied for user 'root'"
**Nguyên nhân**: Sai password MySQL

**Giải pháp**:
1. Cập nhật file `.env`:
   ```bash
   DB_PASSWORD=your_mysql_password
   ```
2. Restart server

---

### Lỗi: "Table already exists"
**Nguyên nhân**: Bình thường, script bỏ qua các bảng đã tồn tại

**Giải pháp**: Không cần làm gì, đây là warning vô hại

---

### Reset hoàn toàn database
```bash
# 1. Drop database
mysql -u root -p -e "DROP DATABASE IF EXISTS kho_mvg;"

# 2. Start server (sẽ tự tạo lại)
npm run start
```

---

## 📝 MANUAL DATABASE SETUP (Không khuyến nghị)

Nếu bạn muốn setup thủ công (không dùng auto-init):

```bash
# 1. Tạo database
mysql -u root -p -e "CREATE DATABASE kho_mvg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Run init script
mysql -u root -p kho_mvg < scripts/init-db.sql

# 3. Apply indexes
mysql -u root -p kho_mvg < scripts/add-indexes.sql

# 4. Apply client error tables
mysql -u root -p kho_mvg < scripts/add-client-error-tables.sql
```

**Lưu ý**: Bạn vẫn cần tạo admin user thủ công sau đó.

---

## ✅ VERIFICATION

### Kiểm tra database đã tạo thành công:

```bash
mysql -u root -p -e "USE kho_mvg; SHOW TABLES;"
```

Kết quả mong đợi:
```
+----------------------------+
| Tables_in_kho_mvg          |
+----------------------------+
| ai_chat_messages           |
| ai_chat_sessions           |
| ai_function_definitions    |
| ai_query_cache             |
| client_analytics           |
| client_errors              |
| contracts                  |
| customers                  |
| database_schema_docs       |
| projects                   |
| user_ai_configs            |
| user_logs                  |
| user_project_permissions   |
| users                      |
| warehouse_zones            |
+----------------------------+
```

### Kiểm tra admin user:
```bash
mysql -u root -p -e "USE kho_mvg; SELECT username, email, role FROM users WHERE role='admin';"
```

---

## 🎯 BEST PRACTICES

1. **Luôn backup database** trước khi upgrade:
   ```bash
   mysqldump -u root -p kho_mvg > backup_$(date +%Y%m%d).sql
   ```

2. **Set mật khẩu admin mạnh** trong production:
   ```bash
   # .env
   DEFAULT_ADMIN_PASSWORD=your-super-secure-password
   ```

3. **Monitor database size** định kỳ:
   ```sql
   SELECT 
       table_name,
       ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
   FROM information_schema.TABLES
   WHERE table_schema = 'kho_mvg'
   ORDER BY size_mb DESC;
   ```

4. **Regular maintenance**:
   ```sql
   OPTIMIZE TABLE users, projects, contracts;
   ANALYZE TABLE users, projects, contracts;
   ```

---

## 🚀 PRODUCTION DEPLOYMENT

### 1. Update .env cho production
```bash
DB_HOST=your-production-db-host
DB_USER=kho_mvg_user
DB_PASSWORD=super-secure-production-password
DB_NAME=kho_mvg_prod
```

### 2. Tắt auto-init nếu muốn kiểm soát manual
Comment out phần auto-init trong `server.js`:
```javascript
// const DatabaseAutoInit = require('./scripts/auto-init-db');
// const autoInit = new DatabaseAutoInit();
// await autoInit.run();
```

### 3. Run migration scripts manual
```bash
npm run db:init
```

---

## 📚 TÀI LIỆU LIÊN QUAN

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Database Schema](./config/database.js)
- [Migration Scripts](./scripts/)
- [API Documentation](http://localhost:5000/api/docs)

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Maintained By**: KHO MVG Development Team
