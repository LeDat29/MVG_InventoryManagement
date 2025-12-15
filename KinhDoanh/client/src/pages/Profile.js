/**
 * Profile Page - KHO MVG
 * Trang quản lý hồ sơ cá nhân
 */

import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Alert, Tab, Nav } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

function Profile() {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Mock update for now
      setTimeout(() => {
        showSuccess('Cập nhật thông tin thành công!');
        setLoading(false);
      }, 1000);
    } catch (error) {
      showError(error.message || 'Cập nhật thông tin thất bại');
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      // Mock change password for now
      setTimeout(() => {
        showSuccess('Đổi mật khẩu thành công!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      showError(error.message || 'Đổi mật khẩu thất bại');
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const roleMap = {
      admin: { variant: 'danger', label: 'Quản trị viên' },
      manager: { variant: 'success', label: 'Quản lý' },
      staff: { variant: 'primary', label: 'Nhân viên' },
      viewer: { variant: 'secondary', label: 'Xem' }
    };
    
    const roleInfo = roleMap[role] || { variant: 'secondary', label: role };
    return <Badge bg={roleInfo.variant}>{roleInfo.label}</Badge>;
  };

  const getPermissionBadges = (permissions) => {
    if (!permissions || permissions.length === 0) return null;
    
    if (permissions.includes('all')) {
      return <Badge bg="warning">Toàn quyền</Badge>;
    }

    return permissions.slice(0, 3).map((permission, index) => (
      <Badge key={index} bg="outline-secondary" className="me-1">
        {permission}
      </Badge>
    ));
  };

  return (
    <Container fluid className="p-4">
      {/* Page Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Hồ sơ cá nhân</h2>
              <p className="text-muted mb-0">
                Quản lý thông tin cá nhân và cài đặt tài khoản
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col lg={4} className="mb-4">
          {/* User Info Card */}
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="mb-3">
                <div 
                  className="mx-auto"
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '2.5rem',
                    fontWeight: 'bold'
                  }}
                >
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </div>
              
              <h5 className="mb-1">{user?.full_name}</h5>
              <p className="text-muted mb-2">{user?.email}</p>
              
              <div className="mb-3">
                {getRoleBadge(user?.role)}
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between text-sm">
                  <span>Đăng nhập lần cuối:</span>
                  <span className="text-muted">
                    {user?.last_login ? 
                      new Date(user.last_login).toLocaleDateString('vi-VN') : 
                      'Chưa có'
                    }
                  </span>
                </div>
                <div className="d-flex justify-content-between text-sm mt-1">
                  <span>Tạo tài khoản:</span>
                  <span className="text-muted">
                    {user?.created_at ? 
                      new Date(user.created_at).toLocaleDateString('vi-VN') : 
                      'Chưa có'
                    }
                  </span>
                </div>
              </div>

              {user?.permissions && user.permissions.length > 0 && (
                <div>
                  <h6 className="mb-2">Quyền hạn:</h6>
                  <div>{getPermissionBadges(user.permissions)}</div>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Quick Stats */}
          <Card className="border-0 shadow-sm mt-3">
            <Card.Header className="bg-white border-0">
              <h6 className="mb-0">Thống kê hoạt động</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span>Dự án truy cập:</span>
                <strong className="text-primary">8</strong>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span>Khách hàng quản lý:</span>
                <strong className="text-success">15</strong>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span>Hợp đồng xử lý:</span>
                <strong className="text-warning">23</strong>
              </div>
              <div className="d-flex justify-content-between py-2">
                <span>Tài liệu upload:</span>
                <strong className="text-info">42</strong>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          {/* Main Content */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
                <Nav variant="tabs" className="border-0">
                  <Nav.Item>
                    <Nav.Link eventKey="info">
                      <i className="fas fa-user me-2"></i>
                      Thông tin cá nhân
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="password">
                      <i className="fas fa-lock me-2"></i>
                      Đổi mật khẩu
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="security">
                      <i className="fas fa-shield-alt me-2"></i>
                      Bảo mật
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="activity">
                      <i className="fas fa-history me-2"></i>
                      Lịch sử hoạt động
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </Tab.Container>
            </Card.Header>

            <Card.Body>
              <Tab.Container activeKey={activeTab}>
                <Tab.Content>
                  {/* Profile Info Tab */}
                  <Tab.Pane eventKey="info">
                    <Form onSubmit={handleProfileSubmit}>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Tên đầy đủ *</Form.Label>
                            <Form.Control
                              type="text"
                              value={profileData.full_name}
                              onChange={(e) => setProfileData(prev => ({
                                ...prev,
                                full_name: e.target.value
                              }))}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Email *</Form.Label>
                            <Form.Control
                              type="email"
                              value={profileData.email}
                              onChange={(e) => setProfileData(prev => ({
                                ...prev,
                                email: e.target.value
                              }))}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Số điện thoại</Form.Label>
                            <Form.Control
                              type="tel"
                              value={profileData.phone}
                              onChange={(e) => setProfileData(prev => ({
                                ...prev,
                                phone: e.target.value
                              }))}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Tên đăng nhập</Form.Label>
                            <Form.Control
                              type="text"
                              value={user?.username}
                              disabled
                              className="bg-light"
                            />
                            <Form.Text className="text-muted">
                              Tên đăng nhập không thể thay đổi
                            </Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Vai trò</Form.Label>
                            <div className="pt-2">
                              {getRoleBadge(user?.role)}
                            </div>
                            <Form.Text className="text-muted">
                              Vai trò được quản lý bởi Admin
                            </Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>

                      <div className="d-flex gap-2">
                        <Button 
                          type="submit" 
                          variant="primary" 
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2"></span>
                              Đang cập nhật...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save me-2"></i>
                              Lưu thay đổi
                            </>
                          )}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline-secondary"
                          onClick={() => setProfileData({
                            full_name: user?.full_name || '',
                            email: user?.email || '',
                            phone: user?.phone || ''
                          })}
                        >
                          Hủy
                        </Button>
                      </div>
                    </Form>
                  </Tab.Pane>

                  {/* Password Tab */}
                  <Tab.Pane eventKey="password">
                    <Alert variant="info" className="mb-4">
                      <i className="fas fa-info-circle me-2"></i>
                      Để bảo mật tài khoản, vui lòng sử dụng mật khẩu mạnh có ít nhất 6 ký tự.
                    </Alert>

                    <Form onSubmit={handlePasswordSubmit}>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Mật khẩu hiện tại *</Form.Label>
                            <Form.Control
                              type="password"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData(prev => ({
                                ...prev,
                                currentPassword: e.target.value
                              }))}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Mật khẩu mới *</Form.Label>
                            <Form.Control
                              type="password"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData(prev => ({
                                ...prev,
                                newPassword: e.target.value
                              }))}
                              minLength={6}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Xác nhận mật khẩu mới *</Form.Label>
                            <Form.Control
                              type="password"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData(prev => ({
                                ...prev,
                                confirmPassword: e.target.value
                              }))}
                              minLength={6}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <div className="d-flex gap-2">
                        <Button 
                          type="submit" 
                          variant="primary" 
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2"></span>
                              Đang đổi mật khẩu...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-key me-2"></i>
                              Đổi mật khẩu
                            </>
                          )}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline-secondary"
                          onClick={() => setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: ''
                          })}
                        >
                          Hủy
                        </Button>
                      </div>
                    </Form>
                  </Tab.Pane>

                  {/* Security Tab */}
                  <Tab.Pane eventKey="security">
                    <h5 className="mb-3">Cài đặt bảo mật</h5>
                    
                    <div className="security-item p-3 border rounded mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">Xác thực 2 bước</h6>
                          <p className="text-muted mb-0">Tăng cường bảo mật với OTP qua SMS</p>
                        </div>
                        <Badge bg="secondary">Chưa kích hoạt</Badge>
                      </div>
                    </div>

                    <div className="security-item p-3 border rounded mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">Phiên đăng nhập</h6>
                          <p className="text-muted mb-0">Quản lý các phiên đăng nhập hiện tại</p>
                        </div>
                        <Button variant="outline-primary" size="sm">
                          Xem chi tiết
                        </Button>
                      </div>
                    </div>

                    <div className="security-item p-3 border rounded mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">Thông báo đăng nhập</h6>
                          <p className="text-muted mb-0">Nhận thông báo khi có đăng nhập từ thiết bị mới</p>
                        </div>
                        <Form.Check type="switch" defaultChecked />
                      </div>
                    </div>

                    <Alert variant="warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      <strong>Lưu ý:</strong> Các tính năng bảo mật nâng cao sẽ được triển khai trong phiên bản tiếp theo.
                    </Alert>
                  </Tab.Pane>

                  {/* Activity Tab */}
                  <Tab.Pane eventKey="activity">
                    <h5 className="mb-3">Lịch sử hoạt động</h5>
                    
                    <div className="activity-list">
                      {[
                        { icon: 'fas fa-sign-in-alt text-success', action: 'Đăng nhập hệ thống', time: '2 giờ trước', location: 'Chrome, Windows' },
                        { icon: 'fas fa-edit text-primary', action: 'Cập nhật thông tin khách hàng KH001', time: '4 giờ trước', location: 'Chrome, Windows' },
                        { icon: 'fas fa-file-upload text-info', action: 'Upload tài liệu hợp đồng', time: '1 ngày trước', location: 'Chrome, Windows' },
                        { icon: 'fas fa-user-edit text-warning', action: 'Thay đổi thông tin cá nhân', time: '3 ngày trước', location: 'Chrome, Windows' },
                        { icon: 'fas fa-key text-danger', action: 'Đổi mật khẩu', time: '1 tuần trước', location: 'Chrome, Windows' }
                      ].map((activity, index) => (
                        <div key={index} className="d-flex align-items-start mb-3 pb-3 border-bottom">
                          <div className="activity-icon me-3">
                            <i className={activity.icon}></i>
                          </div>
                          <div className="flex-grow-1">
                            <div className="fw-medium">{activity.action}</div>
                            <div className="text-muted small">
                              {activity.time} • {activity.location}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-center mt-3">
                      <Button variant="outline-primary">
                        Xem thêm lịch sử
                      </Button>
                    </div>
                  </Tab.Pane>
                </Tab.Content>
              </Tab.Container>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <style jsx>{`
        .activity-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
        }

        .security-item {
          transition: all 0.2s ease;
        }

        .security-item:hover {
          background-color: #f8f9fa;
        }
      `}</style>
    </Container>
  );
}

export default Profile;