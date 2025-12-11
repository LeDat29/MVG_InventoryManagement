# HƯỚNG DẪN TRIỂN KHAI CÁC THAY ĐỔI - KHO MVG

Tài liệu này hướng dẫn triển khai các sửa lỗi và cải tiến đã được thực hiện trong code review.

## 📋 TỔNG QUAN CÁC THAY ĐỔI

### ✅ GIAI ĐOẠN 1: KHẨN CẤP (Đã hoàn thành)
1. ✅ Sửa mật khẩu admin mặc định
2. ✅ Triển khai gọi AI provider thực tế (OpenAI, Gemini, Claude)
3. ✅ Hoàn thành phân quyền phân công dự án
4. ✅ Thêm ngăn chặn SQL injection nâng cao
5. ✅ Mã hóa API keys khi lưu trữ

### ✅ GIAI ĐOẠN 2: NGẮN HẠN (Đã hoàn thành)
6. ✅ Thay thế console.log/error bằng proper logging
7. ✅ Thêm input validation cho AI prompts
8. ✅ Sửa date validation trong contracts
9. ✅ Tạo database indexes cho hiệu suất
10. ✅ Thêm error reporting service

---

## 🚀 HƯỚNG DẪN TRIỂN KHAI

### Bước 1: Cập nhật Dependencies

```bash
# Cài đặt các package cần thiết (nếu chưa có)
npm install axios
```

### Bước 2: Cấu hình Environment Variables

Thêm các biến môi trường mới vào file `.env`:

```bash
# Copy từ .env.example
cp .env.example .env

# Thêm các biến sau:
DEFAULT_ADMIN_PASSWORD=your-secure-password-here
ENCRYPTION_KEY=your-32-character-encryption-key-here-minimum
```

⚠️ **QUAN TRỌNG**: 
- `ENCRYPTION_KEY` phải có độ dài ít nhất 32 ký tự
- Nên sử dụng chuỗi random phức tạp
- KHÔNG commit file `.env` vào git

### Bước 3: Chạy Database Migrations

```bash
# 1. Thêm database indexes để tối ưu hiệu suất
mysql -u root -p kho_mvg < scripts/add-indexes.sql

# 2. Tạo bảng client errors và analytics
mysql -u root -p kho_mvg < scripts/add-client-error-tables.sql
```

### Bước 4: Migrate Existing API Keys (Nếu có data cũ)

Chạy script migrate để mã hóa các API keys đã tồn tại:

```javascript
// scripts/migrate-encrypt-api-keys.js
const { mysqlPool } = require('../config/database');
const EncryptionService = require('../utils/encryption');
const { logger } = require('../config/logger');

async function migrateAPIKeys() {
    try {
        const pool = mysqlPool();
        
        // Get all unencrypted API keys
        const [configs] = await pool.execute(
            'SELECT id, api_key FROM user_ai_configs WHERE api_key IS NOT NULL'
        );
        
        logger.info(`Found ${configs.length} API keys to encrypt`);
        
        for (const config of configs) {
            try {
                // Try to decrypt - if it fails, it's unencrypted
                EncryptionService.decrypt(config.api_key);
                logger.info(`API key ${config.id} already encrypted, skipping`);
            } catch (error) {
                // Not encrypted, encrypt it now
                const encrypted = EncryptionService.encrypt(config.api_key);
                await pool.execute(
                    'UPDATE user_ai_configs SET api_key = ? WHERE id = ?',
                    [encrypted, config.id]
                );
                logger.info(`Encrypted API key ${config.id}`);
            }
        }
        
        logger.info('API key migration completed');
        process.exit(0);
    } catch (error) {
        logger.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateAPIKeys();
```

Chạy migration:
```bash
node scripts/migrate-encrypt-api-keys.js
```

### Bước 5: Restart Server

```bash
# Development
npm run dev

# Production
pm2 restart kho-mvg
# hoặc
npm start
```

### Bước 6: Verify Changes

1. **Kiểm tra Admin Password**:
   - Xem log khi khởi động server lần đầu
   - Sẽ thấy password mới được tạo tự động
   - Đổi password ngay sau khi đăng nhập

2. **Kiểm tra API Key Encryption**:
   - Thêm AI config mới
   - Verify trong database rằng api_key đã được mã hóa (dạng iv:encrypted:tag)

3. **Kiểm tra Authorization**:
   - Tạo user với role "staff"
   - Gán user vào project cụ thể
   - Verify rằng user chỉ truy cập được project được phân quyền

4. **Kiểm tra AI Integration**:
   - Tạo chat session với AI
   - Gửi tin nhắn và verify response từ AI provider thực tế
   - Kiểm tra cost tracking

5. **Kiểm tra Error Logging**:
   - Mở browser console
   - Trigger một error
   - Kiểm tra bảng `client_errors` trong database

---

## 📊 CÁC FILE ĐÃ THAY ĐỔI

