/**
 * Projects Page - KHO MVG
 * Danh sách và quản lý dự án
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Form, Modal, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

function Projects() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    province: ''
  });
  
  // Mock data - trong thực tế sẽ fetch từ API
  const mockProjects = [
    {
      id: 1,
      name: 'Kho xưởng Bình Dương',
      code: 'KX-BD-001',
      address: '123 Đường ABC, Thuận An, Bình Dương',
      province: 'Bình Dương',
      status: 'operational',
      total_area: 15000,
      used_area: 12000,
      available_area: 3000,
      zone_count: 25,
      rented_zones: 20,
      revenue: 2500000000,
      created_at: '2024-01-15'
    },
    {
      id: 2,
      name: 'Trung tâm logistics Đồng Nai',
      code: 'KX-DN-002',
      address: '456 Đường XYZ, Biên Hòa, Đồng Nai',
      province: 'Đồng Nai',
      status: 'construction',
      total_area: 20000,
      used_area: 0,
      available_area: 20000,
      zone_count: 30,
      rented_zones: 0,
      revenue: 0,
      created_at: '2024-02-01'
    },
    {
      id: 3,
      name: 'Kho Tân Phú',
      code: 'KX-TP-003',
      address: '789 Đường DEF, Tân Phú, TP.HCM',
      province: 'TP.HCM',
      status: 'planning',
      total_area: 8000,
      used_area: 0,
      available_area: 8000,
      zone_count: 15,
      rented_zones: 0,
      revenue: 0,
      created_at: '2024-02-10'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setProjects(mockProjects);
      setFilteredProjects(mockProjects);
      setLoading(false);
    }, 1000);
  }, [mockProjects]);

  // Filter projects based on search and filters
  useEffect(() => {
    let filtered = projects;

    if (filters.search) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        project.code.toLowerCase().includes(filters.search.toLowerCase()) ||
        project.address.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(project => project.status === filters.status);
    }

    if (filters.province) {
      filtered = filtered.filter(project => project.province === filters.province);
    }

    setFilteredProjects(filtered);
  }, [filters, projects]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      operational: { variant: 'success', label: 'Hoạt động' },
      construction: { variant: 'warning', label: 'Xây dựng' },
      planning: { variant: 'info', label: 'Lên kế hoạch' },
      maintenance: { variant: 'secondary', label: 'Bảo trì' }
    };
    
    const statusInfo = statusMap[status] || { variant: 'secondary', label: status };
    return <Badge bg={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const calculateOccupancyRate = (project) => {
    if (project.zone_count === 0) return 0;
    return Math.round((project.rented_zones / project.zone_count) * 100);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount).replace('₫', 'đ');
  };

  const formatArea = (area) => {
    return new Intl.NumberFormat('vi-VN').format(area) + ' m²';
  };

  const handleViewProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleCreateProject = () => {
    if (!hasPermission('project_create')) {
      showError('Bạn không có quyền tạo dự án mới');
      return;
    }
    setShowCreateModal(true);
  };

  const provinces = [...new Set(projects.map(p => p.province))];

  if (loading) {
    return <LoadingSpinner text="Đang tải danh sách dự án..." />;
  }

  return (
    <Container fluid className="p-4">
      {/* Page Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Quản lý Dự án</h2>
              <p className="text-muted mb-0">
                Quản lý thông tin các dự án kho xưởng
              </p>
            </div>
            {hasPermission('project_create') && (
              <Button variant="primary" onClick={handleCreateProject}>
                <i className="fas fa-plus me-2"></i>
                Tạo dự án mới
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Tổng dự án</h6>
                  <h4 className="mb-0 text-primary">{projects.length}</h4>
                </div>
                <i className="fas fa-building fa-2x text-primary opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Đang hoạt động</h6>
                  <h4 className="mb-0 text-success">
                    {projects.filter(p => p.status === 'operational').length}
                  </h4>
                </div>
                <i className="fas fa-check-circle fa-2x text-success opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Tổng diện tích</h6>
                  <h4 className="mb-0 text-info">
                    {formatArea(projects.reduce((sum, p) => sum + p.total_area, 0))}
                  </h4>
                </div>
                <i className="fas fa-expand-arrows-alt fa-2x text-info opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Doanh thu tháng</h6>
                  <h4 className="mb-0 text-warning">
                    {formatCurrency(projects.reduce((sum, p) => sum + p.revenue, 0))}
                  </h4>
                </div>
                <i className="fas fa-chart-line fa-2x text-warning opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Tìm kiếm</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Tìm theo tên, mã, địa chỉ..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Trạng thái</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="operational">Hoạt động</option>
                  <option value="construction">Xây dựng</option>
                  <option value="planning">Lên kế hoạch</option>
                  <option value="maintenance">Bảo trì</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Tỉnh/Thành phố</Form.Label>
                <Form.Select
                  value={filters.province}
                  onChange={(e) => handleFilterChange('province', e.target.value)}
                >
                  <option value="">Tất cả tỉnh thành</option>
                  {provinces.map(province => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Projects Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0">
          <h5 className="mb-0">
            <i className="fas fa-list me-2"></i>
            Danh sách dự án ({filteredProjects.length})
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Dự án</th>
                  <th>Địa chỉ</th>
                  <th>Trạng thái</th>
                  <th>Diện tích</th>
                  <th>Tỷ lệ thuê</th>
                  <th>Doanh thu/tháng</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <div>
                          <div className="fw-bold">{project.name}</div>
                          <small className="text-muted">{project.code}</small>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div>{project.address}</div>
                          <small className="text-muted">{project.province}</small>
                        </div>
                      </td>
                      <td>{getStatusBadge(project.status)}</td>
                      <td>
                        <div>
                          <div>{formatArea(project.total_area)}</div>
                          <small className="text-muted">
                            Còn trống: {formatArea(project.available_area)}
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="progress me-2" style={{ width: '60px', height: '8px' }}>
                            <div 
                              className="progress-bar bg-success" 
                              style={{ width: `${calculateOccupancyRate(project)}%` }}
                            ></div>
                          </div>
                          <span className="small">
                            {calculateOccupancyRate(project)}%
                          </span>
                        </div>
                        <small className="text-muted">
                          {project.rented_zones}/{project.zone_count} zones
                        </small>
                      </td>
                      <td>
                        <div className="fw-bold text-success">
                          {formatCurrency(project.revenue)}
                        </div>
                      </td>
                      <td>
                        <div className="btn-group">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleViewProject(project.id)}
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          {hasPermission('project_update') && (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => navigate(`/projects/${project.id}/edit`)}
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      <div className="text-muted">
                        <i className="fas fa-search fa-2x mb-3"></i>
                        <p>Không tìm thấy dự án nào phù hợp với bộ lọc</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Create Project Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Tạo dự án mới</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <i className="fas fa-info-circle me-2"></i>
            Form tạo dự án sẽ được phát triển ở phiên bản tiếp theo
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Đóng
          </Button>
          <Button variant="primary">
            Tạo dự án
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Projects;