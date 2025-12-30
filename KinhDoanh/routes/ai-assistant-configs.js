
/**
 * AI Assistant Configs Routes - KHO MVG
 * Quản lý cấu hình AI cho users
 */

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { logger } = require('../config/logger');
const { catchAsync } = require('../middleware/errorHandler');
const { requireAuth, requirePermission, requireRole } = require('../middleware/auth');
const EncryptionService = require('../utils/encryption');

const router = express.Router();

router.get('/user-configs', requireAuth, async (req, res) => {
  try {
    const pool = mysqlPool();
    const requestedUserId = req.query.user_id;
    const currentUserId = req.user.id;
    
    // Check permission: user can only view their own configs, unless admin/manager
    const targetUserId = requestedUserId || currentUserId;
    if (requestedUserId && requestedUserId != currentUserId) {
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền xem cấu hình AI của user khác'
        });
      }
    }

    const [configs] = await pool.execute(`
      SELECT id, user_id, provider, max_tokens, temperature, 
             cost_per_token, priority, is_active, created_at, updated_at,
             usage_count, total_cost
      FROM user_ai_configs 
      WHERE user_id = ? 
      ORDER BY priority ASC, created_at DESC
    `, [targetUserId]);

    // Mask API keys for security (don't return them)
    const safeConfigs = configs.map(config => ({
      ...config,
      api_key: '****' + (config.api_key ? config.api_key.slice(-4) : '****')
    }));

    await logUserActivity(currentUserId, 'VIEW_AI_CONFIGS', 'ai_config', targetUserId, req.ip, req.get('User-Agent'));

    res.json({
      success: true,
      data: {
        configs: safeConfigs,
        total: configs.length
      }
    });

  } catch (error) {
    console.error('Get AI configs error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải cấu hình AI: ' + error.message
    });
  }
});


router.post('/configs', [
  body('provider').isIn(['openai', 'google', 'anthropic', 'groq', 'cohere']).withMessage('Provider không hợp lệ'),
  body('model_name').notEmpty().withMessage('Model name là bắt buộc'),
  body('api_key').notEmpty().withMessage('API key là bắt buộc'),
  body('max_tokens').optional().isInt({ min: 1, max: 32000 }).withMessage('Max tokens phải từ 1-32000'),
  body('temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature phải từ 0-2'),
  body('cost_per_token').optional().isFloat({ min: 0 }).withMessage('Cost per token phải >= 0'),
  body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority phải từ 1-10')
], requireAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const pool = mysqlPool();
    const {
      user_id,
      provider,
      model_name,
      api_key,
      max_tokens = 4000,
      temperature = 0.7,
      cost_per_token = 0.000,
      priority = 1,
      is_active = true
    } = req.body;

    // Determine target user ID
    const targetUserId = user_id || req.user.id;
    
    // Check permission for adding config to other users
    if (user_id && user_id != req.user.id) {
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền thêm cấu hình AI cho user khác'
        });
      }
    }

    // Check if user already has config for this provider
    const [existing] = await pool.execute(
      'SELECT id FROM user_ai_configs WHERE user_id = ? AND provider = ?',
      [targetUserId, provider]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Đã có cấu hình cho provider ${provider}. Vui lòng cập nhật thay vì tạo mới.`
      });
    }

    // Encrypt API key
    const encryptedApiKey = EncryptionService.encrypt(api_key);

    // Insert new config
    const [result] = await pool.execute(`
      INSERT INTO user_ai_configs (
        user_id, provider, model_name, api_key, max_tokens, 
        temperature, cost_per_token, priority, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      targetUserId, provider, model_name, encryptedApiKey, max_tokens,
      temperature, cost_per_token, priority, is_active
    ]);

    await logUserActivity(req.user.id, 'CREATE_AI_CONFIG', 'ai_config', result.insertId, req.ip, req.get('User-Agent'), {
      provider, model_name, target_user_id: targetUserId
    });

    res.status(201).json({
      success: true,
      message: 'Tạo cấu hình AI thành công',
      data: {
        config_id: result.insertId
      }
    });

  } catch (error) {
    console.error('Create AI config error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo cấu hình AI: ' + error.message
    });
  }
});


