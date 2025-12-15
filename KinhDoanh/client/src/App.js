/**
 * Main App Component - KHO MVG
 * Quản lý routing và layout chính của ứng dụng
 */

import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';

// Layout components
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import LoadingSpinner from './components/Common/LoadingSpinner';
import OfflineIndicator from './components/Common/OfflineIndicator';
import FloatingChatButton from './components/AI/FloatingChatButton';

// Page components (lazy loaded)
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Login = React.lazy(() => import('./pages/Auth/Login'));
const Projects = React.lazy(() => import('./pages/Projects'));
const ProjectDetail = React.lazy(() => import('./pages/Projects/ProjectDetail'));
const ProjectEdit = React.lazy(() => import('./pages/Projects/ProjectEdit'));
const Customers = React.lazy(() => import('./pages/Customers'));
const CustomerDetail = React.lazy(() => import('./pages/Customers/CustomerDetail'));
const Contracts = React.lazy(() => import('./pages/Contracts'));
const Documents = React.lazy(() => import('./pages/Documents'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const UserManagement = React.lazy(() => import('./pages/Users/UserManagement'));
const ActivityLogs = React.lazy(() => import('./pages/Admin/ActivityLogs'));

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Use centralized error logger
    import('./utils/errorLogger').then(({ default: ErrorLogger }) => {
      ErrorLogger.logError(error, {
        component: 'App',
        errorInfo: errorInfo?.componentStack
      });
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mt-5">
          <div className="alert alert-danger text-center">
            <i className="fas fa-exclamation-triangle fa-3x mb-3"></i>
            <h4>Đã xảy ra lỗi</h4>
            <p>Ứng dụng gặp lỗi không mong muốn. Vui lòng tải lại trang.</p>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              <i className="fas fa-redo me-2"></i>Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Protected Route component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Public Route component (redirect if authenticated)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  // Check for app updates
  useEffect(() => {
    // TEMPORARILY DISABLED: Service Worker causing issues  
    // if ('serviceWorker' in navigator) {
    //   navigator.serviceWorker.addEventListener('controllerchange', () => {
    //     showNotification('Ứng dụng đã được cập nhật! Vui lòng tải lại trang.', 'info');
    //   });
    // }

    // Check online/offline status
    const handleOnline = () => {
      showNotification('Đã kết nối internet', 'success');
    };

    const handleOffline = () => {
      showNotification('Mất kết nối internet. Một số tính năng có thể bị hạn chế.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showNotification]);

  return (
    <ErrorBoundary>
      <div className="App">
        <OfflineIndicator />
        
        {/* Floating AI Chat Button - Only show when authenticated */}
        {user && <FloatingChatButton />}
        
        {user ? (
          // Authenticated layout
          <div>
            <Sidebar />
            <div className="main-content">
              <Navbar />
              <div className="page-container">
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/projects" element={
                      <ProtectedRoute>
                        <Projects />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/projects/:id" element={
                      <ProtectedRoute>
                        <ProjectDetail />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/projects/:id/edit" element={
                      <ProtectedRoute>
                        <ProjectEdit />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/customers" element={
                      <ProtectedRoute>
                        <Customers />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/customers/:id" element={
                      <ProtectedRoute>
                        <CustomerDetail />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/contracts" element={
                      <ProtectedRoute>
                        <Contracts />
                      </ProtectedRoute>
                    } />

                    <Route path="/contracts/create" element={
                      <ProtectedRoute>
                        <Contracts />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/documents" element={
                      <ProtectedRoute>
                        <Documents />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/reports" element={
                      <ProtectedRoute>
                        <Reports />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/settings" element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/profile" element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } />

                    {/* User Management - Admin/Manager only */}
                    <Route path="/users" element={
                      <ProtectedRoute>
                        <UserManagement />
                      </ProtectedRoute>
                    } />

                    {/* Activity Logs - Admin only */}
                    <Route path="/admin/activity-logs" element={
                      <ProtectedRoute>
                        <ActivityLogs />
                      </ProtectedRoute>
                    } />
                    
                    {/* Redirect any unknown routes to dashboard */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </div>
            </div>
          </div>
        ) : (
          // Public layout
          <div className="public-layout">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/login" element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } />
                
                {/* Redirect any unknown routes to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </div>
        )}

        {/* Toast notifications */}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;