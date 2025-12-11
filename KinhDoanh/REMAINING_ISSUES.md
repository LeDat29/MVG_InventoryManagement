# CÁC VẤN ĐỀ CÒN LẠI CẦN XỬ LÝ

## 📌 GIAI ĐOẠN TRUNG HẠN (2-3 Sprints)

### 11. Refactor Duplicate User Listing Logic
**Priority**: MEDIUM  
**Files**: `routes/auth.js`, `routes/users.js`

**Vấn đề**:
```javascript
// routes/auth.js (dòng 489-532)
router.get('/users', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    // User listing logic
});

// routes/users.js (dòng 89-151)
router.get('/', requireRole(['admin', 'manager']), catchAsync(async (req, res) => {
    // Same user listing logic
});
```

**Giải pháp**:
```javascript
// Xóa endpoint /api/auth/users
// Giữ lại chỉ /api/users
// Update tất cả frontend calls từ /api/auth/users → /api/users
```

**Code Change**:
```diff
--- routes/auth.js
+++ routes/auth.js
@@ -486,47 +486,0 @@
-/**
- * GET /api/auth/users - Lấy danh sách users (DEPRECATED)
- */
-router.get('/users', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
-    // Remove entire endpoint - use /api/users instead
-});
```

---

### 12. Thêm Test Coverage
**Priority**: HIGH  
**Impact**: Code reliability, CI/CD

**Cần tạo**:
```
tests/
├── unit/
│   ├── services/
│   │   ├── AIService.test.js
│   │   ├── DatabaseService.test.js
│   │   └── EncryptionService.test.js
│   ├── middleware/
│   │   ├── auth.test.js
│   │   └── errorHandler.test.js
│   └── utils/
│       └── encryption.test.js
├── integration/
│   ├── routes/
│   │   ├── auth.test.js
│   │   ├── projects.test.js
│   │   ├── customers.test.js
│   │   └── ai-assistant.test.js
│   └── database/
│       └── queries.test.js
└── e2e/
    ├── auth-flow.test.js
    ├── project-management.test.js
    └── ai-chat.test.js
```

**Example Test**:
```javascript
// tests/unit/utils/encryption.test.js
const EncryptionService = require('../../../utils/encryption');

describe('EncryptionService', () => {
    beforeAll(() => {
        process.env.ENCRYPTION_KEY = 'test-key-32-characters-long-here';
    });

    describe('encrypt/decrypt', () => {
        it('should encrypt and decrypt correctly', () => {
            const original = 'sk-test-api-key-12345';
            const encrypted = EncryptionService.encrypt(original);
            const decrypted = EncryptionService.decrypt(encrypted);
            
            expect(decrypted).toBe(original);
            expect(encrypted).not.toBe(original);
            expect(encrypted).toContain(':'); // iv:encrypted:tag format
        });

        it('should throw error on invalid encrypted data', () => {
            expect(() => {
                EncryptionService.decrypt('invalid-data');
            }).toThrow();
        });
    });

    describe('maskAPIKey', () => {
        it('should mask middle part of API key', () => {
            const key = 'sk-test-1234567890abcdef';
            const masked = EncryptionService.maskAPIKey(key);
            
            expect(masked).toContain('sk-t');
            expect(masked).toContain('cdef');
            expect(masked).toContain('****');
        });
    });
});
```

**Setup**:
```bash
npm install --save-dev jest supertest
```

```json
// package.json
{
    "scripts": {
        "test": "jest",
        "test:watch": "jest --watch",
        "test:coverage": "jest --coverage"
    },
    "jest": {
        "testEnvironment": "node",
        "coverageDirectory": "coverage",
        "collectCoverageFrom": [
            "services/**/*.js",
            "middleware/**/*.js",
            "routes/**/*.js",
            "utils/**/*.js"
        ]
    }
}
```

---

### 13. Sửa CSS-in-JS trong LoadingSpinner
**Priority**: LOW  
**File**: `client/src/components/Common/LoadingSpinner.js`

**Vấn đề**:
```javascript
// Dòng 51-87
<style jsx>{`
    .spinner-container {
        /* ... */
    }
`}</style>
```