router.put('/configs/:id', [
  param('id').isInt().withMessage('Config ID phải là số nguyên'),
  body('model_name').optional().notEmpty().withMessage('Model name không được rỗng'),
  body('api_key').optional().notEmpty().withMessage('API key không được rỗng'),
  body('max_tokens').optional().isInt({ min: 1, max: 32000 }).withMessage('Max tokens phải từ 1-32000'),
  body('temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature phải từ 0-2'),
  body('cost_per_token').optional().isFloat({ min: 0 }).withMessage('Cost per token phải >= 0'),
  body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority phải từ 1-10'),
  body('is_active').optional().isBoolean().withMessage('is_active phải là boolean')
], requireAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const pool = mysqlPool();
    const configId = req.params.id;
    const updates = req.body;

    // Get existing config to check ownership
    const [existing] = await pool.execute(
      'SELECT user_id, provider FROM user_ai_configs WHERE id = ?',
      [configId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cấu hình AI'
      });
    }

    // Check permission
    const configUserId = existing[0].user_id;
    if (configUserId !== req.user.id) {
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền cập nhật cấu hình này'
        });
      }
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];

    if (updates.model_name) {
      updateFields.push('model_name = ?');
      updateValues.push(updates.model_name);
    }
    if (updates.api_key) {
      updateFields.push('api_key = ?');
      updateValues.push(EncryptionService.encrypt(updates.api_key));
    }
    if (updates.max_tokens !== undefined) {
      updateFields.push('max_tokens = ?');
      updateValues.push(updates.max_tokens);
    }
    if (updates.temperature !== undefined) {
      updateFields.push('temperature = ?');
      updateValues.push(updates.temperature);
    }
    if (updates.cost_per_token !== undefined) {
      updateFields.push('cost_per_token = ?');
      updateValues.push(updates.cost_per_token);
    }
    if (updates.priority !== undefined) {
      updateFields.push('priority = ?');
      updateValues.push(updates.priority);
    }
    if (updates.is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(updates.is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có dữ liệu để cập nhật'
      });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(configId);

    await pool.execute(
      `UPDATE user_ai_configs SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    await logUserActivity(req.user.id, 'UPDATE_AI_CONFIG', 'ai_config', configId, req.ip, req.get('User-Agent'), {
      updates: Object.keys(updates)
    });

    res.json({
      success: true,
      message: 'Cập nhật cấu hình AI thành công'
    });

  } catch (error) {
    console.error('Update AI config error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật cấu hình AI: ' + error.message
    });
  }
});


router.delete('/configs/:id', [
  param('id').isInt().withMessage('Config ID phải là số nguyên')
], requireAuth, async (req, res) => {
  try {
    const pool = mysqlPool();
    const configId = req.params.id;

    // Get existing config to check ownership
    const [existing] = await pool.execute(
      'SELECT user_id, provider FROM user_ai_configs WHERE id = ?',
      [configId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cấu hình AI'
      });
    }

    // Check permission
    const configUserId = existing[0].user_id;
    if (configUserId !== req.user.id) {
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền xóa cấu hình này'
        });
      }
    }

    // Delete config
    await pool.execute('DELETE FROM user_ai_configs WHERE id = ?', [configId]);

    await logUserActivity(req.user.id, 'DELETE_AI_CONFIG', 'ai_config', configId, req.ip, req.get('User-Agent'), {
      provider: existing[0].provider
    });

    res.json({
      success: true,
      message: 'Xóa cấu hình AI thành công'
    });

  } catch (error) {
    console.error('Delete AI config error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa cấu hình AI: ' + error.message
    });
  }
});


router.post('/test-config', [
  body('config_id').isInt().withMessage('Config ID phải là số nguyên'),
  body('test_message').optional().isString().withMessage('Test message phải là string')
], requireAuth, async (req, res) => {
  try {
    const { config_id, test_message = 'Hello, this is a test.' } = req.body;
    const pool = mysqlPool();

    // Get config
    const [configs] = await pool.execute(`
      SELECT user_id, provider, model_name, api_key, max_tokens, temperature
      FROM user_ai_configs 
      WHERE id = ? AND is_active = TRUE
    `, [config_id]);

    if (configs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cấu hình AI hoặc cấu hình đã bị vô hiệu hóa'
      });
    }

    const config = configs[0];

    // Check permission
    if (config.user_id !== req.user.id) {
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền test cấu hình này'
        });
      }
    }

    // Decrypt API key
    const apiKey = EncryptionService.decrypt(config.api_key);

    // Test connection based on provider
    const AIService = require('../services/AIService');
    const testResult = await AIService.testConnection(config.provider, {
      ...config,
      api_key: apiKey
    }, test_message);

    if (testResult.success) {
      // Update usage statistics
      await pool.execute(`
        UPDATE user_ai_configs 
        SET usage_count = usage_count + 1, 
            last_used = NOW(),
            updated_at = NOW()
        WHERE id = ?
      `, [config_id]);

      await logUserActivity(req.user.id, 'TEST_AI_CONFIG', 'ai_config', config_id, req.ip, req.get('User-Agent'), {
        provider: config.provider,
        success: true
      });

      res.json({
        success: true,
        message: 'Test kết nối AI thành công',
        data: {
          provider: config.provider,
          model: config.model_name,
          response_preview: testResult.response?.substring(0, 100) + '...'
        }
      });
    } else {
      await logUserActivity(req.user.id, 'TEST_AI_CONFIG', 'ai_config', config_id, req.ip, req.get('User-Agent'), {
        provider: config.provider,
        success: false,
        error: testResult.error
      });

      res.status(400).json({
        success: false,
        message: 'Test kết nối AI thất bại: ' + testResult.error
      });
    }

  } catch (error) {
    console.error('Test AI config error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi test cấu hình AI: ' + error.message
    });
  }
});

module.exports = router;