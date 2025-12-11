/**
 * AI Config Manager Tabs Components
 * Các tab components cho AI Configuration Manager
 */

import React from 'react';
import { Table, Button, Badge, Card, Row, Col, Form, InputGroup } from 'react-bootstrap';

// Tab 1: Config List
export function ConfigListTab({ configs, onEdit, onDelete, onTest, onToggleStatus, testingConfig }) {
  const getProviderBadge = (provider) => {
    const providerMap = {
      'openai': { variant: 'success', icon: '🤖', name: 'OpenAI' },
      'google': { variant: 'primary', icon: '✨', name: 'Google' },
      'anthropic': { variant: 'warning', icon: '🧠', name: 'Claude' },
      'groq': { variant: 'info', icon: '⚡', name: 'Groq' },
      'cohere': { variant: 'secondary', icon: '🔮', name: 'Cohere' }
    };
    
    const info = providerMap[provider] || { variant: 'dark', icon: '🤖', name: provider };
    return (
      <Badge bg={info.variant}>
        {info.icon} {info.name}
      </Badge>
    );
  };

  const formatCost = (cost) => {
    return cost === 0 ? 'FREE' : `$${cost.toFixed(6)}/1K tokens`;
  };

  if (configs.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="mb-3">
          <i className="fas fa-robot fa-3x text-muted"></i>
        </div>
        <h5 className="text-muted">Chưa có cấu hình AI nào</h5>
        <p className="text-muted">Bấm "Thêm mới" để cấu hình AI provider đầu tiên</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <Table hover>
        <thead className="bg-light">
          <tr>
            <th>Provider</th>
            <th>Model</th>
            <th>Cost</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {configs.map((config) => (
            <tr key={config.id}>
              <td>{getProviderBadge(config.provider)}</td>
              <td>
                <div>
                  <div className="fw-bold">{config.model_name}</div>
                  <small className="text-muted">
                    Max: {config.max_tokens} tokens • Temp: {config.temperature}
                  </small>
                </div>
              </td>
              <td>{formatCost(config.cost_per_token)}</td>
              <td>
                <Badge bg="info">{config.priority}</Badge>
              </td>
              <td>
                <Form.Check
                  type="switch"
                  checked={config.is_active}
                  onChange={(e) => onToggleStatus(config.id, e.target.checked)}
                  label={config.is_active ? 'Hoạt động' : 'Tạm dừng'}
                />
              </td>
              <td>
                <div className="btn-group">
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => onTest(config)}
                    disabled={testingConfig === config.id}
                    title="Test kết nối"
                  >
                    {testingConfig === config.id ? (
                      <div className="spinner-border spinner-border-sm" role="status" />
                    ) : (
                      <i className="fas fa-plug"></i>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => onEdit(config)}
                    title="Chỉnh sửa"
                  >
                    <i className="fas fa-edit"></i>
                  </Button>
                  
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => onDelete(config.id)}
                    title="Xóa"
                  >
                    <i className="fas fa-trash"></i>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

// Tab 2: Add/Edit Config Form
export function AddEditConfigTab({ 
  config, 
  onChange, 
  providers, 
  onSave, 
  onCancel, 
  showPassword, 
  onTogglePassword, 
  loading 
}) {
  const selectedProvider = providers.find(p => p.id === config.provider);
  const availableModels = selectedProvider?.models || [];

  const handleProviderChange = (providerId) => {
    const provider = providers.find(p => p.id === providerId);
    const defaultModel = provider?.models[0];
    
    onChange({
      ...config,
      provider: providerId,
      model_name: defaultModel?.value || '',
      cost_per_token: defaultModel?.cost || 0.000
    });
  };

  const handleModelChange = (modelValue) => {
    const model = availableModels.find(m => m.value === modelValue);
    
    onChange({
      ...config,
      model_name: modelValue,
      cost_per_token: model?.cost || 0.000
    });
  };

  return (
    <Form>
      <Row>
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <h6 className="mb-0">
                <i className="fas fa-cog me-2"></i>
                Cấu hình cơ bản
              </h6>
            </Card.Header>
            <Card.Body>
              {/* Provider Selection */}
              <Form.Group className="mb-3">
                <Form.Label>AI Provider *</Form.Label>
                <Form.Select
                  value={config.provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  required
                >
                  <option value="">Chọn AI Provider</option>
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.icon} {provider.name} {provider.isFree && '(FREE)'}
                    </option>
                  ))}
                </Form.Select>
                {selectedProvider && (
                  <Form.Text className="text-muted">
                    {selectedProvider.description}
                  </Form.Text>
                )}
              </Form.Group>

              {/* Model Selection */}
              <Form.Group className="mb-3">
                <Form.Label>Model *</Form.Label>
                <Form.Select
                  value={config.model_name}
                  onChange={(e) => handleModelChange(e.target.value)}
                  disabled={!config.provider}
                  required
                >
                  <option value="">Chọn Model</option>
                  {availableModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label} - {model.cost === 0 ? 'FREE' : `$${model.cost}/1K`}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              {/* API Key */}
              <Form.Group className="mb-3">
                <Form.Label>API Key *</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showPassword ? "text" : "password"}
                    value={config.api_key}
                    onChange={(e) => onChange({...config, api_key: e.target.value})}
                    placeholder="Nhập API key của bạn"
                    required
                  />
                  <Button 
                    variant="outline-secondary"
                    onClick={onTogglePassword}
                  >
                    <i className={`fas fa-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                  </Button>
                </InputGroup>
                {selectedProvider && (
                  <Form.Text className="text-muted">
                    <a 
                      href={selectedProvider.websiteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Lấy API key tại đây →
                    </a>
                  </Form.Text>
                )}
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <h6 className="mb-0">
                <i className="fas fa-sliders-h me-2"></i>
                Tham số nâng cao
              </h6>
            </Card.Header>
            <Card.Body>
              {/* Max Tokens */}
              <Form.Group className="mb-3">
                <Form.Label>Max Tokens</Form.Label>
                <Form.Control
                  type="number"
                  value={config.max_tokens}
                  onChange={(e) => onChange({...config, max_tokens: parseInt(e.target.value) || 4000})}
                  min="1"
                  max="32000"
                />
                <Form.Text className="text-muted">
                  Số token tối đa cho mỗi response (1-32000)
                </Form.Text>
              </Form.Group>

              {/* Temperature */}
              <Form.Group className="mb-3">
                <Form.Label>Temperature: {config.temperature}</Form.Label>
                <Form.Range
                  value={config.temperature}
                  onChange={(e) => onChange({...config, temperature: parseFloat(e.target.value)})}
                  min="0"
                  max="2"
                  step="0.1"
                />
                <Form.Text className="text-muted">
                  Độ sáng tạo: 0 (nhất quán) - 2 (sáng tạo)
                </Form.Text>
              </Form.Group>

              {/* Priority */}
              <Form.Group className="mb-3">
                <Form.Label>Priority</Form.Label>
                <Form.Control
                  type="number"
                  value={config.priority}
                  onChange={(e) => onChange({...config, priority: parseInt(e.target.value) || 1})}
                  min="1"
                  max="10"
                />
                <Form.Text className="text-muted">
                  Độ ưu tiên (1 = cao nhất, 10 = thấp nhất)
                </Form.Text>
              </Form.Group>

              {/* Active Status */}
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="config-active"
                  label="Kích hoạt ngay"
                  checked={config.is_active}
                  onChange={(e) => onChange({...config, is_active: e.target.checked})}
                />
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="d-flex justify-content-end gap-2 mt-3">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Hủy
        </Button>
        <Button 
          variant="primary" 
          onClick={onSave} 
          disabled={!config.provider || !config.model_name || !config.api_key || loading}
        >
          {loading ? (
            <>
              <div className="spinner-border spinner-border-sm me-2" role="status" />
              Đang lưu...
            </>
          ) : (
            <>
              <i className="fas fa-save me-2"></i>
              {config.id ? 'Cập nhật' : 'Lưu cấu hình'}
            </>
          )}
        </Button>
      </div>
    </Form>
  );
}

// Tab 3: Providers Info
export function ProvidersInfoTab({ providers }) {
  return (
    <Row>
      {providers.map(provider => (
        <Col lg={6} className="mb-4" key={provider.id}>
          <Card className="h-100">
            <Card.Header className={`bg-${provider.color} text-white`}>
              <h6 className="mb-0">
                {provider.icon} {provider.name}
                {provider.isFree && <Badge bg="success" className="ms-2">FREE</Badge>}
              </h6>
            </Card.Header>
            <Card.Body>
              <p className="text-muted mb-3">{provider.description}</p>
              
              <h6>Available Models:</h6>
              <ul className="list-unstyled mb-3">
                {provider.models.map(model => (
                  <li key={model.value} className="d-flex justify-content-between">
                    <span>{model.label}</span>
                    <Badge bg={model.cost === 0 ? 'success' : 'secondary'}>
                      {model.cost === 0 ? 'FREE' : `$${model.cost}/1K`}
                    </Badge>
                  </li>
                ))}
              </ul>

              {provider.freeInfo && (
                <div className="alert alert-info">
                  <small>
                    <i className="fas fa-gift me-1"></i>
                    {provider.freeInfo}
                  </small>
                </div>
              )}

              <div className="d-grid">
                <Button 
                  variant={`outline-${provider.color}`}
                  size="sm"
                  href={provider.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fas fa-external-link-alt me-2"></i>
                  Lấy API Key
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
}