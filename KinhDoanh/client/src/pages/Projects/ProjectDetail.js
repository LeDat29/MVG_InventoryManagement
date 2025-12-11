/**
 * Project Detail Page - KHO MVG
 * Chi tiết dự án với Google Maps và quản lý zones
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Tab, Nav, Table, Modal, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ProjectMapView from '../../components/Map/ProjectMapView';
import TaskManager from '../../components/Tasks/TaskManager';

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  // const { showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [zones, setZones] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);

  // Mock project data
  const mockProject = {
    id: parseInt(id),
    name: 'Kho xưởng Bình Dương',
    code: 'KX-BD-001',
    description: 'Khu kho xưởng hiện đại với đầy đủ tiện ích và hạ tầng logistics.',
    address: '123 Đường ABC, Thuận An, Bình Dương',
    province: 'Bình Dương',
    district: 'Thuận An',
    ward: 'Phường An Thạnh',
    latitude: 10.9045,
    longitude: 106.7213,
    status: 'operational',
    total_area: 15000,
    used_area: 12000,
    available_area: 3000,
    fixed_area: 500,
    owner_info: {
      name: 'Công ty TNHH ABC',
      phone: '0123456789',
      email: 'contact@abc.com'
    },
    legal_documents: {
      business_license: 'GP-123456789',
      construction_permit: 'XD-987654321',
      fire_safety_cert: 'PCCC-111222333'
    },
    created_at: '2024-01-15',
    created_by_username: 'admin'
  };

  const mockZones = [
    {
      id: 1,
      zone_code: 'A1',
      zone_name: 'Khu vực A1',
      area: 500,
      status: 'rented',
      rental_price: 150000,
      tenant_info: {
        customer_code: 'KH001',
        company_name: 'Công ty XYZ',
        contact_person: 'Nguyễn Văn A',
        contract_number: 'HD240001',
        end_date: '2024-12-31'
      }
    },
    {
      id: 2,
      zone_code: 'A2',
      zone_name: 'Khu vực A2',
      area: 750,
      status: 'available',
      rental_price: 140000,
      tenant_info: null
    },
    {
      id: 3,
      zone_code: 'B1',
      zone_name: 'Khu vực B1',
      area: 600,
      status: 'deposited',
      rental_price: 160000,
      tenant_info: {
        customer_code: 'KH002',
        company_name: 'Công ty DEF',
        contact_person: 'Trần Thị B',
        contract_number: 'HD240002',
        end_date: '2024-06-30'
      }
    },
    {
      id: 4,
      zone_code: 'C1',
      zone_name: 'Khu vực C1 - Văn phòng',
      area: 200,
      status: 'maintenance',
      rental_price: 0,
      tenant_info: null
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setProject(mockProject);
      setZones(mockZones);
      setLoading(false);
    }, 1000);
  }, [id, mockProject, mockZones]);

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

  const getZoneStatusBadge = (status) => {
    const statusMap = {
      available: { variant: 'danger', label: 'Chưa cho thuê', color: '#dc3545' },
      rented: { variant: 'success', label: 'Đã cho thuê', color: '#28a745' },
      deposited: { variant: 'warning', label: 'Đã cọc', color: '#ffc107' },
      maintenance: { variant: 'secondary', label: 'Bảo trì', color: '#6c757d' }
    };
    
    const statusInfo = statusMap[status] || { variant: 'secondary', label: status, color: '#6c757d' };
    return (
      <Badge bg={statusInfo.variant} style={{ color: status === 'deposited' ? '#000' : '#fff' }}>
        {statusInfo.label}
      </Badge>
    );
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

  const handleZoneClick = (zone) => {
    setSelectedZone(zone);
    setShowZoneModal(true);
  };

  const calculateOccupancyStats = () => {
    const stats = {
      total: zones.length,
      available: zones.filter(z => z.status === 'available').length,
      rented: zones.filter(z => z.status === 'rented').length,
      deposited: zones.filter(z => z.status === 'deposited').length,
      maintenance: zones.filter(z => z.status === 'maintenance').length
    };
    
    const totalArea = zones.reduce((sum, zone) => sum + zone.area, 0);
    const rentedArea = zones.filter(z => z.status === 'rented').reduce((sum, zone) => sum + zone.area, 0);
    const occupancyRate = totalArea > 0 ? Math.round((rentedArea / totalArea) * 100) : 0;
    
    return { ...stats, occupancyRate, totalArea, rentedArea };
  };

  const stats = calculateOccupancyStats();

  if (loading) {
    return <LoadingSpinner text="Đang tải thông tin dự án..." />;
  }

  if (!project) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="text-center">
          <h4>Không tìm thấy dự án</h4>
          <p>Dự án với ID {id} không tồn tại hoặc đã bị xóa.</p>
          <Button variant="primary" onClick={() => navigate('/projects')}>
            Quay lại danh sách dự án
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="d-flex align-items-center mb-2">
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="me-3"
                  onClick={() => navigate('/projects')}
                >
                  <i className="fas fa-arrow-left"></i>
                </Button>
                <div>
                  <h2 className="mb-0">{project.name}</h2>
                  <div className="d-flex align-items-center mt-1">
                    <span className="text-muted me-3">Mã: {project.code}</span>
                    {getStatusBadge(project.status)}
                  </div>
                </div>
              </div>
              <p className="text-muted mb-0">{project.address}</p>
            </div>
            
            <div className="d-flex gap-2">
              {hasPermission('project_update') && (
                <Button variant="outline-primary">
                  <i className="fas fa-edit me-2"></i>
                  Chỉnh sửa
                </Button>
              )}
              <Button variant="outline-secondary">
                <i className="fas fa-download me-2"></i>
                Xuất báo cáo
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Tổng diện tích</h6>
                  <h4 className="mb-0 text-primary">{formatArea(project.total_area)}</h4>
                </div>
                <i className="fas fa-expand-arrows-alt fa-2x text-primary opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Tỷ lệ thuê</h6>
                  <h4 className="mb-0 text-success">{stats.occupancyRate}%</h4>
                </div>
                <i className="fas fa-percentage fa-2x text-success opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Số kho</h6>
                  <h4 className="mb-0 text-info">{stats.total}</h4>
                  <small className="text-muted">{stats.rented} đã thuê</small>
                </div>
                <i className="fas fa-th-large fa-2x text-info opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Doanh thu/tháng</h6>
                  <h4 className="mb-0 text-warning">
                    {formatCurrency(zones.filter(z => z.status === 'rented').reduce((sum, z) => sum + (z.rental_price * z.area), 0))}
                  </h4>
                </div>
                <i className="fas fa-chart-line fa-2x text-warning opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0">
          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Nav variant="tabs" className="border-0">
              <Nav.Item>
                <Nav.Link eventKey="overview">
                  <i className="fas fa-info-circle me-2"></i>
                  Thông tin chung
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="zones">
                  <i className="fas fa-th-large me-2"></i>
                  Quản lý kho ({zones.length})
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="map">
                  <i className="fas fa-map me-2"></i>
                  Bản đồ
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="tasks">
                  <i className="fas fa-tasks me-2"></i>
                  Công việc
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="documents">
                  <i className="fas fa-folder me-2"></i>
                  Hồ sơ pháp lý
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Tab.Container>
        </Card.Header>

        <Card.Body>
          <Tab.Container activeKey={activeTab}>
            <Tab.Content>
              {/* Overview Tab */}
              <Tab.Pane eventKey="overview">
                <Row>
                  <Col md={6}>
                    <h5 className="mb-3">Thông tin dự án</h5>
                    <div className="info-group">
                      <div className="info-item">
                        <strong>Tên dự án:</strong> {project.name}
                      </div>
                      <div className="info-item">
                        <strong>Mã dự án:</strong> {project.code}
                      </div>
                      <div className="info-item">
                        <strong>Mô tả:</strong> {project.description}
                      </div>
                      <div className="info-item">
                        <strong>Địa chỉ:</strong> {project.address}
                      </div>
                      <div className="info-item">
                        <strong>Tỉnh/Thành:</strong> {project.province}
                      </div>
                      <div className="info-item">
                        <strong>Trạng thái:</strong> {getStatusBadge(project.status)}
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <h5 className="mb-3">Thông tin chủ sở hữu</h5>
                    <div className="info-group">
                      <div className="info-item">
                        <strong>Tên:</strong> {project.owner_info?.name}
                      </div>
                      <div className="info-item">
                        <strong>Điện thoại:</strong> {project.owner_info?.phone}
                      </div>
                      <div className="info-item">
                        <strong>Email:</strong> {project.owner_info?.email}
                      </div>
                    </div>

                    <h5 className="mb-3 mt-4">Thống kê diện tích</h5>
                    <div className="info-group">
                      <div className="info-item">
                        <strong>Tổng diện tích:</strong> {formatArea(project.total_area)}
                      </div>
                      <div className="info-item">
                        <strong>Đã sử dụng:</strong> {formatArea(project.used_area)}
                      </div>
                      <div className="info-item">
                        <strong>Còn trống:</strong> {formatArea(project.available_area)}
                      </div>
                      <div className="info-item">
                        <strong>Cố định:</strong> {formatArea(project.fixed_area)}
                      </div>
                    </div>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Zones Tab */}
              <Tab.Pane eventKey="zones">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Danh sách kho</h5>
                  <div className="d-flex gap-2">
                    <Button variant="outline-success" size="sm">
                      <i className="fas fa-file-import me-2"></i>
                      Import bản vẽ
                    </Button>
                    <Button variant="primary" size="sm">
                      <i className="fas fa-plus me-2"></i>
                      Thêm kho
                    </Button>
                  </div>
                </div>

                {/* Zone Status Legend */}
                <div className="mb-3">
                  <div className="d-flex gap-3 flex-wrap">
                    <div className="d-flex align-items-center">
                      <div className="me-2" style={{ width: '16px', height: '16px', backgroundColor: '#dc3545', borderRadius: '2px' }}></div>
                      <span className="small">Chưa cho thuê ({stats.available})</span>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="me-2" style={{ width: '16px', height: '16px', backgroundColor: '#28a745', borderRadius: '2px' }}></div>
                      <span className="small">Đã cho thuê ({stats.rented})</span>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="me-2" style={{ width: '16px', height: '16px', backgroundColor: '#ffc107', borderRadius: '2px' }}></div>
                      <span className="small">Đã cọc ({stats.deposited})</span>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="me-2" style={{ width: '16px', height: '16px', backgroundColor: '#6c757d', borderRadius: '2px' }}></div>
                      <span className="small">Bảo trì ({stats.maintenance})</span>
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
                  <Table hover>
                    <thead className="bg-light">
                      <tr>
                        <th>Mã kho</th>
                        <th>Diện tích</th>
                        <th>Trạng thái</th>
                        <th>Giá thuê</th>
                        <th>Khách thuê</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zones.map((zone) => (
                        <tr 
                          key={zone.id} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleZoneClick(zone)}
                        >
                          <td>
                            <div>
                              <div className="fw-bold">{zone.zone_code}</div>
                              <small className="text-muted">{zone.zone_name}</small>
                            </div>
                          </td>
                          <td>{formatArea(zone.area)}</td>
                          <td>{getZoneStatusBadge(zone.status)}</td>
                          <td>
                            {zone.rental_price > 0 ? 
                              formatCurrency(zone.rental_price) + '/m²/tháng' : 
                              '-'
                            }
                          </td>
                          <td>
                            {zone.tenant_info ? (
                              <div>
                                <div className="fw-medium">{zone.tenant_info.company_name}</div>
                                <small className="text-muted">{zone.tenant_info.contact_person}</small>
                              </div>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleZoneClick(zone);
                              }}
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Tab.Pane>

              {/* Map Tab */}
              <Tab.Pane eventKey="map">
                <ProjectMapView
                  project={project}
                  zones={zones}
                  onZoneClick={(zone) => {
                    setSelectedZone(zone);
                    setShowZoneModal(true);
                  }}
                  showLegend={true}
                />
              </Tab.Pane>

              {/* Tasks Tab */}
              <Tab.Pane eventKey="tasks">
                <TaskManager projectId={id} projectName={project?.name} />
              </Tab.Pane>

              {/* Documents Tab */}
              <Tab.Pane eventKey="documents">
                <h5 className="mb-3">Hồ sơ pháp lý</h5>
                <Row>
                  <Col md={6}>
                    <div className="info-group">
                      <div className="info-item">
                        <strong>Giấy phép kinh doanh:</strong> {project.legal_documents?.business_license || 'Chưa có'}
                      </div>
                      <div className="info-item">
                        <strong>Giấy phép xây dựng:</strong> {project.legal_documents?.construction_permit || 'Chưa có'}
                      </div>
                      <div className="info-item">
                        <strong>Chứng nhận PCCC:</strong> {project.legal_documents?.fire_safety_cert || 'Chưa có'}
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="text-center py-4">
                      <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
                      <p className="text-muted">
                        Hệ thống quản lý tài liệu sẽ được tích hợp ở đây
                      </p>
                      <Button variant="outline-primary">
                        <i className="fas fa-upload me-2"></i>
                        Upload tài liệu
                      </Button>
                    </div>
                  </Col>
                </Row>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>

      {/* Zone Detail Modal */}
      <Modal show={showZoneModal} onHide={() => setShowZoneModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Chi tiết Kho {selectedZone?.zone_code}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedZone && (
            <Row>
              <Col md={6}>
                <h6>Thông tin kho</h6>
                <div className="info-group">
                  <div className="info-item">
                    <strong>Mã kho:</strong> {selectedZone.zone_code}
                  </div>
                  <div className="info-item">
                    <strong>Tên:</strong> {selectedZone.zone_name}
                  </div>
                  <div className="info-item">
                    <strong>Diện tích:</strong> {formatArea(selectedZone.area)}
                  </div>
                  <div className="info-item">
                    <strong>Trạng thái:</strong> {getZoneStatusBadge(selectedZone.status)}
                  </div>
                  <div className="info-item">
                    <strong>Giá thuê:</strong> {selectedZone.rental_price > 0 ? formatCurrency(selectedZone.rental_price) + '/m²/tháng' : '-'}
                  </div>
                </div>
              </Col>
              <Col md={6}>
                <h6>Thông tin khách thuê</h6>
                {selectedZone.tenant_info ? (
                  <div className="info-group">
                    <div className="info-item">
                      <strong>Công ty:</strong> {selectedZone.tenant_info.company_name}
                    </div>
                    <div className="info-item">
                      <strong>Người liên hệ:</strong> {selectedZone.tenant_info.contact_person}
                    </div>
                    <div className="info-item">
                      <strong>Số hợp đồng:</strong> {selectedZone.tenant_info.contract_number}
                    </div>
                    <div className="info-item">
                      <strong>Ngày hết hạn:</strong> {new Date(selectedZone.tenant_info.end_date).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted">Chưa có khách thuê</p>
                )}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowZoneModal(false)}>
            Đóng
          </Button>
          {hasPermission('zone_update') && (
            <Button variant="primary">
              Chỉnh sửa kho
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .info-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .info-item {
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .info-item strong {
          color: #495057;
          display: inline-block;
          min-width: 120px;
        }
      `}</style>
    </div>
  );
}

export default ProjectDetail;