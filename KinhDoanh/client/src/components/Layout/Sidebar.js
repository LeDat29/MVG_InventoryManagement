/**
 * Sidebar Component - KHO MVG
 * Navigation sidebar với responsive design
 */

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const location = useLocation();
  const { user, hasPermission } = useAuth();

  /**
   * Navigation menu items
   */
  const menuItems = [
    {
      path: '/',
      icon: 'fas fa-tachometer-alt',
      label: 'Dashboard',
      permission: null
    },
    {
      path: '/projects',
      icon: 'fas fa-building',
      label: 'Dự án',
      permission: 'project_read'
    },
    {
      path: '/customers',
      icon: 'fas fa-users',
      label: 'Khách hàng',
      permission: 'customer_read'
    },
    {
      path: '/contracts',
      icon: 'fas fa-file-contract',
      label: 'Hợp đồng',
      permission: 'contract_read'
    },
    {
      path: '/documents',
      icon: 'fas fa-folder',
      label: 'Hồ sơ',
      permission: 'document_read'
    },
    {
      path: '/reports',
      icon: 'fas fa-chart-line',
      label: 'Báo cáo',
      permission: 'report_read'
    },
    {
      path: '/users',
      icon: 'fas fa-user-cog',
      label: 'Quản lý User',
      permission: 'user_read',
      roles: ['admin', 'manager']
    },
    {
      path: '/admin/activity-logs',
      icon: 'fas fa-history',
      label: 'Lịch sử hoạt động',
      permission: null,
      roles: ['admin']
    },
    {
      path: '/settings',
      icon: 'fas fa-cog',
      label: 'Cài đặt',
      permission: 'setting_read'
    }
  ];

  /**
   * Filter menu items based on user permissions and roles
   */
  const visibleMenuItems = menuItems.filter(item => {
    // Always show Dashboard
    if (item.path === '/') {
      return true;
    }
    
    // Check role restriction first
    if (item.roles && !item.roles.includes(user?.role)) {
      return false;
    }
    
    // Check permission properly
    return !item.permission || hasPermission(item.permission);
  });

  /**
   * Toggle sidebar collapse
   */
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  /**
   * Toggle mobile sidebar
   */
  const toggleMobile = () => {
    setShowMobile(!showMobile);
  };

  /**
   * Close mobile sidebar when clicking on menu item
   */
  const handleMenuClick = () => {
    if (window.innerWidth <= 768) {
      setShowMobile(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {showMobile && window.innerWidth <= 768 && (
        <div 
          className="mobile-overlay"
          onClick={toggleMobile}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${showMobile ? 'show' : ''}`}
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <i className="fas fa-warehouse fa-2x text-white me-2"></i>
              {!collapsed && (
                <div>
                  <h4 className="text-white mb-0 fw-bold">KHO MVG</h4>
                  <small className="text-white-50">v1.0.0</small>
                </div>
              )}
            </div>
            
            {/* Collapse button - desktop only */}
            <button
              className="btn btn-link text-white p-0 d-none d-md-block"
              onClick={toggleCollapse}
              title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              <i className={`fas ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
            </button>

            {/* Close button - mobile only */}
            <button
              className="btn btn-link text-white p-0 d-md-none"
              onClick={toggleMobile}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="sidebar-user-info">
          <div className="d-flex align-items-center p-3 border-bottom border-light border-opacity-25">
            <div className="user-avatar me-2">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="text-white">
                <div className="fw-semibold">{user?.full_name}</div>
                <small className="text-white-50">{user?.role}</small>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-menu">
          {visibleMenuItems.map((item, index) => {
            const isActive = location.pathname === item.path || 
                           (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={index}
                to={item.path}
                className={`sidebar-menu-item ${isActive ? 'active' : ''}`}
                onClick={handleMenuClick}
                title={collapsed ? item.label : ''}
              >
                <i className={item.icon}></i>
                {!collapsed && <span>{item.label}</span>}
                {isActive && <div className="active-indicator"></div>}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {!collapsed && (
          <div className="sidebar-footer mt-auto p-3 border-top border-light border-opacity-25">
            <div className="text-center">
              <small className="text-white-50">
                &copy; 2024 KHO MVG<br />
                All rights reserved
              </small>
            </div>
          </div>
        )}
      </div>

      {/* Mobile menu toggle button */}
      <button
        className="mobile-menu-toggle d-md-none"
        onClick={toggleMobile}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 1001,
          backgroundColor: 'rgba(0, 123, 255, 0.9)',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          color: 'white',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}
      >
        <i className="fas fa-bars"></i>
      </button>

      <style jsx>{`
        .sidebar {
          transition: all 0.3s ease;
          box-shadow: 2px 0 10px rgba(0,0,0,0.1);
        }

        .sidebar-menu-item {
          position: relative;
          display: flex;
          align-items: center;
          padding: 12px 20px;
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
        }

        .sidebar-menu-item:hover {
          background-color: rgba(255,255,255,0.1);
          color: white;
          border-left-color: rgba(255,255,255,0.3);
        }

        .sidebar-menu-item.active {
          background-color: rgba(255,255,255,0.15);
          color: white;
          border-left-color: #ffc107;
        }

        .sidebar-menu-item i {
          width: 20px;
          margin-right: 12px;
          text-align: center;
          font-size: 16px;
        }

        .sidebar.collapsed .sidebar-menu-item {
          padding: 12px;
          justify-content: center;
        }

        .sidebar.collapsed .sidebar-menu-item span {
          display: none;
        }

        .sidebar.collapsed .sidebar-menu-item i {
          margin-right: 0;
        }

        .active-indicator {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 20px;
          background-color: #ffc107;
          border-radius: 2px 0 0 2px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ffc107, #ff8f00);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: #333;
        }

        .mobile-menu-toggle {
          transition: all 0.3s ease;
        }

        .mobile-menu-toggle:hover {
          transform: scale(1.1);
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
            width: 280px !important;
          }

          .sidebar.show {
            transform: translateX(0);
          }
        }

        @media (min-width: 769px) {
          .mobile-menu-toggle {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

export default Sidebar;