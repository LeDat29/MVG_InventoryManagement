/**
 * Encryption Utility - KHO MVG
 * Xử lý mã hóa và giải mã dữ liệu nhạy cảm như API keys
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;

class EncryptionService {
    /**
     * Lấy encryption key từ env hoặc tạo mới
     */
    static getEncryptionKey() {
        const key = process.env.ENCRYPTION_KEY;
        
        if (!key) {
            throw new Error('ENCRYPTION_KEY không được cấu hình trong biến môi trường');
        }
        
        if (key.length < 32) {
            throw new Error('ENCRYPTION_KEY phải có độ dài ít nhất 32 ký tự');
        }
        
        // Derive a proper 32-byte key from the environment variable
        return crypto.scryptSync(key, 'salt', 32);
    }

    /**
     * Mã hóa chuỗi văn bản
     * @param {string} text - Văn bản cần mã hóa
     * @returns {string} - Chuỗi đã mã hóa (format: iv:encrypted:tag)
     */
    static encrypt(text) {
        try {
            if (!text) return null;
            
            const key = this.getEncryptionKey();
            const iv = crypto.randomBytes(IV_LENGTH);
            const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const tag = cipher.getAuthTag();
            
            // Combine iv:encrypted:tag
            return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
        } catch (error) {
            throw new Error(`Lỗi mã hóa: ${error.message}`);
        }
    }

    /**
     * Giải mã chuỗi đã mã hóa
     * @param {string} encryptedText - Chuỗi đã mã hóa (format: iv:encrypted:tag)
     * @returns {string} - Văn bản gốc
     */
    static decrypt(encryptedText) {
        try {
            if (!encryptedText) return null;
            
            const key = this.getEncryptionKey();
            const parts = encryptedText.split(':');
            
            if (parts.length !== 3) {
                throw new Error('Định dạng dữ liệu mã hóa không hợp lệ');
            }
            
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const tag = Buffer.from(parts[2], 'hex');
            
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(tag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            throw new Error(`Lỗi giải mã: ${error.message}`);
        }
    }

    /**
     * Che giấu một phần API key để hiển thị
     * @param {string} apiKey - API key cần che giấu
     * @returns {string} - API key đã che giấu
     */
    static maskAPIKey(apiKey) {
        if (!apiKey || apiKey.length < 8) {
            return '****';
        }
        
        // Show first 4 and last 4 characters
        const firstPart = apiKey.substring(0, 4);
        const lastPart = apiKey.substring(apiKey.length - 4);
        const maskedMiddle = '*'.repeat(Math.min(apiKey.length - 8, 20));
        
        return `${firstPart}${maskedMiddle}${lastPart}`;
    }

    /**
     * Hash một chuỗi sử dụng SHA-256
     * @param {string} text - Văn bản cần hash
     * @returns {string} - Hash hex
     */
    static hash(text) {
        return crypto.createHash('sha256').update(text).digest('hex');
    }

    /**
     * Tạo random token an toàn
     * @param {number} length - Độ dài token (bytes)
     * @returns {string} - Random token hex
     */
    static generateToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * So sánh hai chuỗi an toàn (timing-safe)
     * @param {string} a - Chuỗi thứ nhất
     * @param {string} b - Chuỗi thứ hai
     * @returns {boolean} - True nếu hai chuỗi giống nhau
     */
    static secureCompare(a, b) {
        if (!a || !b) return false;
        
        const bufferA = Buffer.from(a);
        const bufferB = Buffer.from(b);
        
        if (bufferA.length !== bufferB.length) {
            return false;
        }
        
        return crypto.timingSafeEqual(bufferA, bufferB);
    }

    /**
     * Mã hóa object thành chuỗi JSON được mã hóa
     * @param {object} obj - Object cần mã hóa
     * @returns {string} - Chuỗi đã mã hóa
     */
    static encryptObject(obj) {
        const jsonString = JSON.stringify(obj);
        return this.encrypt(jsonString);
    }

    /**
     * Giải mã chuỗi thành object
     * @param {string} encryptedText - Chuỗi đã mã hóa
     * @returns {object} - Object gốc
     */
    static decryptObject(encryptedText) {
        const jsonString = this.decrypt(encryptedText);
        return JSON.parse(jsonString);
    }
}

module.exports = EncryptionService;
