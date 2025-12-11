# 🚀 QUICK START GUIDE - KHO MVG

## ⚡ Khởi động nhanh chỉ với 2 bước!

### Bước 1: Đảm bảo MySQL đang chạy
```bash
# Windows
net start MySQL80

# Linux/Mac
sudo service mysql start
```

### Bước 2: Start server
```bash
npm run start
```

**Xong!** 🎉

---

## 📋 CHI TIẾT NHỮNG GÌ XẢY RA

### Khi bạn chạy `npm run start`:

✅ **Tự động:**
1. Kết nối MySQL (localhost, root, no password)
2. Tạo database `kho_mvg`
3. Tạo tất cả tables cần thiết
4. Áp dụng indexes để tối ưu
5. Tạo admin user với password random an toàn
6. Khởi động server tại `http://localhost:5000`

### Console sẽ hiển thị:
```
================================================================================
🚀 AUTO DATABASE INITIALIZATION - KHO MVG
================================================================================

✅ Kết nối MySQL thành công
✅ Database 'kho_mvg' đã sẵn sàng
✅ Tables cơ bản đã được tạo
✅ Indexes đã được áp dụng
✅ Admin user đã được tạo

================================================================================
🔐 THÔNG TIN ĐĂNG NHẬP ADMIN:
   Username: admin
   Password: a1b2c3d4e5f6...  <-- LƯU LẠI PASSWORD NÀY!
   ⚠️  QUAN TRỌNG: Đổi mật khẩu này NGAY sau lần đăng nhập đầu tiên!
================================================================================

🚀 KHO MVG Server đang chạy tại port 5000
📚 API Docs: http://localhost:5000/api/docs
```

---

## 🔑 ĐĂNG NHẬP

1. Mở browser: `http://localhost:5000`
2. Đăng nhập với:
   - **Username**: `admin`
   - **Password**: (copy từ console output)
3. Đổi password ngay sau khi đăng nhập

---

## 🛠️ CÁC LỆNH HỮU ÍCH

```bash
# Start server (production mode)
npm run start

# Start with auto-reload (development)
npm run dev

# Reset database (xóa và tạo lại)
npm run db:reset

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

---

## 📍 ENDPOINTS QUAN TRỌNG

- **Frontend**: http://localhost:5000
- **API Docs**: http://localhost:5000/api/docs
- **Health Check**: http://localhost:5000/api/health
- **Login API**: http://localhost:5000/api/auth/login

---

## ⚙️ CẤU HÌNH TÙY CHỈNH (Optional)

Nếu MySQL của bạn khác với mặc định (localhost, root, no password):

### Chỉnh sửa file `.env`:
```bash
# MySQL Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=kho_mvg
```

Sau đó start lại server:
```bash
npm run start
```

---

## 🐛 TROUBLESHOOTING

### ❌ Lỗi: "Cannot connect to MySQL"
**Giải pháp**: Bật MySQL server
```bash
net start MySQL80
```

### ❌ Lỗi: "Access denied"
**Giải pháp**: Kiểm tra password trong file `.env`

### ❌ Port 5000 đã được sử dụng
**Giải pháp**: Đổi port trong `.env`
```bash
PORT=3000
```

---

## 📚 TÀI LIỆU

- **Setup chi tiết**: [DATABASE_SETUP.md](./DATABASE_SETUP.md)
- **API Documentation**: http://localhost:5000/api/docs
- **Test Guide**: [tests/README.md](./tests/README.md)

---

## ✅ CHECKLIST

- [x] MySQL đang chạy
- [x] File `.env` đã được tạo
- [x] Run `npm run start`
- [ ] Lưu admin password từ console
- [ ] Đăng nhập và đổi password
- [ ] Bắt đầu sử dụng!

---

**Cần hỗ trợ?** Check [DATABASE_SETUP.md](./DATABASE_SETUP.md) để biết thêm chi tiết!
