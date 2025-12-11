/**
 * Migration Script: Encrypt Existing API Keys
 * Mã hóa tất cả API keys hiện có trong database
 * 
 * QUAN TRỌNG: Chạy script này SAU KHI đã set ENCRYPTION_KEY trong .env
 */

require('dotenv').config();
const { mysqlPool } = require('../config/database');
const EncryptionService = require('../utils/encryption');
const { logger } = require('../config/logger');

async function migrateAPIKeys() {
    console.log('='.repeat(80));
    console.log('MIGRATION: Encrypt API Keys');
    console.log('='.repeat(80));
    
    try {
        // Verify encryption key is set
        if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
            console.error('❌ ENCRYPTION_KEY không được cấu hình hoặc quá ngắn (cần >= 32 ký tự)');
            console.error('   Thêm vào file .env: ENCRYPTION_KEY=your-32-char-key-here');
            process.exit(1);
        }
        
        const pool = mysqlPool();
        
        // Get all API keys
        const [configs] = await pool.execute(
            'SELECT id, user_id, provider, api_key FROM user_ai_configs WHERE api_key IS NOT NULL'
        );
        
        if (configs.length === 0) {
            console.log('✅ Không có API key nào cần migrate');
            process.exit(0);
        }
        
        console.log(`📊 Tìm thấy ${configs.length} API key(s) để xử lý\n`);
        
        let encryptedCount = 0;
        let alreadyEncryptedCount = 0;
        let errorCount = 0;
        
        for (const config of configs) {
            try {
                // Try to decrypt - if it succeeds, it's already encrypted
                const testDecrypt = EncryptionService.decrypt(config.api_key);
                console.log(`⏭️  API Key ID ${config.id} (${config.provider}) - Already encrypted, skipping`);
                alreadyEncryptedCount++;
            } catch (decryptError) {
                // Decryption failed, meaning it's not encrypted yet
                try {
                    const encrypted = EncryptionService.encrypt(config.api_key);
                    
                    await pool.execute(
                        'UPDATE user_ai_configs SET api_key = ? WHERE id = ?',
                        [encrypted, config.id]
                    );
                    
                    console.log(`✅ API Key ID ${config.id} (${config.provider}) - Encrypted successfully`);
                    encryptedCount++;
                } catch (encryptError) {
                    console.error(`❌ API Key ID ${config.id} (${config.provider}) - Encryption failed:`, encryptError.message);
                    errorCount++;
                }
            }
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('MIGRATION SUMMARY:');
        console.log('='.repeat(80));
        console.log(`✅ Encrypted: ${encryptedCount}`);
        console.log(`⏭️  Already encrypted: ${alreadyEncryptedCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log(`📊 Total processed: ${configs.length}`);
        console.log('='.repeat(80));
        
        if (errorCount > 0) {
            console.log('\n⚠️  Có lỗi xảy ra. Vui lòng kiểm tra và chạy lại script.');
            process.exit(1);
        } else {
            console.log('\n✅ Migration hoàn tất thành công!');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('\n❌ Migration thất bại:', error);
        logger.error('API key migration failed:', error);
        process.exit(1);
    }
}

// Run migration
console.log('\n⚠️  CẢNH BÁO: Script này sẽ mã hóa tất cả API keys trong database');
console.log('   Đảm bảo bạn đã backup database trước khi tiếp tục');
console.log('   Nhấn Ctrl+C để hủy, hoặc đợi 5 giây để tiếp tục...\n');

setTimeout(() => {
    migrateAPIKeys();
}, 5000);
