/**
 * Dashboard Page - KHO MVG
 * Trang chủ với thống kê tổng quan
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler);

function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    overview: {
      totalProjects: 0,
      totalCustomers: 0,
      activeContracts: 0,
      totalRevenue: 0
    },
    projectStatus: {
      operational: 0,
      construction: 0,
      planning: 0,
      maintenance: 0
    },
    warehouseOccupancy: {
      available: 0,
      rented: 0,
      deposited: 0,
      maintenance: 0
    },
    recentActivities: [],
    expiringContracts: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const [projectsResp, customersResp] = await Promise.all([
          fetch('/api/projects', { headers }).then(r => r.json()).catch(() => ({ success: true, data: { projects: [] } })),
          fetch('/api/customers', { headers }).then(r => r.json()).catch(() => ({ success: true, data: { customers: [] } }))
        ]);

        const projects = projectsResp.data?.projects || [];
        const customers = customersResp.data?.customers || [];

        setDashboardData({
          overview: {
            totalProjects: projects.length,
            totalCustomers: customers.length,
            activeContracts: 0,
            totalRevenue: 0
          },
          projectStatus: {
            operational: projects.filter(p => p.status === 'operational').length,
            construction: projects.filter(p => p.status === 'construction').length,
            planning: projects.filter(p => p.status === 'planning').length,
            maintenance: projects.filter(p => p.status === 'maintenance').length
          },
          warehouseOccupancy: {
            available: 0,
            rented: 0,
            deposited: 0,
            maintenance: 0
          },
          recentActivities: [],
          expiringContracts: []
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const occupancyChartData = {
    labels: ['Chưa cho thuê', 'Đã cho thuê', 'Đã cọc', 'Bảo trì'],
    datasets: [
      {
        data: [
          dashboardData.warehouseOccupancy.available,
          dashboardData.warehouseOccupancy.rented,
          dashboardData.warehouseOccupancy.deposited,
          dashboardData.warehouseOccupancy.maintenance
        ],
        backgroundColor: ['#dc3545', '#28a745', '#ffc107', '#6c757d'],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  const revenueChartData = {
    labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    datasets: [
      {
        label: 'Doanh thu (tỷ VNĐ)',
        data: [0, 0, 0, 0, 0, 0],
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Đang tải dashboard..." />;
  }

  return (
    <div className="dashboard-page">
      <Container fluid className="p-4">
        {/* Welcome Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2 className="mb-1">Chào mừng trở lại, {user?.full_name}!</h2>
                <p className="text-muted mb-0">
                  Hôm nay là {new Date().toLocaleDateString('vi-VN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <Badge bg="primary" className="px-3 py-2">
                <i className="fas fa-user-crown me-2"></i>
                {user?.role?.toUpperCase()}
              </Badge>
            </div>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col md={3} sm={6} className="mb-3">
            <Card className="stat-card border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-1">Tổng dự án</h6>
                    <h3 className="mb-0 text-primary fw-bold">{dashboardData.overview.totalProjects}</h3>
                  </div>
                  <div className="stat-icon bg-primary">
                    <i className="fas fa-building text-white"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3} sm={6} className="mb-3">
            <Card className="stat-card border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-1">Khách hàng</h6>
                    <h3 className="mb-0 text-success fw-bold">{dashboardData.overview.totalCustomers}</h3>
                  </div>
                  <div className="stat-icon bg-success">
                    <i className="fas fa-users text-white"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3} sm={6} className="mb-3">
            <Card className="stat-card border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-1">Hợp đồng hiệu lực</h6>
                    <h3 className="mb-0 text-warning fw-bold">{dashboardData.overview.activeContracts}</h3>
                  </div>
                  <div className="stat-icon bg-warning">
                    <i className="fas fa-file-contract text-white"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3} sm={6} className="mb-3">
            <Card className="stat-card border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-1">Doanh thu tháng</h6>
                    <h3 className="mb-0 text-info fw-bold">
                      {formatCurrency(dashboardData.overview.totalRevenue).replace('₫', 'đ')}
                    </h3>
                  </div>
                  <div className="stat-icon bg-info">
                    <i className="fas fa-chart-line text-white"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col lg={8} className="mb-4">
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white border-0">
                <h5 className="mb-0">
                  <i className="fas fa-chart-line me-2 text-primary"></i>
                  Biểu đồ doanh thu 6 tháng gần nhất
                </h5>
              </Card.Header>
              <Card.Body>
                <Line 
                  data={revenueChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
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
                  }}
                  height={300}
                />
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4} className="mb-4">
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white border-0">
                <h5 className="mb-0">
                  <i className="fas fa-warehouse me-2 text-primary"></i>
                  Tình trạng kho
                </h5>
              </Card.Header>
              <Card.Body>
                <Doughnut 
                  data={occupancyChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          boxWidth: 12,
                          padding: 15
                        }
                      }
                    }
                  }}
                  height={250}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col lg={8} className="mb-4">
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-0">
                <h5 className="mb-0">
                  <i className="fas fa-history me-2 text-primary"></i>
                  Hoạt động gần đây
                </h5>
              </Card.Header>
              <Card.Body>
                {dashboardData.recentActivities.map((activity) => (
                  <div key={activity.id} className="d-flex align-items-start mb-3 pb-3 border-bottom">
                    <div className={`activity-icon me-3 ${
                      activity.type === 'contract_signed' ? 'bg-success' :
                      activity.type === 'payment_received' ? 'bg-primary' : 'bg-info'
                    }`}>
                      <i className={`fas ${
                        activity.type === 'contract_signed' ? 'fa-file-signature' :
                        activity.type === 'payment_received' ? 'fa-dollar-sign' : 'fa-plus'
                      } text-white`}></i>
                    </div>
                    <div className="flex-grow-1">
                      <p className="mb-1">{activity.message}</p>
                      <small className="text-muted">
                        {activity.time} • Bởi {activity.user}
                      </small>
                    </div>
                  </div>
                ))}
                <div className="text-center">
                  <Button variant="outline-primary" size="sm">
                    Xem tất cả hoạt động
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4} className="mb-4">
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-0">
                <h5 className="mb-0">
                  <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
                  Hợp đồng sắp hết hạn
                </h5>
              </Card.Header>
              <Card.Body>
                {dashboardData.expiringContracts.length > 0 ? (
                  <>
                    {dashboardData.expiringContracts.map((contract) => (
                      <Alert key={contract.id} variant="warning" className="py-2 px-3 mb-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{contract.contractNumber}</strong>
                            <br />
                            <small>{contract.customer}</small>
                          </div>
                          <Badge bg="warning" text="dark">
                            {contract.daysLeft} ngày
                          </Badge>
                        </div>
                      </Alert>
                    ))}
                    <div className="text-center mt-3">
                      <Button variant="outline-warning" size="sm">
                        Xem tất cả
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-muted text-center">
                    Không có hợp đồng nào sắp hết hạn
                  </p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <style>{`
        .stat-card {
          transition: transform 0.2s;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .activity-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
        }

        .dashboard-page {
          background-color: #f8f9fa;
          min-height: 100vh;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;