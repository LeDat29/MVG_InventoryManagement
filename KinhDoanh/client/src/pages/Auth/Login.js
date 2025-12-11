/**
 * Login Page - KHO MVG
 * Trang đăng nhập với validation và security features
 */

import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Container, Card } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const { login } = useAuth();
  const { showError, showSuccess } = useNotification();

  // Load saved credentials if remember me was checked
  useEffect(() => {
    const savedUsername = localStorage.getItem('remembered_username');
    if (savedUsername) {
      setFormData(prev => ({ ...prev, username: savedUsername }));
      setRememberMe(true);
    }
  }, []);

  /**
   * Handle form input changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!formData.username.trim()) {
      setError('Vui lòng nhập tên đăng nhập hoặc email');
      return;
    }

    if (!formData.password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      console.log('🔍 Login attempt:', { username: formData.username, hasPassword: !!formData.password });
      const result = await login(formData);
      console.log('🔍 Login result:', result);
      
      if (!result.success) {
        throw new Error(result.message || 'Đăng nhập thất bại');
      }
      
      // Save username if remember me is checked
      if (rememberMe) {
        localStorage.setItem('remembered_username', formData.username);
      } else {
        localStorage.removeItem('remembered_username');
      }

      showSuccess('Đăng nhập thành công!');
    } catch (error) {
      import('../../utils/errorLogger').then(({ default: ErrorLogger }) => {
        ErrorLogger.logError(error, { action: 'login', username: formData.username });
      });
      setError(error.message || 'Đăng nhập thất bại');
      showError(error.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle demo login (for testing)
   */
  const handleDemoLogin = async (role = 'admin') => {
    const demoCredentials = {
      admin: { username: 'admin', password: 'admin123' },
      manager: { username: 'manager', password: 'manager123' },
      staff: { username: 'staff', password: 'staff123' }
    };

    const credentials = demoCredentials[role];
    if (!credentials) return;

    setFormData(credentials);
    setLoading(true);

    try {
      await login(credentials.username, credentials.password);
      showSuccess(`Đăng nhập demo thành công với role ${role}!`);
    } catch (error) {
      import('../../utils/errorLogger').then(({ default: ErrorLogger }) => {
        ErrorLogger.logError(error, { action: 'demoLogin' });
      });
      showError('Demo login thất bại');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if form is valid
   */
  const isFormValid = formData.username.trim() && formData.password.length >= 6;

  return (
    <Container fluid className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <i className="fas fa-warehouse"></i>
          </div>
          <h2 className="login-title">KHO MVG</h2>
          <p className="login-subtitle">
            Hệ thống quản lý hỗ trợ kinh doanh các dự án kho xưởng
          </p>
        </div>

        <Form onSubmit={handleSubmit}>
          {error && (
            <Alert variant="danger" className="mb-3">
              <i className="fas fa-exclamation-circle me-2"></i>
              {error}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>
              <i className="fas fa-user me-2"></i>
              Tên đăng nhập hoặc Email
            </Form.Label>
            <Form.Control
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Nhập tên đăng nhập hoặc email"
              disabled={loading}
              autoComplete="username"
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              <i className="fas fa-lock me-2"></i>
              Mật khẩu
            </Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Nhập mật khẩu"
              disabled={loading}
              autoComplete="current-password"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Ghi nhớ đăng nhập"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
            />
          </Form.Group>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-100 mb-3"
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang đăng nhập...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt me-2"></i>
                Đăng nhập
              </>
            )}
          </Button>

          {/* Demo login buttons for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="demo-login-section">
              <hr className="my-3" />
              <small className="text-muted d-block text-center mb-2">Demo Login (Development)</small>
              <div className="d-grid gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handleDemoLogin('admin')}
                  disabled={loading}
                >
                  Demo Admin
                </Button>
                <div className="row g-1">
                  <div className="col">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="w-100"
                      onClick={() => handleDemoLogin('manager')}
                      disabled={loading}
                    >
                      Demo Manager
                    </Button>
                  </div>
                  <div className="col">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="w-100"
                      onClick={() => handleDemoLogin('staff')}
                      disabled={loading}
                    >
                      Demo Staff
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Form>

        <div className="text-center mt-4">
          <small className="text-muted">
            Bằng cách đăng nhập, bạn đồng ý với{' '}
            <a href="/terms" className="text-decoration-none">
              Điều khoản sử dụng
            </a>{' '}
            và{' '}
            <a href="/privacy" className="text-decoration-none">
              Chính sách bảo mật
            </a>
          </small>
        </div>

        <div className="text-center mt-3">
          <small className="text-muted">
            <i className="fas fa-shield-alt me-1"></i>
            Kết nối bảo mật SSL
          </small>
        </div>
      </Card>

      {/* Background elements for visual appeal */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '100px',
        height: '100px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '50%',
        animation: 'float 6s ease-in-out infinite'
      }}></div>
      
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '15%',
        width: '150px',
        height: '150px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '50%',
        animation: 'float 8s ease-in-out infinite reverse'
      }}></div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .demo-login-section {
          border-top: 1px solid #e9ecef;
          padding-top: 1rem;
        }

        .login-card {
          position: relative;
          z-index: 2;
        }

        @media (max-width: 576px) {
          .login-card {
            margin: 1rem;
            padding: 1.5rem;
          }
          
          .login-logo {
            font-size: 2.5rem;
          }
          
          .login-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </Container>
  );
}

export default Login;