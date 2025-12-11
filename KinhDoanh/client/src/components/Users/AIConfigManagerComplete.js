/**
 * AI Configuration Manager - Phân hệ 2.4.3
 * Quản lý cấu hình AI cho từng user với đầy đủ tính năng
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Alert, Tabs, Tab } from 'react-bootstrap';
import { ConfigListTab, AddEditConfigTab, ProvidersInfoTab } from './AIConfigTabs';
import { useAuth } from '../../contexts/AuthContext';
import './AIConfigManager.css';

// Định nghĩa các AI providers với thông tin chi tiết
const AI_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    description: 'GPT-3.5, GPT-4 (Free: $5 trial)',
    models: [
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', cost: 0.002 },
      { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K', cost: 0.004 },
      { value: 'gpt-4', label: 'GPT-4', cost: 0.03 },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', cost: 0.01 },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini', cost: 0.00015 },
      { value: 'gpt-4o', label: 'GPT-4o', cost: 0.005 }
    ],
    color: 'success',
    websiteUrl: 'https://platform.openai.com/api-keys',
    isFree: false,
    freeInfo: '$5 credit cho tài khoản mới'
  },
  {
    id: 'google',
    name: 'Google Gemini', 
    icon: '✨',
    description: 'Gemini Pro (FREE 60 calls/min)',
    models: [
      { value: 'gemini-pro', label: 'Gemini Pro', cost: 0.000 },
      { value: 'gemini-pro-vision', label: 'Gemini Pro Vision', cost: 0.000 },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', cost: 0.000 },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', cost: 0.000 }
    ],
    color: 'primary',
    websiteUrl: 'https://makersuite.google.com/app/apikey',
    isFree: true,
    freeInfo: 'FREE: 60 requests/min, 1500/day'
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    icon: '🧠', 
    description: 'Claude-3 Models (Free: $5 credit)',
    models: [
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', cost: 0.00025 },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet', cost: 0.003 },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', cost: 0.015 },
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', cost: 0.003 }
    ],
    color: 'warning',
    websiteUrl: 'https://console.anthropic.com/',
    isFree: false,
    freeInfo: '$5 credit cho tài khoản mới'
  },
  {
    id: 'groq',
    name: 'Groq',
    icon: '⚡',
    description: 'Ultra-fast inference (FREE tier)',
    models: [
      { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B', cost: 0.000 },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', cost: 0.000 },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', cost: 0.000 },
      { value: 'gemma-7b-it', label: 'Gemma 7B', cost: 0.000 }
    ],
    color: 'info',
    websiteUrl: 'https://console.groq.com/keys',
    isFree: true,
    freeInfo: 'FREE: 30 requests/min, 14,400/day'
  },
  {
    id: 'cohere',
    name: 'Cohere',
    icon: '🔮',
    description: 'Command-R Models (FREE tier)', 
    models: [
      { value: 'command-r', label: 'Command R', cost: 0.000 },
      { value: 'command-r-plus', label: 'Command R+', cost: 0.000 },
      { value: 'command-light', label: 'Command Light', cost: 0.000 }
    ],
    color: 'secondary',
    websiteUrl: 'https://dashboard.cohere.ai/api-keys',
    isFree: true,
    freeInfo: 'FREE: 1000 requests/month'
  }
];

function AIConfigManager({ user, userId, show, onHide, onSave }) {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // AI Configurations
  const [aiConfigs, setAIConfigs] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  
  // Form states for new/edit config
  const [configForm, setConfigForm] = useState({
    id: null,
    provider: '',
    model_name: '',
    api_key: '',
    max_tokens: 4000,
    temperature: 0.7,
    cost_per_token: 0.000,
    priority: 1,
    is_active: true
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [testingConfig, setTestingConfig] = useState(null);

  useEffect(() => {
    const currentUserId = userId || user?.user?.id || user?.id || authUser?.id;
    if (show && currentUserId) {
      loadAIConfigs();
    }
  }, [show, userId, user?.id, user?.user?.id, authUser?.id]); // Removed loadAIConfigs dependency

  const loadAIConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const currentUserId = userId || user?.user?.id || user?.id || authUser?.id;
      console.log('Loading AI configs for user:', currentUserId);
      
      if (!currentUserId) {
        throw new Error('User ID not found');
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ai-configs/user-configs?user_id=${currentUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAIConfigs(data.data?.configs || []);
        console.log('AI configs loaded:', data.data?.configs?.length || 0);
      } else if (response.status === 404) {
        // No configs yet - that's fine
        setAIConfigs([]);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading AI configs:', error);
      setError('Không thể tải cấu hình AI: ' + error.message);
      setAIConfigs([]);
    } finally {
      setLoading(false);
    }
  }, [userId, user?.id, authUser?.id, user?.user?.id]);

  // Handler functions
  const handleEditConfig = (config) => {
    setConfigForm({
      id: config.id,
      provider: config.provider,
      model_name: config.model_name,
      api_key: '', // Don't pre-fill for security
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      cost_per_token: config.cost_per_token,
      priority: config.priority,
      is_active: config.is_active
    });
    setActiveTab('add');
  };

  const handleDeleteConfig = async (configId) => {
    if (!window.confirm('Bạn có chắc muốn xóa cấu hình AI này?')) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ai-configs/configs/${configId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccess('Xóa cấu hình AI thành công!');
        loadAIConfigs();
      } else {
        throw new Error('Không thể xóa cấu hình');
      }
    } catch (error) {
      setError('Lỗi khi xóa cấu hình: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConfig = async (config) => {
    try {
      setTestingConfig(config.id);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ai-configs/test-config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config_id: config.id,
          test_message: 'Hello, this is a test message.'
        })
      });

      if (response.ok) {
        setSuccess('Kết nối AI thành công!');
      } else {
        throw new Error('Test connection failed');
      }
    } catch (error) {
      setError('Lỗi test kết nối: ' + error.message);
    } finally {
      setTestingConfig(null);
    }
  };

  const handleToggleStatus = async (configId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ai-configs/configs/${configId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: newStatus })
      });

      if (response.ok) {
        setSuccess(`Cấu hình đã được ${newStatus ? 'kích hoạt' : 'vô hiệu hóa'}!`);
        loadAIConfigs();
      } else {
        throw new Error('Không thể cập nhật trạng thái');
      }
    } catch (error) {
      setError('Lỗi cập nhật trạng thái: ' + error.message);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      setError('');
      
      const currentUserId = userId || user?.user?.id || user?.id || authUser?.id;
      const token = localStorage.getItem('token');
      
      const endpoint = configForm.id 
        ? `/api/ai-configs/configs/${configForm.id}`
        : `/api/ai-configs/configs`;
      
      const method = configForm.id ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...configForm,
          user_id: currentUserId
        })
      });

      if (response.ok) {
        setSuccess(`${configForm.id ? 'Cập nhật' : 'Thêm'} cấu hình AI thành công!`);
        handleCancelEdit();
        loadAIConfigs();
        setActiveTab('list');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Không thể lưu cấu hình');
      }
    } catch (error) {
      setError('Lỗi lưu cấu hình: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setConfigForm({
      id: null,
      provider: '',
      model_name: '',
      api_key: '',
      max_tokens: 4000,
      temperature: 0.7,
      cost_per_token: 0.000,
      priority: 1,
      is_active: true
    });
  };

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-robot me-2"></i>
          Cấu hình AI - {user?.user?.full_name || user?.full_name || 'User'}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
        
        <Alert variant="info">
          <i className="fas fa-info-circle me-2"></i>
          <strong>Phân hệ 2.4.3:</strong> Quản lý cấu hình AI cho user - API keys, models, và settings
        </Alert>

        <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
          <Tab eventKey="list" title={`📋 Danh sách (${aiConfigs.length})`}>
            <ConfigListTab 
              configs={aiConfigs}
              onEdit={handleEditConfig}
              onDelete={handleDeleteConfig}
              onTest={handleTestConfig}
              onToggleStatus={handleToggleStatus}
              testingConfig={testingConfig}
            />
          </Tab>
          
          <Tab eventKey="add" title="➕ Thêm mới">
            <AddEditConfigTab
              config={configForm}
              onChange={setConfigForm}
              providers={AI_PROVIDERS}
              onSave={handleSaveConfig}
              onCancel={handleCancelEdit}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              loading={loading}
            />
          </Tab>
          
          <Tab eventKey="providers" title="🔍 AI Providers">
            <ProvidersInfoTab providers={AI_PROVIDERS} />
          </Tab>
        </Tabs>

        {loading && (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p className="mt-2 text-muted">Đang tải cấu hình AI...</p>
          </div>
        )}

      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Đóng
        </Button>
        <Button variant="primary" onClick={() => setActiveTab('add')}>
          <i className="fas fa-plus me-2"></i>
          Thêm cấu hình AI
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default AIConfigManager;