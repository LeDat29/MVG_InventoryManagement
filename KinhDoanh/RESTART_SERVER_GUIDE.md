# 🔄 HƯỚNG DẪN RESTART SERVER

**Khi nào cần restart**: Sau khi sửa backend code (routes, config, etc.)

---

## ✅ METHOD 1: Simple Restart (Recommended)

### Bước 1: Stop Server
```
Tìm cửa sổ terminal đang chạy server
Nhấn: Ctrl + C
Đợi server stop hoàn toàn
```

### Bước 2: Start Server
```bash
npm start
```

### Bước 3: Wait & Verify
```
Đợi 5-10 giây
See message: "Server running on port 5000"
Test: http://localhost:5000
```

---

## ✅ METHOD 2: Kill Process

### Windows:
```bash
# Option 1: Task Manager
Ctrl + Shift + Esc
→ Details tab
→ Find "node.exe"
→ Right click → End Task

# Option 2: Command
taskkill /F /IM node.exe

# Then start
npm start
```

### After Restart:
```
✅ MongoDB warning: OK (optional feature)
✅ MySQL connected: Check
✅ Server running on port 5000: Check
⚠️ Encoding issue in console: Ignore (cosmetic)
```

---

## 🧪 VERIFY SERVER WORKING

### Test 1: Health Check
```
http://localhost:5000/health
Expected: JSON response
```

### Test 2: API Test
```
http://localhost:5000/api/projects
Expected: 401 Unauthorized (need login) or data
```

### Test 3: Frontend
```
http://localhost:3000/users
Expected: User list loads
```

---

## 🐛 TROUBLESHOOTING

### Issue: Port 5000 already in use
```bash
# Find process
netstat -ano | findstr :5000

# Kill by PID
taskkill /F /PID <PID_NUMBER>

# Start again
npm start
```

### Issue: Module not found
```bash
npm install
npm start
```

### Issue: Database connection error
```bash
# Check MySQL running
# Check .env file
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=kho_mvg
```

---

## ⚡ QUICK COMMANDS

```bash
# Kill all node
taskkill /F /IM node.exe

# Start server
npm start

# Start with logs
npm start > logs.txt 2>&1

# Check if running
curl http://localhost:5000/health
```

---

**Time**: 30 seconds  
**Difficulty**: Easy  
**Required**: Terminal access

