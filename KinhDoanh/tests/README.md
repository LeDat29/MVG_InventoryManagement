# Test Documentation - KHO MVG

## 📋 Tổng Quan

Test suite toàn diện cho hệ thống KHO MVG bao gồm unit tests, integration tests và utilities.

## 🗂️ Cấu Trúc

```
tests/
├── unit/                      # Unit tests
│   ├── utils/                 # Utility tests
│   │   └── encryption.test.js
│   ├── services/              # Service tests
│   │   ├── AIService.test.js
│   │   └── DatabaseService.test.js
│   └── middleware/            # Middleware tests
│       └── auth.test.js
├── integration/               # Integration tests
│   └── routes/                # Route tests
│       ├── auth.test.js
│       └── ai-assistant.test.js
├── setup.js                   # Test setup & global utilities
└── README.md                  # This file
```

## 🚀 Chạy Tests

### Install Dependencies
```bash
npm install --save-dev jest supertest @types/jest babel-jest @babel/preset-env
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode (auto-rerun on changes)
npm run test:watch

# With coverage report
npm run test:coverage

# Verbose output
npm run test:verbose

# CI mode (for pipelines)
npm run test:ci
```

### Run Specific Test File
```bash
# Run single file
npx jest tests/unit/utils/encryption.test.js

# Run tests matching pattern
npx jest --testNamePattern="should encrypt"
```

## 📊 Coverage Reports

After running `npm run test:coverage`, view reports:

- **Terminal**: Immediate summary in console
- **HTML**: Open `coverage/lcov-report/index.html` in browser
- **lcov**: Machine-readable format at `coverage/lcov.info`

### Current Coverage Targets

| Metric     | Target | Current |
|------------|--------|---------|
| Branches   | 60%    | TBD     |
| Functions  | 60%    | TBD     |
| Lines      | 60%    | TBD     |
| Statements | 60%    | TBD     |

## 🧪 Test Categories

### Unit Tests

Test individual functions/modules in isolation:

**✅ Completed:**
- `encryption.test.js` - Encryption/decryption, masking, hashing
- `AIService.test.js` - AI provider calls, caching, validation
- `DatabaseService.test.js` - SQL validation, query execution
- `auth.test.js` - Authentication, authorization, access control

**Example:**
```javascript
describe('EncryptionService', () => {
    it('should encrypt and decrypt correctly', () => {
        const original = 'test-data';
        const encrypted = EncryptionService.encrypt(original);
        const decrypted = EncryptionService.decrypt(encrypted);
        
        expect(decrypted).toBe(original);
    });
});
```

### Integration Tests

Test multiple components working together:

**✅ Completed:**
- `auth.test.js` - Login, logout, password changes
- `ai-assistant.test.js` - Chat sessions, messages, ratings

**Example:**
```javascript
describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ username: 'test', password: 'pass' });
        
        expect(response.status).toBe(200);
        expect(response.body.data.token).toBeDefined();
    });
});
```

## 🛠️ Test Utilities

Global utilities available in all tests:

```javascript
// Create mock user
const user = testHelpers.createMockUser({
    role: 'admin',
    permissions: ['all']
});

// Create mock request/response
const req = testHelpers.createMockRequest({
    body: { username: 'test' }
});
const res = testHelpers.createMockResponse();
const next = testHelpers.createMockNext();

// Wait for async operations
await testHelpers.wait(100);
```

## 📝 Writing New Tests

### Unit Test Template

```javascript
/**
 * Unit Tests for [ComponentName]
 * Test [brief description]
 */

const Component = require('../../../path/to/component');

// Mock dependencies if needed
jest.mock('../../../path/to/dependency');

describe('ComponentName', () => {
    beforeEach(() => {
        // Setup before each test
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Cleanup after each test
    });

    describe('methodName', () => {
        it('should do something specific', () => {
            // Arrange
            const input = 'test';
            
            // Act
            const result = Component.methodName(input);
            
            // Assert
            expect(result).toBe('expected');
        });

        it('should handle error case', () => {
            expect(() => {
                Component.methodName(null);
            }).toThrow('Error message');
        });
    });
});
```

### Integration Test Template

```javascript
/**
 * Integration Tests for [Route/Feature]
 * Test [brief description]
 */

const request = require('supertest');
const app = require('../../../server');

describe('[Route] Routes', () => {
    beforeEach(() => {
        // Setup mocks
    });

    describe('GET /api/endpoint', () => {
        it('should return expected data', async () => {
            const response = await request(app)
                .get('/api/endpoint')
                .set('Authorization', 'Bearer token');
            
            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
        });
    });
});
```

## 🎯 Best Practices

### 1. Test Organization
- One test file per source file
- Group related tests with `describe`
- Clear, descriptive test names

### 2. Test Independence
- Each test should run independently
- Use `beforeEach`/`afterEach` for setup/cleanup
- Don't rely on test execution order

### 3. Mock External Dependencies
```javascript
// Mock database
jest.mock('../../../config/database');

// Mock API calls
jest.mock('axios');

// Mock other services
jest.mock('../../../services/AIService');
```

### 4. Test Coverage
- Aim for 60%+ coverage on critical paths
- Test happy path AND error cases
- Test edge cases and boundary conditions

### 5. Clear Assertions
```javascript
// ❌ Bad
expect(result).toBeTruthy();

// ✅ Good
expect(result.success).toBe(true);
expect(result.data).toHaveLength(5);
expect(result.error).toBeUndefined();
```

## 🐛 Debugging Tests

### Run Single Test
```bash
npx jest -t "should encrypt and decrypt correctly"
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Add Debug Logs
```javascript
it('should do something', () => {
    console.log('Debug:', someVariable);
    // test code
});
```

### Use `.only` for Focus Testing
```javascript
// Only run this test
it.only('should test this specific thing', () => {
    // test code
});
```

## 🔧 Common Issues & Solutions

### Issue: Tests timeout
**Solution:** Increase timeout in jest.config.js or specific test:
```javascript
jest.setTimeout(15000);
// or
it('slow test', async () => {
    // test
}, 15000);
```

### Issue: Mocks not working
**Solution:** Clear mocks between tests:
```javascript
beforeEach(() => {
    jest.clearAllMocks();
});
```

### Issue: Database connections hanging
**Solution:** Mock database properly and close connections:
```javascript
afterAll(async () => {
    await closeConnections();
});
```

## 📈 CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

## 📚 References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
- [JavaScript Testing Guide](https://github.com/goldbergyoni/javascript-testing-best-practices)

## ✅ Test Checklist

Before submitting code:

- [ ] All tests pass locally
- [ ] New code has tests
- [ ] Coverage meets thresholds (60%)
- [ ] No skipped tests (.skip)
- [ ] No focused tests (.only)
- [ ] Tests are independent
- [ ] Mocks are properly cleaned up
- [ ] Test names are descriptive

## 🎓 Next Steps

1. **Add more unit tests:**
   - Client-side components (React)
   - Remaining services
   - Utility functions

2. **Add integration tests:**
   - Projects routes
   - Customers routes
   - Documents routes
   - Users routes

3. **Add E2E tests:**
   - Complete user flows
   - Critical business processes
   - Error scenarios

4. **Improve coverage:**
   - Target 70%+ coverage
   - Focus on critical paths
   - Add edge case tests

---

**Last Updated:** 2024  
**Maintained By:** KHO MVG Development Team
