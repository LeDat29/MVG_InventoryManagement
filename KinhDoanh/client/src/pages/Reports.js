/**
 * Reports Page - KHO MVG
 * Trang báo cáo và thống kê
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Tab, Nav } from 'react-bootstrap';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

function Reports() {
  const { hasPermission } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');
  const [dateRange, setDateRange] = useState({
    startDate: '2024-01-01',
    endDate: '2024-02-15'
  });

  // Mock data for charts
  const revenueData = {
    labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    datasets: [
      {
        label: 'Doanh thu (tỷ VNĐ)',
        data: [1.2, 1.8, 2.1, 1.9, 2.3, 2.45],
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2
      }
    ]
  };

  const occupancyTrendData = {
    labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    datasets: [
      {
        label: 'Tỷ lệ thuê (%)',
        data: [65, 72, 78, 75, 82, 85],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const projectStatusData = {
    labels: ['Hoạt động', 'Xây dựng', 'Lên kế hoạch', 'Bảo trì'],
    datasets: [
      {
        data: [5, 2, 1, 0],
        backgroundColor: [
          'rgba(40, 167, 69, 0.8)',
          'rgba(255, 193, 7, 0.8)', 
          'rgba(23, 162, 184, 0.8)',
          'rgba(108, 117, 125, 0.8)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  const customerTypeData = {
    labels: ['Doanh nghiệp', 'Cá nhân'],
    datasets: [
      {
        data: [35, 10],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  useEffect(() => {
    if (!hasPermission('report_view')) {
      showError('Bạn không có quyền xem báo cáo');
      return;
    }

    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, [hasPermission, showError]);

  const handleExport = (type) => {
    if (!hasPermission('report_export')) {
      showError('Bạn không có quyền xuất báo cáo');
      return;
    }
    showSuccess(`Đang xuất báo cáo ${type}...`);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          borderDash: [2, 2]
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  if (loading) {
    return <LoadingSpinner text="Đang tải báo cáo..." />;
  }

  if (!hasPermission('report_view')) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="text-center">
          <h4>Không có quyền truy cập</h4>
          <p>Bạn không có quyền xem báo cáo hệ thống.</p>
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
              <h2 className="mb-1">Báo cáo & Thống kê</h2>
              <p className="text-muted mb-0">
                Phân tích dữ liệu kinh doanh và hiệu suất hoạt động
              </p>
            </div>
            <div className="d-flex gap-2">
              <Form.Control
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                style={{ width: '150px' }}
              />
              <span className="align-self-center">đến</span>
              <Form.Control
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                style={{ width: '150px' }}
              />
              <Button variant="primary" onClick={() => handleExport('PDF')}>
                <i className="fas fa-download me-2"></i>
                Xuất PDF
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <i className="fas fa-chart-line fa-2x text-success mb-2"></i>
              <h4 className="mb-1">2.45 tỷ</h4>
              <p className="text-muted mb-0">Doanh thu tháng này</p>
              <small className="text-success">
                <i className="fas fa-arrow-up"></i> +15% so với tháng trước
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <i className="fas fa-percentage fa-2x text-info mb-2"></i>
              <h4 className="mb-1">85%</h4>
              <p className="text-muted mb-0">Tỷ lệ thuê trung bình</p>
              <small className="text-success">
                <i className="fas fa-arrow-up"></i> +3% so với tháng trước
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <i className="fas fa-users fa-2x text-warning mb-2"></i>
              <h4 className="mb-1">45</h4>
              <p className="text-muted mb-0">Khách hàng hoạt động</p>
              <small className="text-success">
                <i className="fas fa-arrow-up"></i> +8% so với tháng trước
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-center">
            <Card.Body>
              <i className="fas fa-file-contract fa-2x text-primary mb-2"></i>
              <h4 className="mb-1">32</h4>
              <p className="text-muted mb-0">Hợp đồng hiệu lực</p>
              <small className="text-success">
                <i className="fas fa-arrow-up"></i> +5% so với tháng trước
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0">
          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Nav variant="tabs" className="border-0">
              <Nav.Item>
                <Nav.Link eventKey="revenue">
                  <i className="fas fa-chart-bar me-2"></i>
                  Doanh thu
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="occupancy">
                  <i className="fas fa-chart-line me-2"></i>
                  Tỷ lệ thuê
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="projects">
                  <i className="fas fa-chart-pie me-2"></i>
                  Dự án
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="customers">
                  <i className="fas fa-users me-2"></i>
                  Khách hàng
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Tab.Container>
        </Card.Header>

        <Card.Body>
          <Tab.Container activeKey={activeTab}>
            <Tab.Content>
              {/* Revenue Tab */}
              <Tab.Pane eventKey="revenue">
                <Row>
                  <Col lg={8}>
                    <h5 className="mb-3">Biểu đồ doanh thu 6 tháng</h5>
                    <div style={{ height: '400px' }}>
                      <Bar data={revenueData} options={chartOptions} />
                    </div>
                  </Col>
                  <Col lg={4}>
                    <h6 className="mb-3">Thống kê doanh thu</h6>
                    <div className="revenue-stats">
                      <div className="stat-item p-3 border rounded mb-3">
                        <div className="d-flex justify-content-between">
                          <span>Doanh thu cao nhất:</span>
                          <strong className="text-success">2.45 tỷ (T6)</strong>
                        </div>
                      </div>
                      <div className="stat-item p-3 border rounded mb-3">
                        <div className="d-flex justify-content-between">
                          <span>Doanh thu thấp nhất:</span>
                          <strong className="text-warning">1.2 tỷ (T1)</strong>
                        </div>
                      </div>
                      <div className="stat-item p-3 border rounded mb-3">
                        <div className="d-flex justify-content-between">
                          <span>Tăng trưởng trung bình:</span>
                          <strong className="text-info">+12%/tháng</strong>
                        </div>
                      </div>
                      <div className="stat-item p-3 border rounded">
                        <div className="d-flex justify-content-between">
                          <span>Dự báo T7:</span>
                          <strong className="text-primary">2.8 tỷ</strong>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Occupancy Tab */}
              <Tab.Pane eventKey="occupancy">
                <Row>
                  <Col lg={8}>
                    <h5 className="mb-3">Xu hướng tỷ lệ thuê</h5>
                    <div style={{ height: '400px' }}>
                      <Line data={occupancyTrendData} options={chartOptions} />
                    </div>
                  </Col>
                  <Col lg={4}>
                    <h6 className="mb-3">Phân tích tỷ lệ thuê</h6>
                    <Alert variant="success">
                      <i className="fas fa-check-circle me-2"></i>
                      <strong>Tốt:</strong> Tỷ lệ thuê đang tăng đều đặn
                    </Alert>
                    
                    <div className="occupancy-breakdown">
                      <h6>Theo dự án:</h6>
                      <div className="mb-2">
                        <div className="d-flex justify-content-between">
                          <span>Kho Bình Dương:</span>
                          <span className="fw-bold text-success">92%</span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                          <div className="progress-bar bg-success" style={{ width: '92%' }}></div>
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="d-flex justify-content-between">
                          <span>Kho Đồng Nai:</span>
                          <span className="fw-bold text-warning">75%</span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                          <div className="progress-bar bg-warning" style={{ width: '75%' }}></div>
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="d-flex justify-content-between">
                          <span>Kho TP.HCM:</span>
                          <span className="fw-bold text-info">88%</span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                          <div className="progress-bar bg-info" style={{ width: '88%' }}></div>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Projects Tab */}
              <Tab.Pane eventKey="projects">
                <Row>
                  <Col lg={6}>
                    <h5 className="mb-3">Trạng thái dự án</h5>
                    <div style={{ height: '300px' }}>
                      <Doughnut data={projectStatusData} options={doughnutOptions} />
                    </div>
                  </Col>
                  <Col lg={6}>
                    <h5 className="mb-3">Hiệu suất theo dự án</h5>
                    <div className="project-performance">
                      {[
                        { name: 'Kho Bình Dương', revenue: '1.8 tỷ', growth: '+15%', color: 'success' },
                        { name: 'Kho Đồng Nai', revenue: '0.6 tỷ', growth: '+8%', color: 'info' },
                        { name: 'Kho TP.HCM', revenue: '0.05 tỷ', growth: 'Mới', color: 'warning' }
                      ].map((project, index) => (
                        <div key={index} className="p-3 border rounded mb-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="mb-1">{project.name}</h6>
                              <div className="text-muted">Doanh thu: {project.revenue}</div>
                            </div>
                            <div className="text-end">
                              <span className={`badge bg-${project.color}`}>{project.growth}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Customers Tab */}
              <Tab.Pane eventKey="customers">
                <Row>
                  <Col lg={6}>
                    <h5 className="mb-3">Phân loại khách hàng</h5>
                    <div style={{ height: '300px' }}>
                      <Doughnut data={customerTypeData} options={doughnutOptions} />
                    </div>
                  </Col>
                  <Col lg={6}>
                    <h5 className="mb-3">Top khách hàng VIP</h5>
                    <div className="top-customers">
                      {[
                        { name: 'Công ty ABC Logistics', revenue: '450M', contracts: 3, rating: 'A' },
                        { name: 'Công ty DEF Trading', revenue: '320M', contracts: 2, rating: 'A' },
                        { name: 'Công ty GHI Express', revenue: '280M', contracts: 1, rating: 'B' },
                        { name: 'Công ty JKL Warehouse', revenue: '195M', contracts: 1, rating: 'B' }
                      ].map((customer, index) => (
                        <div key={index} className="d-flex justify-content-between align-items-center p-3 border rounded mb-2">
                          <div>
                            <div className="fw-bold">{customer.name}</div>
                            <small className="text-muted">{customer.contracts} hợp đồng</small>
                          </div>
                          <div className="text-end">
                            <div className="fw-bold text-success">{customer.revenue}</div>
                            <small className={`badge bg-${customer.rating === 'A' ? 'success' : 'primary'}`}>
                              {customer.rating}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Col>
                </Row>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Reports;