/**
 * Unit Tests for EncryptionService
 * Test encryption, decryption, masking, and security features
 */

const EncryptionService = require('../../../utils/encryption');

describe('EncryptionService', () => {
    beforeAll(() => {
        // Set test encryption key (32+ characters)
        process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long-minimum';
    });

    afterAll(() => {
        delete process.env.ENCRYPTION_KEY;
    });

    describe('getEncryptionKey', () => {
        it('should throw error if ENCRYPTION_KEY not set', () => {
            delete process.env.ENCRYPTION_KEY;
            expect(() => {
                EncryptionService.getEncryptionKey();
            }).toThrow('ENCRYPTION_KEY không được cấu hình');
            process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long-minimum';
        });

        it('should throw error if ENCRYPTION_KEY too short', () => {
            process.env.ENCRYPTION_KEY = 'short';
            expect(() => {
                EncryptionService.getEncryptionKey();
            }).toThrow('ENCRYPTION_KEY phải có độ dài ít nhất 32 ký tự');
            process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long-minimum';
        });

        it('should return valid key for correct input', () => {
            const key = EncryptionService.getEncryptionKey();
            expect(key).toBeDefined();
            expect(Buffer.isBuffer(key)).toBe(true);
            expect(key.length).toBe(32); // AES-256 requires 32 bytes
        });
    });

    describe('encrypt/decrypt', () => {
        it('should encrypt and decrypt text correctly', () => {
            const original = 'sk-test-api-key-1234567890abcdef';
            const encrypted = EncryptionService.encrypt(original);
            const decrypted = EncryptionService.decrypt(encrypted);

            expect(decrypted).toBe(original);
        });

        it('should produce different encrypted output each time', () => {
            const original = 'test-data';
            const encrypted1 = EncryptionService.encrypt(original);
            const encrypted2 = EncryptionService.encrypt(original);

            expect(encrypted1).not.toBe(encrypted2); // Different IVs
            expect(EncryptionService.decrypt(encrypted1)).toBe(original);
            expect(EncryptionService.decrypt(encrypted2)).toBe(original);
        });

        it('should return null for null input', () => {
            expect(EncryptionService.encrypt(null)).toBeNull();
            expect(EncryptionService.decrypt(null)).toBeNull();
        });

        it('should return null for empty string', () => {
            expect(EncryptionService.encrypt('')).toBeNull();
            expect(EncryptionService.decrypt('')).toBeNull();
        });

        it('encrypted text should contain iv:encrypted:tag format', () => {
            const original = 'test-data';
            const encrypted = EncryptionService.encrypt(original);

            const parts = encrypted.split(':');
            expect(parts.length).toBe(3);
            expect(parts[0].length).toBeGreaterThan(0); // IV
            expect(parts[1].length).toBeGreaterThan(0); // Encrypted data
            expect(parts[2].length).toBeGreaterThan(0); // Auth tag
        });

        it('should throw error for invalid encrypted format', () => {
            expect(() => {
                EncryptionService.decrypt('invalid-format');
            }).toThrow('Định dạng dữ liệu mã hóa không hợp lệ');
        });

                it('should throw error for tampered encrypted data', () => {
            const text = 'sensitive data';
            const encrypted = EncryptionService.encrypt(text);
            
            // Tamper with the encrypted data by changing one character
            const parts = encrypted.split(':');
            const tampered = parts[0] + ':' + parts[1].slice(0, -2) + 'xx:' + parts[2];
            
            expect(() => {
                EncryptionService.decrypt(tampered);
            }).toThrow();
        });

        it('should handle special characters', () => {
            const specialChars = 'Test!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
            const encrypted = EncryptionService.encrypt(specialChars);
            const decrypted = EncryptionService.decrypt(encrypted);

            expect(decrypted).toBe(specialChars);
        });

        it('should handle Unicode characters', () => {
            const unicode = 'Tiếng Việt có dấu 中文 日本語 🎉';
            const encrypted = EncryptionService.encrypt(unicode);
            const decrypted = EncryptionService.decrypt(encrypted);

            expect(decrypted).toBe(unicode);
        });

        it('should handle long text', () => {
            const longText = 'a'.repeat(10000);
            const encrypted = EncryptionService.encrypt(longText);
            const decrypted = EncryptionService.decrypt(encrypted);

            expect(decrypted).toBe(longText);
        });
    });

    describe('maskAPIKey', () => {
        it('should mask API key showing first 4 and last 4 chars', () => {
            const apiKey = 'sk-test-1234567890abcdef';
            const masked = EncryptionService.maskAPIKey(apiKey);

            expect(masked).toContain('sk-t');
            expect(masked).toContain('cdef');
            expect(masked).toContain('****');
            expect(masked).not.toContain('1234567890ab');
        });

        it('should handle short API keys', () => {
            const shortKey = 'short';
            const masked = EncryptionService.maskAPIKey(shortKey);

            expect(masked).toBe('****');
        });

        it('should return **** for null or empty', () => {
            expect(EncryptionService.maskAPIKey(null)).toBe('****');
            expect(EncryptionService.maskAPIKey('')).toBe('****');
        });

        it('should limit masked middle section', () => {
            const veryLongKey = 'a'.repeat(100);
            const masked = EncryptionService.maskAPIKey(veryLongKey);
            const middleStars = masked.match(/\*+/)[0];

            expect(middleStars.length).toBeLessThanOrEqual(20);
        });
    });

    describe('hash', () => {
        it('should generate consistent hash for same input', () => {
            const text = 'test-data';
            const hash1 = EncryptionService.hash(text);
            const hash2 = EncryptionService.hash(text);

            expect(hash1).toBe(hash2);
        });

        it('should generate different hashes for different inputs', () => {
            const hash1 = EncryptionService.hash('test1');
            const hash2 = EncryptionService.hash('test2');

            expect(hash1).not.toBe(hash2);
        });

        it('should return 64-character hex string (SHA-256)', () => {
            const hash = EncryptionService.hash('test');
            expect(hash.length).toBe(64);
            expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
        });
    });

    describe('generateToken', () => {
        it('should generate random tokens', () => {
            const token1 = EncryptionService.generateToken();
            const token2 = EncryptionService.generateToken();

            expect(token1).not.toBe(token2);
        });

        it('should generate token with specified length', () => {
            const token16 = EncryptionService.generateToken(16);
            const token32 = EncryptionService.generateToken(32);

            expect(token16.length).toBe(32); // 16 bytes = 32 hex chars
            expect(token32.length).toBe(64); // 32 bytes = 64 hex chars
        });

        it('should generate hexadecimal string', () => {
            const token = EncryptionService.generateToken();
            expect(/^[a-f0-9]+$/.test(token)).toBe(true);
        });
    });

    describe('secureCompare', () => {
        it('should return true for identical strings', () => {
            const str = 'test-string';
            expect(EncryptionService.secureCompare(str, str)).toBe(true);
        });

        it('should return false for different strings', () => {
            expect(EncryptionService.secureCompare('test1', 'test2')).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(EncryptionService.secureCompare(null, 'test')).toBe(false);
            expect(EncryptionService.secureCompare('test', null)).toBe(false);
            expect(EncryptionService.secureCompare(null, null)).toBe(false);
        });

        it('should be timing-safe (same time for different lengths)', () => {
            const short = 'a';
            const long = 'a'.repeat(1000);

            const start1 = process.hrtime.bigint();
            EncryptionService.secureCompare(short, long);
            const time1 = process.hrtime.bigint() - start1;

            const start2 = process.hrtime.bigint();
            EncryptionService.secureCompare(long, short);
            const time2 = process.hrtime.bigint() - start2;

            // Times should be similar (within 10x factor)
            const ratio = Number(time1) / Number(time2);
            expect(ratio).toBeGreaterThan(0.1);
            expect(ratio).toBeLessThan(10);
        });
    });

    describe('encryptObject/decryptObject', () => {
        it('should encrypt and decrypt object correctly', () => {
            const obj = {
                apiKey: 'sk-test-key',
                provider: 'openai',
                model: 'gpt-3.5-turbo',
                config: {
                    temperature: 0.7,
                    maxTokens: 1000
                }
            };

            const encrypted = EncryptionService.encryptObject(obj);
            const decrypted = EncryptionService.decryptObject(encrypted);

            expect(decrypted).toEqual(obj);
        });

        it('should handle arrays', () => {
            const arr = [1, 2, 3, { key: 'value' }];
            const encrypted = EncryptionService.encryptObject(arr);
            const decrypted = EncryptionService.decryptObject(encrypted);

            expect(decrypted).toEqual(arr);
        });

        it('should handle nested objects', () => {
            const nested = {
                level1: {
                    level2: {
                        level3: {
                            value: 'deep'
                        }
                    }
                }
            };

            const encrypted = EncryptionService.encryptObject(nested);
            const decrypted = EncryptionService.decryptObject(encrypted);

            expect(decrypted).toEqual(nested);
        });
    });

    describe('Security Tests', () => {
                it('should not leak information through error messages', () => {
            const invalid = 'invalid:encrypted:data';
            
            try {
                EncryptionService.decrypt(invalid);
                fail('Should have thrown error');
            } catch (error) {
                expect(error.message).toContain('Lỗi giải mã');
            }
        });

        it('should use authenticated encryption (GCM)', () => {
            // Verify tag is present and checked
            const original = 'test';
            const encrypted = EncryptionService.encrypt(original);
            const parts = encrypted.split(':');

            // Tamper with encrypted data but keep tag
            const tampered = `${parts[0]}:${'0'.repeat(parts[1].length)}:${parts[2]}`;

            expect(() => {
                EncryptionService.decrypt(tampered);
            }).toThrow();
        });
    });
});