### Backend Files Modified:
- ✅ `config/database.js` - Secure admin password generation
- ✅ `middleware/auth.js` - Complete project authorization
- ✅ `services/DatabaseService.js` - Enhanced SQL injection prevention
- ✅ `services/AIService.js` - Real AI provider implementations
- ✅ `routes/users.js` - API key encryption
- ✅ `routes/ai-assistant.js` - Prompt injection prevention
- ✅ `routes/customers.js` - Better date validation
- ✅ `server.js` - Added client-errors route
- ✅ `.env.example` - Added new environment variables

### New Backend Files Created:
- ✅ `utils/encryption.js` - Encryption service
- ✅ `routes/client-errors.js` - Client error logging endpoint
- ✅ `scripts/add-indexes.sql` - Database indexes
- ✅ `scripts/add-client-error-tables.sql` - Client error tables

### Frontend Files Modified:
- ✅ `client/src/App.js` - Error boundary logging
- ✅ `client/src/contexts/AuthContext.js` - Replace console.error
- ✅ `client/src/pages/Auth/Login.js` - Replace console.error
- ✅ `client/src/components/AI/ChatBot.js` - Replace console.error

### New Frontend Files Created:
- ✅ `client/src/utils/errorLogger.js` - Centralized error logging

---

## 🔐 BẢO MẬT

### API Key Storage
- Tất cả API keys giờ được mã hóa AES-256-GCM
- Chỉ decrypt khi sử dụng
- Không bao giờ log API key ra console/file

### SQL Injection Prevention
- Block tất cả DML/DDL keywords
- Check SQL comments và multi-statement
- Validate UNION-based injection
- Rate limit AI query endpoints

### Prompt Injection Prevention
- Sanitize user input trước khi đưa vào prompt
- Block suspicious patterns
- Limit message length
- Log potential attacks

---

## 📈 HIỆU SUẤT

### Database Indexes Added
- 50+ indexes trên các bảng chính
- Composite indexes cho queries phức tạp
- Full-text search indexes
- Analyze tables sau khi add indexes

### Expected Improvements
- Query time giảm 50-80% cho list operations
- Join operations nhanh hơn đáng kể
- Aggregation queries tối ưu hơn

---

## 🧪 TESTING CHECKLIST

### Security Tests
- [ ] Thử SQL injection với các patterns mới
- [ ] Thử prompt injection với AI
- [ ] Verify API key encryption trong DB
- [ ] Test authorization với staff user
- [ ] Verify admin password không còn hardcoded

### Functionality Tests
- [ ] AI chat với OpenAI/Gemini/Claude
- [ ] Create/update contracts với date validation
- [ ] Error logging từ client
- [ ] Project assignment authorization
- [ ] User AI config management

### Performance Tests
- [ ] Measure query time trước/sau indexes
- [ ] Test với large dataset
- [ ] AI response time tracking
- [ ] Cache hit rate monitoring

---

## 📝 VẤN ĐỀ ĐÃ BIẾT & GIẢI PHÁP

### 1. Legacy API Keys
**Vấn đề**: API keys cũ chưa được mã hóa
**Giải pháp**: Chạy migration script hoặc yêu cầu user nhập lại

### 2. Service Worker Console Logs
**Vấn đề**: Service worker vẫn còn nhiều console.log
**Giải pháp**: Được xử lý trong giai đoạn TRUNG HẠN

### 3. Missing Tests
**Vấn đề**: Chưa có test coverage
**Giải pháp**: Được xử lý trong giai đoạn TRUNG HẠN

---

## 🔄 ROLLBACK PLAN

Nếu gặp vấn đề sau khi deploy:

### Quick Rollback
```bash
# 1. Restore previous code version
git revert HEAD

# 2. Restart server
pm2 restart kho-mvg

# 3. Restore database if needed
mysql -u root -p kho_mvg < backup_before_migration.sql
```

### Partial Rollback
Có thể disable từng tính năng bằng cách:
- Comment route trong `server.js`
- Set feature flag trong `.env`
- Restore specific files từ git

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề trong quá trình triển khai:
1. Kiểm tra logs: `tail -f logs/app.log`
2. Kiểm tra database connectivity
3. Verify environment variables
4. Review migration scripts execution

---

## ✅ CHECKLIST TRIỂN KHAI

- [ ] Backup database trước khi migrate
- [ ] Cập nhật environment variables
- [ ] Chạy database migrations
- [ ] Encrypt existing API keys
- [ ] Restart server
- [ ] Verify admin password changed
- [ ] Test AI integration
- [ ] Test authorization
- [ ] Monitor error logs
- [ ] Check performance metrics

---

## 📚 TÀI LIỆU THAM KHẢO

- [AES-256-GCM Encryption](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [MySQL Index Optimization](https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Prompt Injection Attacks](https://simonwillison.net/2023/Apr/14/worst-that-can-happen/)

---

**Version**: 1.0  
**Last Updated**: 2024  
**Author**: KHO MVG Development Team