**Giải pháp**:
```javascript
// Option 1: CSS Modules
// LoadingSpinner.module.css
.spinnerContainer {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
}

.spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

// LoadingSpinner.js
import styles from './LoadingSpinner.module.css';

export default function LoadingSpinner({ message = 'Đang tải...' }) {
    return (
        <div className={styles.spinnerContainer}>
            <div className={styles.spinner}></div>
            {message && <p className={styles.message}>{message}</p>}
        </div>
    );
}
```

```javascript
// Option 2: styled-components
import styled from 'styled-components';

const SpinnerContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
`;

const Spinner = styled.div`
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

export default function LoadingSpinner({ message }) {
    return (
        <SpinnerContainer>
            <Spinner />
            {message && <p>{message}</p>}
        </SpinnerContainer>
    );
}
```

---

### 14. Implement Query Caching
**Priority**: MEDIUM  
**Impact**: Performance

**Setup Redis**:
```bash
npm install redis
```

**Implementation**:
```javascript
// config/cache.js
const redis = require('redis');
const { logger } = require('./logger');

let redisClient = null;

async function connectRedis() {
    try {
        redisClient = redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            retry_strategy: (options) => {
                if (options.error && options.error.code === 'ECONNREFUSED') {
                    logger.error('Redis connection refused');
                    return new Error('Redis connection refused');
                }
                if (options.total_retry_time > 1000 * 60 * 60) {
                    return new Error('Redis retry time exhausted');
                }
                if (options.attempt > 10) {
                    return undefined;
                }
                return Math.min(options.attempt * 100, 3000);
            }
        });

        await redisClient.connect();
        logger.info('✅ Redis connected successfully');
    } catch (error) {
        logger.error('Redis connection failed:', error);
        redisClient = null;
    }
}

async function getCached(key) {
    if (!redisClient) return null;
    try {
        const cached = await redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        logger.error('Cache get error:', error);
        return null;
    }
}

async function setCache(key, value, ttl = 3600) {
    if (!redisClient) return;
    try {
        await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
        logger.error('Cache set error:', error);
    }
}

async function deleteCache(key) {
    if (!redisClient) return;
    try {
        await redisClient.del(key);
    } catch (error) {
        logger.error('Cache delete error:', error);
    }
}

module.exports = {
    connectRedis,
    getCached,
    setCache,
    deleteCache
};
```

**Usage Example**:
```javascript
// routes/projects.js
const { getCached, setCache } = require('../config/cache');

router.get('/', authenticateToken, async (req, res) => {
    const cacheKey = `projects:list:${req.user.id}:${JSON.stringify(req.query)}`;
    
    // Try cache first
    const cached = await getCached(cacheKey);
    if (cached) {
        return res.json({
            success: true,
            data: cached,
            from_cache: true
        });
    }
    
    // Query database
    const [projects] = await pool.execute(/* ... */);
    
    // Cache for 5 minutes
    await setCache(cacheKey, projects, 300);
    
    res.json({
        success: true,
        data: projects,
        from_cache: false
    });
});
```

---

### 15. API Key Rotation Mechanism
**Priority**: MEDIUM  
**Impact**: Security

**Database Schema**:
```sql
ALTER TABLE user_ai_configs 
ADD COLUMN key_expires_at DATETIME NULL,
ADD COLUMN key_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN rotation_reminder_sent BOOLEAN DEFAULT FALSE;
```

**Implementation**:
```javascript
// services/APIKeyRotationService.js
class APIKeyRotationService {
    static async checkExpiringKeys() {
        const pool = mysqlPool();
        
        // Find keys expiring in 7 days
        const [expiringKeys] = await pool.execute(`
            SELECT uac.*, u.email, u.full_name
            FROM user_ai_configs uac
            JOIN users u ON uac.user_id = u.id
            WHERE uac.key_expires_at IS NOT NULL
            AND uac.key_expires_at <= DATE_ADD(NOW(), INTERVAL 7 DAY)
            AND uac.rotation_reminder_sent = FALSE
        `);
        
        for (const config of expiringKeys) {
            // Send email notification
            await this.sendRotationReminder(config);
            
            // Mark as sent
            await pool.execute(
                'UPDATE user_ai_configs SET rotation_reminder_sent = TRUE WHERE id = ?',
                [config.id]
            );
        }
    }
    
    static async rotateAPIKey(configId, newApiKey, userId) {
        const EncryptionService = require('../utils/encryption');
        const pool = mysqlPool();
        
        // Encrypt new key
        const encrypted = EncryptionService.encrypt(newApiKey);
        
        // Update with new expiry (90 days)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90);
        
        await pool.execute(`
            UPDATE user_ai_configs 
            SET api_key = ?, 
                key_created_at = NOW(),
                key_expires_at = ?,
                rotation_reminder_sent = FALSE,
                updated_by = ?
            WHERE id = ?
        `, [encrypted, expiryDate, userId, configId]);
        
        logger.info('API key rotated', { configId, userId });
    }
}

module.exports = APIKeyRotationService;
```

