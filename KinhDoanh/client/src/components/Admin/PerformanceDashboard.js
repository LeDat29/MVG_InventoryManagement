/**
 * Performance Dashboard - KHO MVG
 * Real-time monitoring dashboard for system performance
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Badge, Table, Alert, Button, Form } from 'react-bootstrap';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../Common/LoadingSpinner';
import performanceMonitor from '../../utils/performanceMonitor';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function PerformanceDashboard() {
  const { hasPermission } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadMetrics = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const [summaryResponse, dashboardResponse] = await Promise.all([
        fetch(`/api/metrics/summary?timeframe=${timeframe}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/metrics/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (summaryResponse.ok && dashboardResponse.ok) {
        const summaryData = await summaryResponse.json();
        const dashboardData = await dashboardResponse.json();
        
        setMetrics(summaryData.data);
        setRealtime(dashboardData.data);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    if (hasPermission('admin')) {
      loadMetrics();
    }
  }, [hasPermission, loadMetrics]);

  useEffect(() => {
    let interval;
    if (autoRefresh && hasPermission('admin')) {
      interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh, hasPermission, loadMetrics]);

  const exportMetrics = () => {
    performanceMonitor.exportMetrics();
  };

  const getHealthBadge = (status) => {
    switch (status) {
      case 'healthy': return <Badge bg="success">Healthy</Badge>;
      case 'warning': return <Badge bg="warning">Warning</Badge>;
      case 'error': return <Badge bg="danger">Error</Badge>;
      default: return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (!hasPermission('admin')) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          Bạn không có quyền truy cập performance dashboard.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return <LoadingSpinner text="Đang tải performance metrics..." />;
  }

  // Chart configurations
  const pageLoadChart = {
    labels: ['Load Time', 'DOM Ready', 'First Paint'],
    datasets: [{
      label: 'Performance (ms)',
      data: metrics?.pageLoad ? [
        metrics.pageLoad.avg_load_time || 0,
        metrics.pageLoad.avg_dom_ready || 0,
        metrics.pageLoad.avg_first_paint || 0
      ] : [0, 0, 0],
      backgroundColor: ['#007bff', '#28a745', '#ffc107'],
      borderColor: ['#0056b3', '#1e7e34', '#d39e00'],
      borderWidth: 1
    }]
  };

  const apiCallsChart = {
    labels: ['Success', 'Errors'],
    datasets: [{
      data: metrics?.apiCalls ? [
        (metrics.apiCalls.total_calls || 0) - (metrics.apiCalls.error_count || 0),
        metrics.apiCalls.error_count || 0
      ] : [0, 0],
      backgroundColor: ['#28a745', '#dc3545'],
      borderColor: ['#1e7e34', '#bd2130'],
      borderWidth: 1
    }]
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>
              <i className="fas fa-chart-line me-2"></i>
              Performance Dashboard
            </h2>
            <div className="d-flex gap-2">
              <Form.Select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </Form.Select>
              <Button
                variant={autoRefresh ? "success" : "outline-secondary"}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <i className="fas fa-sync-alt me-2"></i>
                Auto Refresh
              </Button>
              <Button variant="outline-primary" onClick={exportMetrics}>
                <i className="fas fa-download me-2"></i>
                Export
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Real-time Status */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5>System Health</h5>
              {getHealthBadge(realtime?.health?.database?.status || 'unknown')}
              <div className="mt-2">
                <small>DB: {realtime?.health?.database?.responseTime || 0}ms</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5>Active Users</h5>
              <h3 className="text-primary">{realtime?.activeUsers || 0}</h3>
              <small>Last 15 minutes</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5>Memory Usage</h5>
              <h4>{formatBytes(realtime?.health?.memory?.heapUsed || 0)}</h4>
              <small>of {formatBytes(realtime?.health?.memory?.heapTotal || 0)}</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5>Uptime</h5>
              <h4>{Math.floor((realtime?.health?.uptime || 0) / 3600)}h</h4>
              <small>Server running</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Performance Charts */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Page Load Performance</h5>
            </Card.Header>
            <Card.Body>
              {metrics?.pageLoad ? (
                <Bar data={pageLoadChart} options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Time (ms)'
                      }
                    }
                  }
                }} />
              ) : (
                <p className="text-muted">No data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>API Call Success Rate</h5>
            </Card.Header>
            <Card.Body>
              {metrics?.apiCalls ? (
                <Doughnut data={apiCallsChart} options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }} />
              ) : (
                <p className="text-muted">No data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Detailed Metrics */}
      <Row>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Performance Summary</h5>
            </Card.Header>
            <Card.Body>
              <Table size="sm">
                <tbody>
                  <tr>
                    <td><strong>Total Page Loads</strong></td>
                    <td>{metrics?.pageLoad?.total_loads || 0}</td>
                  </tr>
                  <tr>
                    <td><strong>Avg Load Time</strong></td>
                    <td>{formatDuration(metrics?.pageLoad?.avg_load_time || 0)}</td>
                  </tr>
                  <tr>
                    <td><strong>Max Load Time</strong></td>
                    <td>{formatDuration(metrics?.pageLoad?.max_load_time || 0)}</td>
                  </tr>
                  <tr>
                    <td><strong>Total API Calls</strong></td>
                    <td>{metrics?.apiCalls?.total_calls || 0}</td>
                  </tr>
                  <tr>
                    <td><strong>Avg API Duration</strong></td>
                    <td>{formatDuration(metrics?.apiCalls?.avg_duration || 0)}</td>
                  </tr>
                  <tr>
                    <td><strong>API Error Rate</strong></td>
                    <td>{((metrics?.apiCalls?.error_count || 0) / (metrics?.apiCalls?.total_calls || 1) * 100).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Recent Errors</h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {metrics?.errors?.topErrors?.length > 0 ? (
                <Table size="sm">
                  <thead>
                    <tr>
                      <th>Error Message</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.errors.topErrors.map((error, index) => (
                      <tr key={index}>
                        <td>
                          <small>{error.error_message || 'Unknown error'}</small>
                        </td>
                        <td>
                          <Badge bg="danger">{error.count}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-success">No recent errors! 🎉</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <Row className="mt-4">
          <Col>
            <Card>
              <Card.Header>
                <h5>Debug Information</h5>
              </Card.Header>
              <Card.Body>
                <Button
                  variant="outline-primary"
                  onClick={() => window.performanceMonitor?.logMetrics()}
                >
                  Log Metrics to Console
                </Button>
                <Button
                  variant="outline-secondary"
                  className="ms-2"
                  onClick={exportMetrics}
                >
                  Export Raw Data
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}

export default PerformanceDashboard;