/**
 * AI Config Manager Component
 * Quản lý API keys của các AI models (OpenAI, Gemini, Claude)
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Badge, Alert, Card } from 'react-bootstrap';
import './AIConfigManager.css';

const AI_PROVIDERS = [
  // Paid Providers (with free tier options)
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    description: 'GPT-3.5, GPT-4 (Free: $5 trial)',
    defaultModel: 'gpt-3.5-turbo',
    models: [
      'gpt-3.5-turbo',           // Cheapest paid
      'gpt-3.5-turbo-16k',       // Longer context
      'gpt-4',                   // Most capable
      'gpt-4-turbo',             // Latest
      'gpt-4o-mini',             // New cheaper model
      'gpt-4o'                   // Newest
    ],
    defaultCost: 0.002,
    color: 'success',
    websiteUrl: 'https://platform.openai.com/api-keys',
    isFree: false,
    freeCredit: '$5 trial for new accounts'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '✨',
    description: 'Gemini Pro (FREE 60 calls/min!)',
    defaultModel: 'gemini-pro',
    models: [
      'gemini-pro',              // FREE tier available!
      'gemini-pro-vision',       // FREE with vision
      'gemini-1.5-pro',          // Latest, FREE tier
      'gemini-1.5-flash',        // Faster, FREE tier
      'gemini-ultra'             // Most capable (paid)
    ],
    defaultCost: 0.000,          // FREE tier!
    color: 'primary',
    websiteUrl: 'https://makersuite.google.com/app/apikey',
    isFree: true,                // FREE tier available!
    freeCredit: 'FREE: 60 requests/min, 1500/day'
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    icon: '🧠',
    description: 'Claude 3 (Haiku FREE tier)',
    defaultModel: 'claude-3-haiku-20240307',
    models: [
      'claude-3-haiku-20240307',     // Fastest, cheapest
      'claude-3-5-haiku-20241022',   // Latest Haiku
      'claude-3-sonnet-20240229',    // Balanced
      'claude-3-5-sonnet-20241022',  // Best overall
      'claude-3-opus-20240229'       // Most capable
    ],
    defaultCost: 0.001,
    color: 'warning',
    websiteUrl: 'https://console.anthropic.com/account/keys',
    isFree: false,
    freeCredit: '$5 credit for new accounts'
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    icon: '🐙',
    description: 'Microsoft Azure AI (FREE for students)',
    defaultModel: 'gpt-4o',
    models: [
      'gpt-4o',                  // Latest OpenAI
      'gpt-4o-mini',             // Cheaper version
      'gpt-4-turbo',             // Previous gen
      'gpt-4',                   // Classic
      'gpt-3.5-turbo',           // Cheapest
      'claude-3-5-sonnet',       // Anthropic integration
      'o1-preview',              // Reasoning model
      'o1-mini'                  // Smaller reasoning
    ],
    defaultCost: 0.002,
    color: 'dark',
    websiteUrl: 'https://github.com/settings/copilot',
    isFree: false,
    freeCredit: 'FREE for students & verified educators'
  },
  
  // Free AI Providers
  {
    id: 'huggingface',
    name: 'HuggingFace',
    icon: '🤗',
    description: 'Open Source Models - FREE',
    defaultModel: 'mistralai/Mistral-7B-Instruct-v0.2',
    models: [
      'mistralai/Mistral-7B-Instruct-v0.2',
      'meta-llama/Llama-2-7b-chat-hf',
      'google/flan-t5-xxl',
      'bigscience/bloom'
    ],
    defaultCost: 0.000,
    color: 'info',
    websiteUrl: 'https://huggingface.co/settings/tokens',
    isFree: true
  },
  {
    id: 'cohere',
    name: 'Cohere (Free Tier)',
    icon: '🌊',
    description: 'Trial API - FREE',
    defaultModel: 'command',
    models: ['command', 'command-light', 'command-nightly'],
    defaultCost: 0.000,
    color: 'success',
    websiteUrl: 'https://dashboard.cohere.com/api-keys',
    isFree: true
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    icon: '⚡',
    description: 'Fast Inference - FREE',
    defaultModel: 'mixtral-8x7b-32768',
    models: ['mixtral-8x7b-32768', 'llama2-70b-4096', 'gemma-7b-it'],
    defaultCost: 0.000,
    color: 'danger',
    websiteUrl: 'https://console.groq.com/keys',
    isFree: true
  },
  {
    id: 'together',
    name: 'Together AI',
    icon: '🔥',
    description: 'Open Models - FREE $25',
    defaultModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    models: [
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'togethercomputer/llama-2-7b-chat',
      'teknium/OpenHermes-2.5-Mistral-7B'
    ],
    defaultCost: 0.000,
    color: 'warning',
    websiteUrl: 'https://api.together.xyz/settings/api-keys',
    isFree: true
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    icon: '🔍',
    description: 'Search-augmented - FREE Trial',
    defaultModel: 'pplx-7b-chat',
    models: ['pplx-7b-chat', 'pplx-70b-chat', 'mixtral-8x7b-instruct'],
    defaultCost: 0.000,
    color: 'primary',
    websiteUrl: 'https://www.perplexity.ai/settings/api',
    isFree: true
  }
];

function AIConfigManager({ userId, show, onHide, onSave }) {
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Add/Edit form
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    provider: '',
    api_key: '',
    model: '',
    cost_per_1k_tokens: 0,
    priority: 1,
    is_active: true
  });
  
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (show && userId) {
      loadConfigs();
    }
  }, [show, userId]);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${userId}/ai-configs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setConfigs(data.data.ai_configs || []);
      }
    } catch (error) {
      console.error('Error loading AI configs:', error);
      setError('Không thể tải cấu hình AI');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider) => {
    const providerInfo = AI_PROVIDERS.find(p => p.id === provider);
    if (providerInfo) {
      setFormData(prev => ({
        ...prev,
        provider,
        model: providerInfo.defaultModel,
        cost_per_1k_tokens: providerInfo.defaultCost
      }));
    }
  };

  const handleAddNew = () => {
    setEditingConfig(null);
    setFormData({
      provider: '',
      api_key: '',
      model: '',
      cost_per_1k_tokens: 0,
      priority: configs.length + 1,
      is_active: true
    });
    setShowForm(true);
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setFormData({
      provider: config.provider,
      api_key: '', // Không hiển thị API key cũ
      model: config.model,
      cost_per_1k_tokens: config.cost_per_1k_tokens,
      priority: config.priority,
      is_active: config.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (configId) => {
    if (!window.confirm('Bạn có chắc muốn xóa cấu hình AI này?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${userId}/ai-configs/${configId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess('Đã xóa cấu hình AI');
        loadConfigs();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Không thể xóa cấu hình AI');
    }
  };

  const handleTestConnection = async () => {
    if (!formData.api_key) {
      setError('Vui lòng nhập API key');
      return;
    }
    
    setTestingConnection(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: formData.provider,
          api_key: formData.api_key,
          model: formData.model
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess('✅ Kết nối thành công! API key hợp lệ.');
      } else {
        setError('❌ Kết nối thất bại: ' + data.message);
      }
    } catch (error) {
      setError('❌ Không thể test connection');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    
    if (!formData.provider || !formData.api_key || !formData.model) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const url = editingConfig 
        ? `/api/users/${userId}/ai-configs/${editingConfig.id}`
        : `/api/users/${userId}/ai-configs`;
      
      const method = editingConfig ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess(editingConfig ? 'Cập nhật thành công!' : 'Thêm cấu hình thành công!');
        setShowForm(false);
        loadConfigs();
        
        if (onSave) {
          setTimeout(() => onSave(), 500);
        }
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setError('Có lỗi xảy ra khi lưu cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const selectedProvider = AI_PROVIDERS.find(p => p.id === formData.provider);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-cpu"></i> Quản lý API AI Models
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
        
        {!showForm ? (
          <>
            {/* Header with Add Button */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="mb-0">Danh sách cấu hình AI</h6>
                <small className="text-muted">Hệ thống sẽ tự động chọn model với chi phí thấp nhất</small>
              </div>
              <Button variant="primary" size="sm" onClick={handleAddNew}>
                <i className="bi bi-plus-circle"></i> Thêm cấu hình
              </Button>
            </div>
            
            {/* Configs List */}
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary"></div>
                <p className="mt-2 text-muted">Đang tải...</p>
              </div>
            ) : configs.length === 0 ? (
              <Alert variant="info">
                <i className="bi bi-info-circle"></i> Chưa có cấu hình AI nào. 
                Click "Thêm cấu hình" để bắt đầu sử dụng AI Assistant.
              </Alert>
            ) : (
              <div className="ai-configs-list">
                {configs.map((config, index) => {
                  const providerInfo = AI_PROVIDERS.find(p => p.id === config.provider);
                  
                  return (
                    <Card key={config.id} className="mb-3 config-card">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-2">
                              <span className="provider-icon me-2">{providerInfo?.icon}</span>
                              <h6 className="mb-0">{providerInfo?.name || config.provider}</h6>
                              <Badge bg={config.is_active ? 'success' : 'secondary'} className="ms-2">
                                {config.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              {index === 0 && config.is_active && (
                                <Badge bg="primary" className="ms-2">
                                  <i className="bi bi-star-fill"></i> Ưu tiên
                                </Badge>
                              )}
                            </div>
                            
                            <div className="config-details">
                              <div className="row g-2">
                                <div className="col-md-4">
                                  <small className="text-muted">Model:</small>
                                  <div><strong>{config.model}</strong></div>
                                </div>
                                <div className="col-md-4">
                                  <small className="text-muted">Chi phí:</small>
                                  <div><strong>${config.cost_per_1k_tokens}</strong> /1k tokens</div>
                                </div>
                                <div className="col-md-4">
                                  <small className="text-muted">API Key:</small>
                                  <div className="api-key-masked">
                                    <code>{config.api_key}</code>
                                  </div>
                                </div>
                              </div>
                              
                              {config.usage_count > 0 && (
                                <div className="mt-2 pt-2 border-top">
                                  <small className="text-muted">
                                    <i className="bi bi-graph-up"></i> Đã sử dụng: {config.usage_count} lần
                                    {config.total_cost > 0 && (
                                      <span className="ms-3">
                                        <i className="bi bi-cash"></i> Tổng chi phí: ${config.total_cost.toFixed(4)}
                                      </span>
                                    )}
                                  </small>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="config-actions">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEdit(config)}
                              className="me-1"
                            >
                              <i className="bi bi-pencil"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(config.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Add/Edit Form */}
            <div className="ai-config-form">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">
                  {editingConfig ? 'Chỉnh sửa cấu hình' : 'Thêm cấu hình mới'}
                </h6>
                <Button variant="outline-secondary" size="sm" onClick={() => setShowForm(false)}>
                  <i className="bi bi-arrow-left"></i> Quay lại
                </Button>
              </div>
              
              <Form onSubmit={handleSaveConfig}>
                {/* Provider Selection */}
                <Form.Group className="mb-3">
                  <Form.Label>Chọn AI Provider <span className="text-danger">*</span></Form.Label>
                  <div className="provider-grid">
                    {AI_PROVIDERS.map(provider => (
                      <div
                        key={provider.id}
                        className={`provider-card ${formData.provider === provider.id ? 'selected' : ''} ${provider.isFree ? 'free-provider' : ''}`}
                        onClick={() => handleProviderChange(provider.id)}
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="provider-icon">{provider.icon}</div>
                          {provider.isFree && (
                            <Badge bg="success" className="free-badge">FREE</Badge>
                          )}
                        </div>
                        <div className="provider-name">{provider.name}</div>
                        <small className="provider-desc">{provider.description}</small>
                      </div>
                    ))}
                  </div>
                  {selectedProvider && (
                    <Alert variant="info" className="mt-2 mb-0">
                      <small>
                        <i className="bi bi-info-circle"></i> Lấy API key tại: <a href={selectedProvider.websiteUrl} target="_blank" rel="noopener noreferrer">{selectedProvider.websiteUrl}</a>
                      </small>
                    </Alert>
                  )}
                </Form.Group>
                
                {formData.provider && (
                  <>
                    {/* API Key */}
                    <Form.Group className="mb-3">
                      <Form.Label>API Key <span className="text-danger">*</span></Form.Label>
                      <div className="input-group">
                        <Form.Control
                          type="password"
                          placeholder="sk-..."
                          value={formData.api_key}
                          onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                          required
                        />
                        <Button 
                          variant="outline-primary"
                          onClick={handleTestConnection}
                          disabled={testingConnection || !formData.api_key}
                        >
                          {testingConnection ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1"></span>
                              Testing...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-plug"></i> Test
                            </>
                          )}
                        </Button>
                      </div>
                      <Form.Text className="text-muted">
                        <i className="bi bi-shield-lock"></i> API key sẽ được mã hóa AES-256-GCM trước khi lưu
                      </Form.Text>
                    </Form.Group>
                    
                    {/* Model Selection */}
                    <Form.Group className="mb-3">
                      <Form.Label>Model <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        value={formData.model}
                        onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                        required
                      >
                        <option value="">-- Chọn model --</option>
                        {selectedProvider?.models.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    
                    <div className="row">
                      {/* Cost */}
                      <div className="col-md-4">
                        <Form.Group className="mb-3">
                          <Form.Label>Chi phí /1k tokens ($)</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.0001"
                            value={formData.cost_per_1k_tokens}
                            onChange={(e) => setFormData(prev => ({ ...prev, cost_per_1k_tokens: parseFloat(e.target.value) }))}
                          />
                          <Form.Text className="text-muted">
                            Mặc định: ${selectedProvider?.defaultCost}
                          </Form.Text>
                        </Form.Group>
                      </div>
                      
                      {/* Priority */}
                      <div className="col-md-4">
                        <Form.Group className="mb-3">
                          <Form.Label>Thứ tự ưu tiên</Form.Label>
                          <Form.Control
                            type="number"
                            min="1"
                            value={formData.priority}
                            onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                          />
                          <Form.Text className="text-muted">
                            1 = ưu tiên cao nhất
                          </Form.Text>
                        </Form.Group>
                      </div>
                      
                      {/* Active Status */}
                      <div className="col-md-4">
                        <Form.Group className="mb-3">
                          <Form.Label>Trạng thái</Form.Label>
                          <Form.Check
                            type="switch"
                            id="is-active-switch"
                            label={formData.is_active ? 'Active' : 'Inactive'}
                            checked={formData.is_active}
                            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                          />
                        </Form.Group>
                      </div>
                    </div>
                    
                    {/* Info Box */}
                    <Alert variant="light" className="border">
                      <strong><i className="bi bi-lightbulb"></i> Mẹo:</strong>
                      <ul className="mb-0 mt-2" style={{ fontSize: '13px' }}>
                        <li>Hệ thống tự động chọn model với chi phí thấp nhất</li>
                        <li>Priority thấp hơn = được chọn trước khi cost bằng nhau</li>
                        <li>Tắt Active để tạm dừng sử dụng mà không xóa cấu hình</li>
                        <li>API key được mã hóa an toàn, không ai có thể xem</li>
                      </ul>
                    </Alert>
                    
                    {/* Form Actions */}
                    <div className="d-flex gap-2">
                      <Button variant="secondary" onClick={() => setShowForm(false)}>
                        Hủy
                      </Button>
                      <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Đang lưu...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-save"></i> {editingConfig ? 'Cập nhật' : 'Thêm mới'}
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </Form>
            </div>
          </>
        )}
      </Modal.Body>
      
      {!showForm && (
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Đóng
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
}

export default AIConfigManager;
