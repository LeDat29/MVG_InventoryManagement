/**
 * System Monitoring Page - KHO MVG
 * Tổng hợp monitoring toàn hệ thống
 */

import React, { Suspense } from 'react';
import { Container, Row, Col, Nav, Tab, Alert } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

// Lazy load performance dashboard
const PerformanceDashboard = React.lazy(() => import('../../components/Admin/PerformanceDashboard'));

function SystemMonitoring() {
  const { hasPermission } = useAuth();

  if (!hasPermission('admin')) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          <Alert.Heading>Không có quyền truy cập</Alert.Heading>
          <p>Bạn cần quyền admin để truy cập trang giám sát hệ thống.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="p-0">
      <Tab.Container defaultActiveKey="performance">
        <Row className="no-gutters">
          <Col md={2} className="bg-light min-vh-100">
            <Nav variant="pills" className="flex-column p-3">
              <Nav.Item>
                <Nav.Link eventKey="performance">
                  <i className="fas fa-chart-line me-2"></i>
                  Performance
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="errors">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Error Tracking
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="users">
                  <i className="fas fa-users me-2"></i>
                  User Activity
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="system">
                  <i className="fas fa-server me-2"></i>
                  System Health
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="cache">
                  <i className="fas fa-memory me-2"></i>
                  Cache Stats
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
          
          <Col md={10}>
            <Tab.Content>
              <Tab.Pane eventKey="performance">
                <Suspense fallback={<LoadingSpinner text="Loading Performance Dashboard..." />}>
                  <PerformanceDashboard />
                </Suspense>
              </Tab.Pane>
              
              <Tab.Pane eventKey="errors">
                <Container className="p-4">
                  <h3>Error Tracking & Debugging</h3>
                  <ErrorTrackingPanel />
                </Container>
              </Tab.Pane>
              
              <Tab.Pane eventKey="users">
                <Container className="p-4">
                  <h3>User Activity & Analytics</h3>
                  <UserActivityPanel />
                </Container>
              </Tab.Pane>
              
              <Tab.Pane eventKey="system">
                <Container className="p-4">
                  <h3>System Health & Resources</h3>
                  <SystemHealthPanel />
                </Container>
              </Tab.Pane>
              
              <Tab.Pane eventKey="cache">
                <Container className="p-4">
                  <h3>Cache Performance & Statistics</h3>
                  <CacheStatsPanel />
                </Container>
              </Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </Container>
  );
}

// Error Tracking Panel
function ErrorTrackingPanel() {
  return (
    <div>
      <Alert variant="info">
        🔧 Error tracking panel - Coming soon with detailed error analytics
      </Alert>
    </div>
  );
}

// User Activity Panel
function UserActivityPanel() {
  return (
    <div>
      <Alert variant="info">
        👥 User activity analytics - Coming soon with user behavior insights
      </Alert>
    </div>
  );
}

// System Health Panel
function SystemHealthPanel() {
  return (
    <div>
      <Alert variant="info">
        🖥️ System health monitoring - Coming soon with server resource tracking
      </Alert>
    </div>
  );
}

// Cache Stats Panel
function CacheStatsPanel() {
  const [cacheStats, setCacheStats] = React.useState(null);

  React.useEffect(() => {
    if (window.cacheOptimizer) {
      const stats = window.cacheOptimizer.getStats();
      setCacheStats(stats);
    }
  }, []);

  return (
    <div>
      {cacheStats ? (
        <Row>
          <Col md={6}>
            <div className="card">
              <div className="card-body">
                <h5>Cache Statistics</h5>
                <ul className="list-unstyled">
                  <li><strong>Cache Size:</strong> {cacheStats.size}/{cacheStats.maxSize}</li>
                  <li><strong>Hit Rate:</strong> {cacheStats.hitRate}%</li>
                  <li><strong>Total Hits:</strong> {cacheStats.hits}</li>
                  <li><strong>Total Misses:</strong> {cacheStats.misses}</li>
                  <li><strong>Total Sets:</strong> {cacheStats.sets}</li>
                </ul>
              </div>
            </div>
          </Col>
        </Row>
      ) : (
        <Alert variant="warning">
          Cache statistics not available. Cache optimizer may not be initialized.
        </Alert>
      )}
    </div>
  );
}

export default SystemMonitoring;