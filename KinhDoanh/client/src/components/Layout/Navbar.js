/**
 * Navbar Component - KHO MVG
 * Top navigation bar với user actions
 */

import React, { useState } from 'react';
import { Navbar as BsNavbar, Nav, NavDropdown, Badge } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

function Navbar() {
  const { user, logout } = useAuth();
  const { showConfirmation } = useNotification();
  const navigate = useNavigate();
  const [notifications] = useState([
    { id: 1, message: 'Hợp đồng HD240001 sắp hết hạn', type: 'warning', time: '5 phút trước' },
    { id: 2, message: 'Khách hàng mới đã đăng ký', type: 'info', time: '10 phút trước' }
  ]);

  const handleLogout = () => {
    showConfirmation(
      'Bạn có chắc chắn muốn đăng xuất?',
      () => {
        logout();
      }
    );
  };

  const goToProfile = () => {
    navigate('/profile');
  };

  const goToSettings = () => {
    navigate('/settings');
  };

  return (
    <BsNavbar bg="white" className="app-navbar px-3 border-bottom">
      <div className="d-flex align-items-center">
        {/* Breadcrumb hoặc page title có thể thêm ở đây */}
        <h5 className="mb-0 text-dark">
          Chào mừng, {user?.full_name}!
        </h5>
      </div>

      <Nav className="ms-auto d-flex align-items-center">
        {/* Notifications */}
        <NavDropdown
          title={
            <div className="position-relative d-inline-block">
              <i className="fas fa-bell fs-5"></i>
              {notifications.length > 0 && (
                <Badge 
                  bg="danger" 
                  className="position-absolute top-0 start-100 translate-middle"
                  style={{ fontSize: '0.6rem' }}
                >
                  {notifications.length}
                </Badge>
              )}
            </div>
          }
          id="notifications-dropdown"
          className="me-3"
        >
          <NavDropdown.Header>Thông báo</NavDropdown.Header>
          {notifications.length > 0 ? (
            <>
              {notifications.map((notification) => (
                <NavDropdown.Item key={notification.id} className="py-2">
                  <div className="d-flex">
                    <div className="me-2">
                      <i className={`fas ${
                        notification.type === 'warning' ? 'fa-exclamation-triangle text-warning' :
                        notification.type === 'info' ? 'fa-info-circle text-info' :
                        'fa-check-circle text-success'
                      }`}></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-medium">{notification.message}</div>
                      <small className="text-muted">{notification.time}</small>
                    </div>
                  </div>
                </NavDropdown.Item>
              ))}
              <NavDropdown.Divider />
              <NavDropdown.Item className="text-center text-primary">
                Xem tất cả thông báo
              </NavDropdown.Item>
            </>
          ) : (
            <NavDropdown.Item disabled>
              Không có thông báo mới
            </NavDropdown.Item>
          )}
        </NavDropdown>

        {/* User Dropdown */}
        <NavDropdown
          title={
            <div className="d-flex align-items-center">
              <div className="user-avatar me-2">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="d-none d-md-inline">{user?.full_name}</span>
            </div>
          }
          id="user-dropdown"
          className="user-dropdown"
        >
          <div className="px-3 py-2 border-bottom">
            <div className="fw-bold">{user?.full_name}</div>
            <small className="text-muted">{user?.email}</small>
            <div>
              <Badge bg={
                user?.role === 'admin' ? 'primary' :
                user?.role === 'manager' ? 'success' :
                user?.role === 'staff' ? 'info' : 'secondary'
              }>
                {user?.role?.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <NavDropdown.Item onClick={goToProfile}>
            <i className="fas fa-user me-2"></i>
            Hồ sơ cá nhân
          </NavDropdown.Item>
          
          <NavDropdown.Item onClick={goToSettings}>
            <i className="fas fa-cog me-2"></i>
            Cài đặt
          </NavDropdown.Item>
          
          <NavDropdown.Item href="/api/docs" target="_blank">
            <i className="fas fa-book me-2"></i>
            API Documentation
          </NavDropdown.Item>
          
          <NavDropdown.Divider />
          
          <NavDropdown.Item onClick={handleLogout} className="text-danger">
            <i className="fas fa-sign-out-alt me-2"></i>
            Đăng xuất
          </NavDropdown.Item>
        </NavDropdown>
      </Nav>

      <style jsx>{`
        .user-avatar {
          width: 35px;
          height: 35px;
          border-radius: 50%;
          background: linear-gradient(135deg, #007bff, #0056b3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .user-dropdown .dropdown-toggle::after {
          margin-left: 8px;
        }

        .app-navbar {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          position: sticky;
          top: 0;
          z-index: 1020;
        }

        @media (max-width: 768px) {
          .app-navbar {
            padding: 0.5rem 1rem;
          }
        }
      `}</style>
    </BsNavbar>
  );
}

export default Navbar;