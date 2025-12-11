/**
 * AIService Tests - KHO MVG (Simplified)
 */

jest.mock('../../../services/DatabaseService');
jest.mock('../../../utils/encryption');
jest.mock('axios');

const axios = require('axios');
const AIService = require('../../../services/AIService');
const DatabaseService = require('../../../services/DatabaseService');
const EncryptionService = require('../../../utils/encryption');

describe('AIService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock database
        DatabaseService.executeQuery = jest.fn();
        
        // Mock encryption
        EncryptionService.decrypt = jest.fn().mockReturnValue('decrypted-key');
    });

    describe('getOptimalAIConfig', () => {
        it('should return lowest cost active config', async () => {
            const mockConfigs = [
                { id: 1, cost_per_token: 0.002, is_active: true },
                { id: 2, cost_per_token: 0.001, is_active: true },
                { id: 3, cost_per_token: 0.003, is_active: false }
            ];
            
            DatabaseService.executeQuery.mockResolvedValue([mockConfigs]);
            
            const result = await AIService.getOptimalAIConfig(1, 'openai');
            
            expect(result.id).toBe(2); // Lowest cost active config
        });

        it('should return null if no config found', async () => {
            DatabaseService.executeQuery.mockResolvedValue([[]]);
            
            const result = await AIService.getOptimalAIConfig(1, 'openai');
            
            expect(result).toBeNull();
        });

        it('should handle database errors gracefully', async () => {
            DatabaseService.executeQuery.mockRejectedValue(new Error('DB Error'));
            
            const result = await AIService.getOptimalAIConfig(1, 'openai');
            
            expect(result).toBeNull();
        });
    });

    describe('detectDataQuery', () => {
        it('should detect data query keywords', () => {
            expect(AIService.detectDataQuery('Show me users data')).toBe(true);
            expect(AIService.detectDataQuery('List all projects')).toBe(true);
            expect(AIService.detectDataQuery('Get customer information')).toBe(true);
        });

        it('should not detect general conversation', () => {
            expect(AIService.detectDataQuery('Hello how are you?')).toBe(false);
            expect(AIService.detectDataQuery('What is the weather?')).toBe(false);
        });

        it('should be case-insensitive', () => {
            expect(AIService.detectDataQuery('SHOW ME DATA')).toBe(true);
            expect(AIService.detectDataQuery('list users')).toBe(true);
        });
    });

    describe('extractSQLFromResponse', () => {
        it('should extract SQL from <SQL> tags', () => {
            const response = 'Here is your query: <SQL>SELECT * FROM users</SQL>';
            const result = AIService.extractSQLFromResponse(response);
            expect(result).toBe('SELECT * FROM users');
        });

        it('should extract SQL without tags if starts with SELECT', () => {
            const response = 'SELECT * FROM projects WHERE status = "active"';
            const result = AIService.extractSQLFromResponse(response);
            expect(result).toBe('SELECT * FROM projects WHERE status = "active"');
        });

        it('should return null if no SQL found', () => {
            const response = 'This is just a regular response.';
            const result = AIService.extractSQLFromResponse(response);
            expect(result).toBeNull();
        });

        it('should handle case-insensitive tags', () => {
            const response = 'Query: <sql>SELECT COUNT(*) FROM users</sql>';
            const result = AIService.extractSQLFromResponse(response);
            expect(result).toBe('SELECT COUNT(*) FROM users');
        });
    });

    describe('updateAIConfigUsage', () => {
        it('should increment usage count and cost', async () => {
            DatabaseService.executeQuery.mockResolvedValue([{ affectedRows: 1 }]);
            
            await AIService.updateAIConfigUsage(1, 100, 0.002);
            
            expect(DatabaseService.executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE user_ai_configs'),
                expect.arrayContaining([100, 0.002, 1])
            );
        });

        it('should handle database errors gracefully', async () => {
            DatabaseService.executeQuery.mockRejectedValue(new Error('DB Error'));
            
            // Should not throw
            await expect(AIService.updateAIConfigUsage(1, 100, 0.002)).resolves.not.toThrow();
        });
    });
});