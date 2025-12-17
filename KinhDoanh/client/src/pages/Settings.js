/**
 * Settings Page - KHO MVG
 * Trang cài đặt hệ thống và quản lý người dùng
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Alert, Tab, Nav, Table, Modal } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import AIConfigManager from '../components/Users/AIConfigManagerComplete';
import './Settings.css';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import axios from 'axios';

function Settings() {
  const { user, isAdmin, hasPermission } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('system');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [users, setUsers] = useState([]);
  const [systemSettings, setSystemSettings] = useState({
    app_name: 'KHO MVG',
    maintenance_mode: false,
    email_notifications: true,
    auto_backup: true,
    max_file_size: 10,
    session_timeout: 30
  });

  useEffect(() => {
    // Allow admin users to view settings
    // In dev mode, allow any authenticated user to view
    const isDev = process.env.NODE_ENV !== 'production';
    const canView = isAdmin() || hasPermission('settings_view') || isDev;
    
    if (!canView) {
      showError('Bạn không có quyền truy cập trang cài đặt');
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const resp = await axios.get('/api/users', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (resp.data?.success) {
          setUsers(resp.data.data?.users || []);
        } else {
          showError('Không tải được danh sách người dùng');
          setUsers([]);
        }
      } catch (err) {
        console.error('Load users failed', err);
        showError('Không tải được danh sách người dùng');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAdmin, hasPermission, showError]);

  const handleSystemSettingsSubmit = async (e) => {
    e.preventDefault();
    
    if (!hasPermission('system_settings_update')) {
      showError('Bạn không có quyền cập nhật cài đặt hệ thống');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      showSuccess('Cập nhật cài đặt hệ thống thành công!');
    } catch (error) {
      showError('Cập nhật cài đặt thất bại');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const roleMap = {
      admin: { variant: 'danger', label: 'Admin' },
      manager: { variant: 'success', label: 'Manager' },
      staff: { variant: 'primary', label: 'Staff' },
      viewer: { variant: 'secondary', label: 'Viewer' }
    };
    
    const roleInfo = roleMap[role] || { variant: 'secondary', label: role };
    return <Badge bg={roleInfo.variant}>{roleInfo.label}</Badge>;
  };

  const getStatusBadge = (isActive) => {
    return isActive ? 
      <Badge bg="success">Hoạt động</Badge> : 
      <Badge bg="secondary">Vô hiệu hóa</Badge>;
  };

  const handleToggleUser = (userId, currentStatus) => {
    if (!hasPermission('user_update')) {
      showError('Bạn không có quyền thay đổi trạng thái người dùng');
      return;
    }

    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId ? { ...user, is_active: !currentStatus } : user
      )
    );
    
    showSuccess(`${currentStatus ? 'Vô hiệu hóa' : 'Kích hoạt'} người dùng thành công`);
  };

  const systemInfo = {
    version: '1.0.0',
    build: '20240215.1',
    database: 'MySQL 8.0 + MongoDB 6.0',
    server: 'Node.js 18.x',
    uptime: '15 ngày 8 giờ',
    total_storage: '50 GB',
    used_storage: '12.5 GB'
  };

  if (loading && users.length === 0) {
    return <LoadingSpinner text="Đang tải cài đặt..." />;
  }

  if (!isAdmin() && !hasPermission('settings_view')) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="text-center">
          <h4>Không có quyền truy cập</h4>
          <p>Bạn không có quyền truy cập trang cài đặt hệ thống.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      {/* Page Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Cài đặt Hệ thống</h2>
              <p className="text-muted mb-0">
                Quản lý cài đặt hệ thống và người dùng
              </p>
            </div>
            <Badge bg="info" className="px-3 py-2">
              <i className="fas fa-info-circle me-2"></i>
              Phiên bản {systemInfo.version}
            </Badge>
          </div>
        </Col>
      </Row>

      {/* Main Content with Tabs */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0">
          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Nav variant="tabs" className="border-0">
              <Nav.Item>
                <Nav.Link eventKey="system">
                  <i className="fas fa-cog me-2"></i>
                  Cài đặt hệ thống
                </Nav.Link>
              </Nav.Item>
              {(isAdmin() || hasPermission('user_management')) && (
                <Nav.Item>
                  <Nav.Link eventKey="users">
                    <i className="fas fa-users me-2"></i>
                    Quản lý người dùng ({users.length})
                  </Nav.Link>
                </Nav.Item>
              )}
              <Nav.Item>
                <Nav.Link eventKey="ai">
                  <i className="fas fa-robot me-2"></i>
                  Cấu hình AI
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="backup">
                  <i className="fas fa-database me-2"></i>
                  Sao lưu & Khôi phục
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="info">
                  <i className="fas fa-info-circle me-2"></i>
                  Thông tin hệ thống
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Tab.Container>
        </Card.Header>

        <Card.Body>
          <Tab.Container activeKey={activeTab}>
            <Tab.Content>
              {/* System Settings Tab */}
              <Tab.Pane eventKey="system">
                <Form onSubmit={handleSystemSettingsSubmit}>
                  <Row>
                    <Col md={6}>
                      <h5 className="mb-3">Cài đặt chung</h5>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Tên ứng dụng</Form.Label>
                        <Form.Control
                          type="text"
                          value={systemSettings.app_name}
                          onChange={(e) => setSystemSettings(prev => ({
                            ...prev,
                            app_name: e.target.value
                          }))}
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Kích thước file tối đa (MB)</Form.Label>
                        <Form.Control
                          type="number"
                          value={systemSettings.max_file_size}
                          onChange={(e) => setSystemSettings(prev => ({
                            ...prev,
                            max_file_size: parseInt(e.target.value)
                          }))}
                          min={1}
                          max={50}
                        />
                        <Form.Text className="text-muted">
                          Kích thước tối đa cho mỗi file upload
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Thời gian hết phiên (phút)</Form.Label>
                        <Form.Control
                          type="number"
                          value={systemSettings.session_timeout}
                          onChange={(e) => setSystemSettings(prev => ({
                            ...prev,
                            session_timeout: parseInt(e.target.value)
                          }))}
                          min={5}
                          max={120}
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <h5 className="mb-3">Tùy chọn nâng cao</h5>
                      
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          label="Chế độ bảo trì"
                          checked={systemSettings.maintenance_mode}
                          onChange={(e) => setSystemSettings(prev => ({
                            ...prev,
                            maintenance_mode: e.target.checked
                          }))}
                        />
                        <Form.Text className="text-muted">
                          Khi bật, chỉ Admin có thể truy cập hệ thống
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          label="Thông báo email"
                          checked={systemSettings.email_notifications}
                          onChange={(e) => setSystemSettings(prev => ({
                            ...prev,
                            email_notifications: e.target.checked
                          }))}
                        />
                        <Form.Text className="text-muted">
                          Gửi thông báo qua email cho các sự kiện quan trọng
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          label="Tự động sao lưu"
                          checked={systemSettings.auto_backup}
                          onChange={(e) => setSystemSettings(prev => ({
                            ...prev,
                            auto_backup: e.target.checked
                          }))}
                        />
                        <Form.Text className="text-muted">
                          Tự động sao lưu dữ liệu hằng ngày
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  <hr className="my-4" />

                  <div className="d-flex gap-2">
                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-2"></i>
                          Lưu cài đặt
                        </>
                      )}
                    </Button>
                    <Button variant="outline-secondary">
                      Khôi phục mặc định
                    </Button>
                  </div>
                </Form>
              </Tab.Pane>

              {/* AI Configuration Tab */}
              <Tab.Pane eventKey="ai">
                <div className="p-4">
                  <h4 className="mb-4">🤖 Cấu hình AI</h4>
                  
                  <Alert variant="info" className="mb-4">
                    <i className="fas fa-info-circle me-2"></i>
                    <strong>Hướng dẫn:</strong> Cấu hình API keys để sử dụng AI Assistant.
                  </Alert>

                  <Card className="mb-4">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h5 className="mb-2">API Keys của bạn</h5>
                          <p className="text-muted mb-0">
                            Quản lý OpenAI, Gemini, Claude, Copilot
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          onClick={() => {
                            console.log('Opening AI Config Manager...');
                            setShowAIConfig(true);
                          }}
                        >
                          <i className="fas fa-cog me-2"></i>
                          Quản lý API Keys
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>

                  <Row>
                    <Col md={6} className="mb-3">
                      <Card>
                        <Card.Body className="text-center">
                          <span className="fs-1">🤖</span>
                          <h6 className="mt-2">OpenAI</h6>
                          <small className="text-muted">GPT-3.5, GPT-4</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6} className="mb-3">
                      <Card>
                        <Card.Body className="text-center">
                          <span className="fs-1">✨</span>
                          <h6 className="mt-2">Google Gemini</h6>
                          <small className="text-muted">Gemini Pro</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6} className="mb-3">
                      <Card>
                        <Card.Body className="text-center">
                          <span className="fs-1">🧠</span>
                          <h6 className="mt-2">Claude</h6>
                          <small className="text-muted">Claude 3</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6} className="mb-3">
                      <Card>
                        <Card.Body className="text-center">
                          <span className="fs-1">🐙</span>
                          <h6 className="mt-2">GitHub Copilot</h6>
                          <small className="text-muted">Enterprise</small>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </div>
              </Tab.Pane>

              {/* Users Management Tab */}
              {(isAdmin() || hasPermission('user_management')) && (
                <Tab.Pane eventKey="users">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Quản lý người dùng</h5>
                    {hasPermission('user_create') && (
                      <Button variant="primary" onClick={() => setShowUserModal(true)}>
                        <i className="fas fa-plus me-2"></i>
                        Thêm người dùng
                      </Button>
                    )}
                  </div>

                  <div className="table-responsive">
                    <Table hover>
                      <thead className="bg-light">
                        <tr>
                          <th>Người dùng</th>
                          <th>Email</th>
                          <th>Vai trò</th>
                          <th>Trạng thái</th>
                          <th>Đăng nhập cuối</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((userItem) => (
                          <tr key={userItem.id}>
                            <td>
                              <div>
                                <div className="fw-bold">{userItem.full_name}</div>
                                <small className="text-muted">{userItem.username}</small>
                              </div>
                            </td>
                            <td>{userItem.email}</td>
                            <td>{getRoleBadge(userItem.role)}</td>
                            <td>{getStatusBadge(userItem.is_active)}</td>
                            <td>
                              {userItem.last_login ? 
                                new Date(userItem.last_login).toLocaleDateString('vi-VN') : 
                                'Chưa đăng nhập'
                              }
                            </td>
                            <td>
                              <div className="btn-group">
                                {hasPermission('user_update') && (
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </Button>
                                )}
                                {hasPermission('user_update') && userItem.id !== user?.id && (
                                  <Button
                                    variant={userItem.is_active ? 'outline-warning' : 'outline-success'}
                                    size="sm"
                                    onClick={() => handleToggleUser(userItem.id, userItem.is_active)}
                                  >
                                    <i className={`fas ${userItem.is_active ? 'fa-pause' : 'fa-play'}`}></i>
                                  </Button>
                                )}
                                {hasPermission('user_delete') && userItem.id !== user?.id && userItem.role !== 'admin' && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Tab.Pane>
              )}

              {/* Backup Tab */}
              <Tab.Pane eventKey="backup">
                <Row>
                  <Col md={6}>
                    <h5 className="mb-3">Sao lưu dữ liệu</h5>
                    
                    <Card className="border-left-primary">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <h6 className="mb-1">Sao lưu toàn bộ</h6>
                            <p className="text-muted mb-0">Tạo bản sao lưu đầy đủ của hệ thống</p>
                          </div>
                          <Button variant="primary">
                            <i className="fas fa-download me-2"></i>
                            Tạo backup
                          </Button>
                        </div>
                        
                        <div className="d-flex justify-content-between text-sm">
                          <span>Sao lưu cuối:</span>
                          <span className="text-muted">15/02/2024 10:30</span>
                        </div>
                      </Card.Body>
                    </Card>

                    <Card className="border-left-warning mt-3">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <h6 className="mb-1">Sao lưu tự động</h6>
                            <p className="text-muted mb-0">Lên lịch sao lưu tự động hằng ngày</p>
                          </div>
                          <Form.Check type="switch" defaultChecked />
                        </div>
                        
                        <div className="d-flex justify-content-between text-sm">
                          <span>Lần tiếp theo:</span>
                          <span className="text-muted">16/02/2024 02:00</span>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={6}>
                    <h5 className="mb-3">Khôi phục dữ liệu</h5>
                    
                    <Alert variant="warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      <strong>Chú ý:</strong> Việc khôi phục sẽ ghi đè toàn bộ dữ liệu hiện tại.
                    </Alert>

                    <Form>
                      <Form.Group className="mb-3">
                        <Form.Label>Chọn file backup</Form.Label>
                        <Form.Control type="file" accept=".sql,.backup" />
                      </Form.Group>
                      
                      <Button variant="danger" className="w-100">
                        <i className="fas fa-upload me-2"></i>
                        Khôi phục từ backup
                      </Button>
                    </Form>

                    <h6 className="mt-4 mb-3">Backup có sẵn</h6>
                    <div className="backup-list">
                      {[
                        { name: 'backup_20240215_1030.sql', size: '15.2 MB', date: '15/02/2024' },
                        { name: 'backup_20240214_0200.sql', size: '14.8 MB', date: '14/02/2024' },
                        { name: 'backup_20240213_0200.sql', size: '14.5 MB', date: '13/02/2024' }
                      ].map((backup, index) => (
                        <div key={index} className="d-flex justify-content-between align-items-center p-2 border rounded mb-2">
                          <div>
                            <div className="fw-medium">{backup.name}</div>
                            <small className="text-muted">{backup.size} • {backup.date}</small>
                          </div>
                          <div className="btn-group">
                            <Button variant="outline-primary" size="sm">
                              <i className="fas fa-download"></i>
                            </Button>
                            <Button variant="outline-success" size="sm">
                              <i className="fas fa-undo"></i>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* System Info Tab */}
              <Tab.Pane eventKey="info">
                <Row>
                  <Col md={6}>
                    <h5 className="mb-3">Thông tin hệ thống</h5>
                    
                    <div className="info-group">
                      <div className="info-item">
                        <strong>Phiên bản:</strong> {systemInfo.version}
                      </div>
                      <div className="info-item">
                        <strong>Build:</strong> {systemInfo.build}
                      </div>
                      <div className="info-item">
                        <strong>Database:</strong> {systemInfo.database}
                      </div>
                      <div className="info-item">
                        <strong>Server:</strong> {systemInfo.server}
                      </div>
                      <div className="info-item">
                        <strong>Uptime:</strong> {systemInfo.uptime}
                      </div>
                    </div>
                  </Col>

                  <Col md={6}>
                    <h5 className="mb-3">Thông tin lưu trữ</h5>
                    
                    <div className="info-group">
                      <div className="info-item">
                        <strong>Tổng dung lượng:</strong> {systemInfo.total_storage}
                      </div>
                      <div className="info-item">
                        <strong>Đã sử dụng:</strong> {systemInfo.used_storage}
                      </div>
                      <div className="info-item">
                        <strong>Còn trống:</strong> {parseFloat(systemInfo.total_storage) - parseFloat(systemInfo.used_storage)} GB
                      </div>
                    </div>

                    <div className="progress mb-3">
                      <div 
                        className="progress-bar bg-info" 
                        style={{ width: `${(parseFloat(systemInfo.used_storage) / parseFloat(systemInfo.total_storage)) * 100}%` }}
                      ></div>
                    </div>

                    <Alert variant="info">
                      <i className="fas fa-info-circle me-2"></i>
                      Hệ thống hoạt động ổn định. Không có cảnh báo nào.
                    </Alert>
                  </Col>
                </Row>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>

      {/* Add User Modal */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Thêm người dùng mới</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <i className="fas fa-info-circle me-2"></i>
            Form thêm người dùng sẽ được phát triển ở phiên bản tiếp theo
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUserModal(false)}>
            Đóng
          </Button>
          <Button variant="primary">
            Thêm người dùng
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .info-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .info-item {
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .info-item strong {
          color: #495057;
          display: inline-block;
          min-width: 140px;
        }

        .border-left-primary {
          border-left: 4px solid #007bff;
        }

        .border-left-warning {
          border-left: 4px solid #ffc107;
        }

        .backup-list {
          max-height: 300px;
          overflow-y: auto;
        }
      `}</style>
      {/* AI Config Manager Modal */}
      {showAIConfig && user && (
        <AIConfigManager
          userId={user.id}
          show={showAIConfig}
          onHide={() => setShowAIConfig(false)}
          onSave={() => {
            console.log('AI Config saved!');
            setShowAIConfig(false);
          }}
        />
      )}
    </Container>
  );
}

export default Settings;