**Cron Job**:
```javascript
// server.js
const cron = require('node-cron');
const APIKeyRotationService = require('./services/APIKeyRotationService');

// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
    logger.info('Running API key rotation check');
    await APIKeyRotationService.checkExpiringKeys();
});
```

---

## 📌 GIAI ĐOẠN DÀI HẠN (3-6 tháng)

### 16. TypeScript Migration
**Priority**: LOW  
**Impact**: Developer experience, type safety

**Steps**:
1. Install TypeScript
```bash
npm install --save-dev typescript @types/node @types/express
npx tsc --init
```

2. Configure `tsconfig.json`
```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "lib": ["ES2020"],
        "outDir": "./dist",
        "rootDir": "./",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true
    },
    "include": ["**/*.ts"],
    "exclude": ["node_modules", "dist"]
}
```

3. Rename files `.js` → `.ts` incrementally
4. Add type definitions
5. Fix type errors
6. Update build/run scripts

---

### 17. Automatic API Documentation
**Priority**: LOW  
**File**: `routes/apiDocs.js`

**Current TODO** (line 370):
```javascript
// TODO: Implement automatic route scanning from Express app
```

**Solution**:
```javascript
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'KHO MVG API',
            version: '1.0.0',
        },
    },
    apis: ['./routes/*.js'], // Auto-scan all route files
};

const specs = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

---

### 18. Create Missing Route Handlers
**Priority**: LOW  
**File**: `routes/projects.js` (lines 582-584)

**Missing files**:
- `routes/projectTasks.js`
- `routes/projectFiles.js`

**Implementation**:
```javascript
// routes/projectTasks.js
const express = require('express');
const router = express.Router({ mergeParams: true });

// GET /api/projects/:projectId/tasks
router.get('/', async (req, res) => {
    const { projectId } = req.params;
    // Implementation
});

// POST /api/projects/:projectId/tasks
router.post('/', async (req, res) => {
    // Implementation
});

module.exports = router;
```

---

### 19. CSRF Protection
**Priority**: MEDIUM  
**Impact**: Security

```bash
npm install csurf
```

```javascript
// server.js
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Apply to state-changing routes
app.use('/api/users', csrfProtection);
app.use('/api/projects', csrfProtection);
app.use('/api/customers', csrfProtection);

// Send token to client
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});
```

---

### 20. Comprehensive Audit System
**Priority**: LOW  
**Impact**: Compliance

**Enhanced Audit Table**:
```sql
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    old_values JSON,
    new_values JSON,
    changes JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_audit_user (user_id, created_at),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_action (action, created_at)
);
```

---

## 📊 PRIORITY SUMMARY

### Must Fix Soon (Next Sprint)
1. ✅ Refactor duplicate user listing
2. ✅ Add basic test coverage (unit tests)
3. ✅ Fix LoadingSpinner CSS

### Should Fix (Within 2-3 months)
4. Query caching with Redis
5. API key rotation
6. CSRF protection
7. Create missing route handlers

### Nice to Have (Future)
8. TypeScript migration
9. Automatic API docs
10. Comprehensive audit system

---

## 🎯 ESTIMATED EFFORT

- **Trung hạn issues**: ~40-60 hours
- **Dài hạn issues**: ~80-120 hours
- **Total**: ~120-180 hours (15-23 developer days)

---

**Last Updated**: 2024  
**Status**: ⏳ Pending Implementation
