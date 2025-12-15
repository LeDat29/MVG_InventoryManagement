module.exports = {
    preset: 'jest-puppeteer',
    testMatch: ['**/tests/e2e/**/*.test.js'],
    setupFilesAfterEnv: ['expect-puppeteer'],
    testTimeout: 30000, // Increase timeout to 30 seconds
};
