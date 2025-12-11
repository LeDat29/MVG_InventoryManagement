/**
 * Test Setup Configuration
 * Global test setup, mocks, and utilities
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';

// Mock logger to prevent console spam during tests
jest.mock('../config/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    },
    logUserActivity: jest.fn(),
    logSecurityEvent: jest.fn(),
    initializeLogger: jest.fn()
}));

// Increase timeout for integration tests
jest.setTimeout(10000);

// Global test utilities
global.testHelpers = {
    /**
     * Create mock user object
     */
    createMockUser: (overrides = {}) => ({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'staff',
        permissions: ['project_view'],
        is_active: 1,
        ...overrides
    }),

    /**
     * Create mock database pool
     */
    createMockPool: () => ({
        execute: jest.fn(),
        query: jest.fn(),
        getConnection: jest.fn()
    }),

    /**
     * Create mock request object
     */
    createMockRequest: (overrides = {}) => ({
        body: {},
        params: {},
        query: {},
        headers: {},
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent'),
        ...overrides
    }),

    /**
     * Create mock response object
     */
    createMockResponse: () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        res.sendFile = jest.fn().mockReturnValue(res);
        res.setHeader = jest.fn().mockReturnValue(res);
        return res;
    },

    /**
     * Create mock next function
     */
    createMockNext: () => jest.fn(),

    /**
     * Wait for async operations
     */
    wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))
};

// Clean up after all tests
afterAll(() => {
    // Close any open connections, clear timers, etc.
    jest.clearAllTimers();
});
