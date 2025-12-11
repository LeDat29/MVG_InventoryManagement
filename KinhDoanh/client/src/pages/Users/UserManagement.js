/**
 * User Management Page - KHO MVG
 * Phân hệ 2.4 - Quản lý User nâng cao
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Form, Modal, Alert, Tab, Nav } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import PermissionManager from '../../components/Users/PermissionManager';
import AIConfigManager from '../../components/Users/AIConfigManagerComplete';
import axios from 'axios';

function UserManagement() {
  const { isAdmin, hasPermission } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showAIConfigModal, setShowAIConfigModal] = useState(false);
  // const [showActivityModal, setShowActivityModal] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    page: 1,
    limit: 20
  });

  useEffect(() => {
    if (hasPermission('user_view') || isAdmin()) {
      loadUsers();
    }
  }, [filters]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Loading users with token:', token ? 'Present' : 'Missing');
      console.log('Filters:', filters);
      
      const response = await axios.get('/api/users', { 
        params: filters,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Users API response:', response.data);
      
      if (response.data.success) {
        setUsers(response.data.data.users || []);
      } else {
        throw new Error(response.data.message || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      showError(error.response?.data?.message || error.message || 'Lỗi tải danh sách người dùng');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [filters, showError]);

  useEffect(() => {
    if (hasPermission('user_read') || isAdmin) {
      loadUsers();
    }
  }, [hasPermission, isAdmin, loadUsers]);

  const handleViewUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Viewing user:', userId);
      
      const response = await axios.get(`/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('User details response:', response.data);
      
      setSelectedUser(response.data.data || response.data.user);
      setShowUserModal(true);
    } catch (error) {
      console.error('Error viewing user:', error);
      showError(error.response?.data?.message || 'Lỗi tải thông tin người dùng');
    }
  };

  const handleShowPermissions = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Loading permissions for user:', userId);
      
      // Get user info first
      const response = await axios.get(`/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('User permissions response:', response.data);
      
      if (response.data.success) {
        const userData = response.data.data;
        console.log('Setting selected user data:', userData);
        setSelectedUser(userData);
        setShowPermissionModal(true);
      } else {
        throw new Error('Failed to load user data');
      }
    } catch (error) {
      console.error('Error loading user permissions:', error);
      showError(error.response?.data?.message || 'Lỗi tải quyền hạn người dùng');
    }
  };

  const handleShowAIConfigs = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Loading AI configs for user:', userId);
      
      // Get user info first
      const userResponse = await axios.get(`/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Then try to get AI configs
      try {
        const aiResponse = await axios.get(`/api/ai-assistant/user-configs`, {
          params: { user_id: userId },
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        setSelectedUser({
          ...userResponse.data.data,
          ai_configurations: aiResponse.data.data || []
        });
      } catch (aiError) {
        console.log('AI configs endpoint not found, using basic user data');
        setSelectedUser(userResponse.data.data);
      }
      
      setShowAIConfigModal(true);
    } catch (error) {
      console.error('Error loading AI configs:', error);
      showError(error.response?.data?.message || 'Lỗi tải cấu hình AI');
    }
  };

  const handleShowActivity = async (userId) => {
    try {
      const response = await axios.get(`/api/users/${userId}/activity-logs`);
      setSelectedUser(prev => ({
        ...prev,
        activity_logs: response.data.data.logs
      }));
      // setShowActivityModal(true);
    } catch (error) {
      showError('Lỗi tải lịch sử hoạt động');
    }
  };

  // Add AI configuration for user
  // const handleAddAIConfig = async (userId, configData) => {
  //   try {
  //     await axios.post(`/api/users/${userId}/ai-configs`, configData);
  //     showSuccess('Thêm cấu hình AI thành công');
  //     handleShowAIConfigs(userId); // Refresh configs
  //   } catch (error) {
  //     showError(error.response?.data?.message || 'Lỗi thêm cấu hình AI');
  //   }
  // };

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

  if (loading) {
    return <LoadingSpinner text="Đang tải danh sách người dùng..." />;
  }

  if (!isAdmin() && !hasPermission('user_view')) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="text-center">
          <h4>Không có quyền truy cập</h4>
          <p>Bạn không có quyền quản lý người dùng.</p>
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
              <h2 className="mb-1">Quản lý Người dùng</h2>
              <p className="text-muted mb-0">
                Phân hệ 2.4 - Quản lý người dùng và phân quyền nâng cao
              </p>
            </div>
            {hasPermission('user_create') && (
              <Button variant="primary">
                <i className="fas fa-plus me-2"></i>
                Thêm người dùng
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {/* Tabs */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0">
          <Nav variant="tabs" className="border-0" activeKey={activeTab} onSelect={setActiveTab}>
            <Nav.Item>
              <Nav.Link eventKey="list">
                <i className="fas fa-users me-2"></i>
                Danh sách người dùng
              </Nav.Link>
            </Nav.Item>
            {isAdmin() && (
              <Nav.Item>
                <Nav.Link eventKey="activity">
                  <i className="fas fa-history me-2"></i>
                  Lịch sử hoạt động
                </Nav.Link>
              </Nav.Item>
            )}
            <Nav.Item>
              <Nav.Link eventKey="ai-stats">
                <i className="fas fa-robot me-2"></i>
                Thống kê AI
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Header>

        <Card.Body>
          <Tab.Content>
            {/* User List Tab */}
            <Tab.Pane eventKey="list" className={activeTab === 'list' ? 'show active' : ''}>
              {/* Filters */}
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Control
                    type="text"
                    placeholder="Tìm kiếm người dùng..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </Col>
                <Col md={3}>
                  <Form.Select
                    value={filters.role}
                    onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="">Tất cả vai trò</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Button variant="outline-secondary" onClick={() => setFilters({ search: '', role: '', page: 1, limit: 20 })}>
                    <i className="fas fa-times me-2"></i>
                    Xóa bộ lọc
                  </Button>
                </Col>
              </Row>

              {/* Users Table */}
              <div className="table-responsive">
                <Table hover>
                  <thead className="bg-light">
                    <tr>
                      <th>Người dùng</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th>Dự án được gán</th>
                      <th>AI Configs</th>
                      <th>Hoạt động cuối</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((userItem) => (
                      <tr key={userItem.id}>
                        <td>
                          <div>
                            <div className="fw-bold">{userItem.full_name}</div>
                            <small className="text-muted">
                              {userItem.username} • {userItem.email}
                            </small>
                          </div>
                        </td>
                        <td>{getRoleBadge(userItem.role)}</td>
                        <td>{getStatusBadge(userItem.is_active)}</td>
                        <td>
                          <Badge bg="info">{userItem.assigned_projects || 0}</Badge>
                        </td>
                        <td>
                          <Badge bg="warning">{userItem.ai_configs_count || 0}</Badge>
                        </td>
                        <td>
                          {userItem.last_activity ? 
                            new Date(userItem.last_activity).toLocaleDateString('vi-VN') : 
                            'Chưa có'
                          }
                        </td>
                        <td>
                          <div className="btn-group">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleViewUser(userItem.id)}
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                            
                            {hasPermission('user_permissions_manage') && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleShowPermissions(userItem.id)}
                                title="Quản lý quyền hạn"
                              >
                                <i className="fas fa-key"></i>
                              </Button>
                            )}
                            
                            {hasPermission('user_ai_manage') && (
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => handleShowAIConfigs(userItem.id)}
                                title="Cấu hình AI"
                              >
                                <i className="fas fa-robot"></i>
                              </Button>
                            )}
                            
                            {(isAdmin() || hasPermission('user_logs_view')) && (
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => handleShowActivity(userItem.id)}
                                title="Lịch sử hoạt động"
                              >
                                <i className="fas fa-history"></i>
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

            {/* Activity Log Tab (Admin only) */}
            {isAdmin() && (
              <Tab.Pane eventKey="activity" className={activeTab === 'activity' ? 'show active' : ''}>
                <Alert variant="info">
                  <i className="fas fa-info-circle me-2"></i>
                  Tính năng xem lịch sử hoạt động tổng hợp sẽ được triển khai ở component riêng
                </Alert>
              </Tab.Pane>
            )}

            {/* AI Statistics Tab */}
            <Tab.Pane eventKey="ai-stats" className={activeTab === 'ai-stats' ? 'show active' : ''}>
              <Row>
                <Col md={4}>
                  <Card className="border-0 shadow-sm text-center">
                    <Card.Body>
                      <i className="fas fa-users fa-2x text-primary mb-2"></i>
                      <h4 className="mb-1">{users.filter(u => u.ai_configs_count > 0).length}</h4>
                      <p className="text-muted mb-0">Users có AI config</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-0 shadow-sm text-center">
                    <Card.Body>
                      <i className="fas fa-robot fa-2x text-success mb-2"></i>
                      <h4 className="mb-1">{users.reduce((sum, u) => sum + (u.ai_configs_count || 0), 0)}</h4>
                      <p className="text-muted mb-0">Tổng AI configs</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-0 shadow-sm text-center">
                    <Card.Body>
                      <i className="fas fa-chart-line fa-2x text-warning mb-2"></i>
                      <h4 className="mb-1">$0.00</h4>
                      <p className="text-muted mb-0">Chi phí AI tháng này</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Card className="mt-4">
                <Card.Header>
                  <h6 className="mb-0">Phân bố AI Providers</h6>
                </Card.Header>
                <Card.Body>
                  <Alert variant="info">
                    Chart thống kê AI providers sẽ được triển khai với dữ liệu thực tế
                  </Alert>
                </Card.Body>
              </Card>
            </Tab.Pane>
          </Tab.Content>
        </Card.Body>
      </Card>

      {/* User Detail Modal */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Chi tiết người dùng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <Row>
              <Col md={6}>
                <h6>Thông tin cơ bản</h6>
                <div className="info-group">
                  <div><strong>Tên:</strong> {selectedUser.user.full_name}</div>
                  <div><strong>Username:</strong> {selectedUser.user.username}</div>
                  <div><strong>Email:</strong> {selectedUser.user.email}</div>
                  <div><strong>Vai trò:</strong> {getRoleBadge(selectedUser.user.role)}</div>
                  <div><strong>Trạng thái:</strong> {getStatusBadge(selectedUser.user.is_active)}</div>
                </div>
              </Col>
              <Col md={6}>
                <h6>Thống kê</h6>
                <div className="info-group">
                  <div><strong>Dự án được gán:</strong> {selectedUser.project_permissions?.length || 0}</div>
                  <div><strong>AI Configs:</strong> {selectedUser.ai_configurations?.length || 0}</div>
                  <div><strong>Ngày tạo:</strong> {new Date(selectedUser.user.created_at).toLocaleDateString('vi-VN')}</div>
                  <div><strong>Đăng nhập cuối:</strong> {selectedUser.user.last_login ? new Date(selectedUser.user.last_login).toLocaleDateString('vi-VN') : 'Chưa có'}</div>
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUserModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      {/* AI Configuration Manager - Phân hệ 2.4.3 */}
      <AIConfigManager
        user={selectedUser}
        userId={selectedUser?.user?.id || selectedUser?.id}
        show={showAIConfigModal}
        onHide={() => {
          setShowAIConfigModal(false);
          setSelectedUser(null);
        }}
        onSave={() => {
          loadUsers();
          showSuccess('Cấu hình AI đã được cập nhật thành công!');
        }}
      />

      {/* Permission Manager Modal */}
      <PermissionManager
        user={selectedUser}
        userId={selectedUser?.user?.id || selectedUser?.id}
        show={showPermissionModal}
        onHide={() => {
          setShowPermissionModal(false);
          setSelectedUser(null);
        }}
        onSave={() => {
          loadUsers();
          showSuccess('Cập nhật quyền hạn thành công!');
        }}
      />
    </Container>
  );
}

export default UserManagement;