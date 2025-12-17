/**
 * Project Detail Page - KHO MVG
 * Chi tiết dự án với Google Maps và quản lý zones
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Tab, Nav, Table, Modal, Alert, Form } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import axios from 'axios';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ProjectMapView from '../../components/Map/ProjectMapView';
import TaskManager from '../../components/Tasks/TaskManager';
import './ProjectDetail.css';

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [zones, setZones] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [isDocumentServiceAvailable, setIsDocumentServiceAvailable] = useState(true);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  useEffect(() => {
    let scrollTimeout;
    const scrollThreshold = 500; // Tăng ngưỡng cuộn để ổn định hơn (trước là 100)
    const debounceDelay = 50; // Giảm độ trễ debounce để phản ứng nhanh hơn một chút

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (window.scrollY > scrollThreshold) {
          setIsHeaderCollapsed(true);
        } else {
          setIsHeaderCollapsed(false);
        }
      }, debounceDelay);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Load project & zones from API (no mock data)
  useEffect(() => {
    let isMounted = true;
    const fetchProject = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const resp = await axios.get(`/api/projects/${id}`, { headers });
        if (resp.data?.success) {
          if (!isMounted) return;
          setProject(resp.data.data.project);
          setZones(resp.data.data.zones || []);
        } else {
          throw new Error(resp.data?.message || 'Không tải được dự án');
        }
      } catch (err) {
        console.error('Không tải được dự án', err);
        showNotification('Không tải được dự án, vui lòng thử lại.', 'danger');
        if (isMounted) {
          setProject(null);
          setZones([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProject();
    return () => { isMounted = false; };
  }, [id, showNotification]);

  useEffect(() => {
    // Fetch uploaded documents for this project
    const fetchDocuments = async () => {
      try {
        const resp = await axios.get('/api/documents', { params: { resource_type: 'project', resource_id: id } });
        if (resp.data && resp.data.success) {
          const files = resp.data.data.files.map(f => ({
            id: f._id || f.id,
            name: f.originalname || f.name || f.filename,
            filename: f.filename,
            size: f.size,
            mimetype: f.mimetype,
            uploadedAt: f.uploaded_at || f.uploadedAt,
            category_id: f.category_id,
            resource_type: f.resource_type,
            resource_id: f.resource_id
          }));
          setUploadedDocuments(files);
        }
      } catch (err) {
        console.error('Error fetching documents', err);
        setIsDocumentServiceAvailable(false);
        showNotification(
          'Không tải được danh sách tài liệu. Vui lòng thử lại sau.',
          'warning'
        );
      }
    };

    fetchDocuments();
  }, [id, showNotification]);

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

  const handleAddZone = (newZone) => {
    setZones([...zones, newZone]);
    setShowAddZoneModal(false);
  };

  const handleEditZone = (updatedZone) => {
    setZones(zones.map(z => z.id === updatedZone.id ? updatedZone : z));
    setShowZoneModal(false);
  };

  const handleDeleteZone = (zoneId) => {
    if (window.confirm('Bạn có chắc muốn xóa kho này?')) {
      setZones(zones.filter(z => z.id !== zoneId));
    }
  };

  const handleDocumentUpload = async (e) => {
    if (!isDocumentServiceAvailable) {
      showNotification('Dịch vụ tài liệu không khả dụng. Vui lòng thử lại sau.', 'warning');
      return;
    }
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('resource_type', 'project');
    formData.append('resource_id', id);

    try {
      const resp = await axios.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (resp.data && resp.data.success) {
        // The server returns list of uploaded files metadata
        const uploaded = resp.data.data.files.map(f => ({
          id: f.id || f._id,
          name: f.originalname || f.filename,
          filename: f.filename,
          size: f.size,
          mimetype: f.mimetype,
          uploadedAt: new Date().toISOString(),
          resource_type: 'project',
          resource_id: id
        }));

        setUploadedDocuments(prevDocs => [...uploaded, ...prevDocs]);
        showNotification(`Đã tải lên ${uploaded.length} tài liệu.`, 'success');
      }
    } catch (error) {
      console.error('Upload failed', error);
      showNotification('Tải lên thất bại. Vui lòng thử lại.', 'danger');
    } finally {
      e.target.value = '';
    }
  };

  const handleViewDocument = (doc) => {
    try {
      if (doc.filename) {
        const url = `/uploads/documents/${doc.filename}`;
        window.open(url, '_blank');
        showNotification(`Đang mở tài liệu: ${doc.name}`, 'info');
        return;
      }

      if (doc.url) {
        window.open(doc.url, '_blank');
        showNotification(`Đang mở tài liệu: ${doc.name}`, 'info');
        return;
      }

      showNotification('Không có đường dẫn để mở tài liệu.', 'warning');
    } catch (err) {
      showNotification('Không thể mở tài liệu.', 'danger');
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      if (doc.id) {
        const resp = await axios.get(`/api/documents/download/${doc.id}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([resp.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showNotification(`Đang tải xuống tài liệu: ${doc.name}`, 'info');
        return;
      }

      if (doc.url) {
        const a = document.createElement('a');
        a.href = doc.url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showNotification(`Đang tải xuống tài liệu: ${doc.name}`, 'info');
        return;
      }

      showNotification('Tập tin không tồn tại để tải xuống.', 'warning');
    } catch (err) {
      console.error('Error downloading', err);
      showNotification('Tải xuống thất bại.', 'danger');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài liệu này?')) return;
    try {
      const resp = await axios.delete(`/api/documents/${docId}`);
      if (resp.data && resp.data.success) {
        setUploadedDocuments(prev => prev.filter(d => d.id !== docId));
        showNotification('Đã xóa tài liệu.', 'success');
      }
    } catch (err) {
      console.error('Delete failed', err);
      showNotification('Xóa tài liệu thất bại.', 'danger');
    }
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
    <div className="project-detail-page p-4">
      <div className={`sticky-top-container ${isHeaderCollapsed ? 'collapsed' : ''}`}>
        {/* Header */}
        <div className={`project-header mb-4 ${isHeaderCollapsed ? 'collapsed' : ''}`}>
          <Row>
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
                    <Button 
                      variant="outline-primary"
                      onClick={() => navigate(`/projects/${id}/edit`)}
                    >
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
        </div>

        {/* Statistics Cards - Responsive Layout */}
        <div className={`statistics-container mb-4 ${isHeaderCollapsed ? 'collapsed' : ''}`}>
        <Row className="g-3">
          <Col lg={3} md={6} sm={12}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <h6 className="text-muted mb-3">Tổng Diện Tích</h6>
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-end mb-2">
                    <span className="fw-bold text-primary">{formatArea(project.total_area)}</span>
                    <i className="fas fa-expand-arrows-alt fa-lg text-primary opacity-25"></i>
                  </div>
                </div>
                <div className="small">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-success">Đã cho thuê:</span>
                    <span className="fw-bold text-success">{formatArea(zones.filter(z => z.status === 'rented').reduce((sum, z) => sum + z.area, 0))}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-warning">Đã cọc:</span>
                    <span className="fw-bold text-warning">{formatArea(zones.filter(z => z.status === 'deposited').reduce((sum, z) => sum + z.area, 0))}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-danger">Còn trống:</span>
                    <span className="fw-bold text-danger">{formatArea(zones.filter(z => z.status === 'available').reduce((sum, z) => sum + z.area, 0))}</span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={3} md={6} sm={12}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <h6 className="text-muted mb-3">Tỷ Lệ Thuê</h6>
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-end mb-2">
                    <span className="fw-bold text-success">{stats.occupancyRate}%</span>
                    <i className="fas fa-percentage fa-lg text-success opacity-25"></i>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div className="progress-bar bg-success" style={{ width: `${stats.occupancyRate}%` }}></div>
                  </div>
                </div>
                <div className="small">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Đã thuê:</span>
                    <span className="fw-bold">{stats.rented} kho</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Đã cọc:</span>
                    <span className="fw-bold">{stats.deposited} kho</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Còn trống:</span>
                    <span className="fw-bold">{stats.available} kho</span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={3} md={6} sm={12}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <h6 className="text-muted mb-3">Số Kho</h6>
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-end mb-2">
                    <span className="fw-bold text-info">{stats.total}</span>
                    <i className="fas fa-th-large fa-lg text-info opacity-25"></i>
                  </div>
                </div>
                <div className="small">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-success">Đã thuê:</span>
                    <span className="fw-bold text-success">{stats.rented}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-warning">Đã cọc:</span>
                    <span className="fw-bold text-warning">{stats.deposited}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-danger">Còn trống:</span>
                    <span className="fw-bold text-danger">{stats.available}</span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={3} md={6} sm={12}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <h6 className="text-muted mb-3">Doanh Thu/Tháng</h6>
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-end mb-2">
                    <span className="fw-bold text-warning">
                      {formatCurrency(zones.filter(z => z.status === 'rented').reduce((sum, z) => sum + (z.rental_price * z.area), 0))}
                    </span>
                    <i className="fas fa-chart-line fa-lg text-warning opacity-25"></i>
                  </div>
                </div>
                <div className="small">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Từ cho thuê:</span>
                    <span className="fw-bold">
                      {formatCurrency(zones.filter(z => z.status === 'rented').reduce((sum, z) => sum + (z.rental_price * z.area), 0))}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Tiềm năng:</span>
                    <span className="fw-bold">
                      {formatCurrency(zones.filter(z => z.status === 'available').reduce((sum, z) => sum + (z.rental_price * z.area), 0))}
                    </span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="border-bottom-0">
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
              <Nav.Item>
                <Nav.Link eventKey="team">
                  <i className="fas fa-users me-2"></i>
                  Đội dự án
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

                    <h5 className="mb-3 mt-4">Giám đốc dự án</h5>
                    <div className="info-group">
                      <div className="info-item">
                        <strong>Tên:</strong> {project.project_director?.name}
                      </div>
                      <div className="info-item">
                        <strong>Chức vụ:</strong> {project.project_director?.position}
                      </div>
                      <div className="info-item">
                        <strong>Điện thoại:</strong> {project.project_director?.phone}
                      </div>
                      <div className="info-item">
                        <strong>Email:</strong> {project.project_director?.email}
                      </div>
                    </div>

                    <h5 className="mb-3 mt-4">Người quản lý dự án</h5>
                    <div className="info-group">
                      <div className="info-item">
                        <strong>Tên:</strong> {project.project_manager?.name}
                      </div>
                      <div className="info-item">
                        <strong>Chức vụ:</strong> {project.project_manager?.position}
                      </div>
                      <div className="info-item">
                        <strong>Điện thoại:</strong> {project.project_manager?.phone}
                      </div>
                      <div className="info-item">
                        <strong>Email:</strong> {project.project_manager?.email}
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
                    <Button 
                      variant="outline-success" 
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.dxf,.pdf,.dwg,.png,.jpg,.jpeg';
                        input.onchange = (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            alert(`Đã import bản vẽ: ${file.name}`);
                          }
                        };
                        input.click();
                      }}
                    >
                      <i className="fas fa-file-import me-2"></i>
                      Import bản vẽ
                    </Button>
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => setShowAddZoneModal(true)}
                    >
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
                <Row className="mb-4">
                  <Col md={6}>
                    <Card className="border-0 bg-light">
                      <Card.Body>
                        <div className="mb-2">
                          <small className="text-muted">Giấy phép kinh doanh</small>
                          <div className="fw-bold">{project.legal_documents?.business_license || 'Chưa có'}</div>
                        </div>
                        <div className="mb-2">
                          <small className="text-muted">Giấy phép xây dựng</small>
                          <div className="fw-bold">{project.legal_documents?.construction_permit || 'Chưa có'}</div>
                        </div>
                        <div>
                          <small className="text-muted">Chứng nhận PCCC</small>
                          <div className="fw-bold">{project.legal_documents?.fire_safety_cert || 'Chưa có'}</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <h5 className="mb-3">Tài liệu dự án</h5>
                
                {!isDocumentServiceAvailable ? (
                  <Alert variant="warning">
                    <Alert.Heading><i className="fas fa-exclamation-triangle me-2"></i>Dịch vụ tài liệu không khả dụng</Alert.Heading>
                    <p>
                      Không thể kết nối đến dịch vụ tài liệu. Chức năng upload và xem file sẽ bị vô hiệu hóa. 
                      Vui lòng kiểm tra lại kết nối hoặc liên hệ quản trị viên.
                    </p>
                  </Alert>
                ) : (
                  <>
                    <div className="mb-3">
                      <Button 
                        variant="outline-primary" 
                        onClick={() => setShowDocumentModal(true)}
                      >
                        <i className="fas fa-upload me-2"></i>
                        Upload tài liệu
                      </Button>
                    </div>

                    {uploadedDocuments.length > 0 ? (
                      <div className="table-responsive">
                        <Table hover className="border">
                          <thead className="bg-light">
                            <tr>
                              <th>Tên tài liệu</th>
                              <th>Dung lượng</th>
                              <th>Ngày upload</th>
                              <th style={{ width: '120px' }}>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {uploadedDocuments.map(doc => (
                              <tr key={doc.id}>
                                <td>
                                  <i className="fas fa-file me-2 text-primary"></i>
                                  {doc.name}
                                </td>
                                <td>{(doc.size / 1024).toFixed(2)} KB</td>
                                <td>{new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}</td>
                                <td>
                                  <div className="d-flex gap-2">
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      title="Xem"
                                      onClick={() => handleViewDocument(doc)}
                                    >
                                      <i className="fas fa-eye"></i>
                                    </Button>
                                    <Button
                                      variant="outline-success"
                                      size="sm"
                                      title="Tải xuống"
                                      onClick={() => handleDownloadDocument(doc)}
                                    >
                                      <i className="fas fa-download"></i>
                                    </Button>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      title="Xóa"
                                      onClick={() => handleDeleteDocument(doc.id)}
                                    >
                                      <i className="fas fa-trash"></i>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-5 border rounded bg-light">
                        <i className="fas fa-file-alt fa-3x text-muted mb-3 d-block"></i>
                        <p className="text-muted mb-0">Chưa có tài liệu nào được upload</p>
                      </div>
                    )}
                  </>
                )}
              </Tab.Pane>

              {/* Team Tab */}
              <Tab.Pane eventKey="team">
                <Row>
                  <Col lg={6} className="mb-4">
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-light border-0">
                        <h5 className="mb-0">
                          <i className="fas fa-user-tie me-2 text-primary"></i>
                          Giám đốc Dự án
                        </h5>
                      </Card.Header>
                      <Card.Body>
                        {project.project_director ? (
                          <div>
                            <div className="mb-3">
                              <div className="d-flex align-items-center mb-3">
                                <div className="bg-primary text-white rounded-circle p-3 me-3" style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <i className="fas fa-user fa-lg"></i>
                                </div>
                                <div>
                                  <h6 className="mb-0 fw-bold">{project.project_director.name}</h6>
                                  <small className="text-muted">{project.project_director.position}</small>
                                </div>
                              </div>
                            </div>
                            <div className="info-group">
                              <div className="info-item">
                                <strong>Email:</strong> {project.project_director.email}
                              </div>
                              <div className="info-item">
                                <strong>Điện thoại:</strong> {project.project_director.phone}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted text-center">Chưa có giám đốc được chỉ định</p>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col lg={6} className="mb-4">
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-light border-0">
                        <h5 className="mb-0">
                          <i className="fas fa-clipboard-list me-2 text-info"></i>
                          Người Quản lý Dự án
                        </h5>
                      </Card.Header>
                      <Card.Body>
                        {project.project_manager ? (
                          <div>
                            <div className="mb-3">
                              <div className="d-flex align-items-center mb-3">
                                <div className="bg-info text-white rounded-circle p-3 me-3" style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <i className="fas fa-user fa-lg"></i>
                                </div>
                                <div>
                                  <h6 className="mb-0 fw-bold">{project.project_manager.name}</h6>
                                  <small className="text-muted">{project.project_manager.position}</small>
                                </div>
                              </div>
                            </div>
                            <div className="info-group">
                              <div className="info-item">
                                <strong>Email:</strong> {project.project_manager.email}
                              </div>
                              <div className="info-item">
                                <strong>Điện thoại:</strong> {project.project_manager.phone}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted text-center">Chưa có người quản lý được chỉ định</p>
                        )}
                      </Card.Body>
                    </Card>
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

      {/* Upload Document Modal */}
      <Modal show={showDocumentModal} onHide={() => setShowDocumentModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Upload Tài liệu Dự án</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-5 border-2 border-dashed rounded" style={{ borderStyle: 'dashed' }}>
            <input
              type="file"
              multiple
              onChange={handleDocumentUpload}
              style={{ display: 'none' }}
              id="fileInput"
            />
            <label htmlFor="fileInput" style={{ cursor: 'pointer', width: '100%' }}>
              <i className="fas fa-cloud-upload-alt fa-3x text-primary mb-3 d-block"></i>
              <h6>Kéo thả hoặc click để chọn tài liệu</h6>
              <small className="text-muted">Hỗ trợ các định dạng: PDF, DOC, DOCX, XLS, XLSX, IMG, JPG, PNG</small>
            </label>
          </div>

          {uploadedDocuments.length > 0 && (
            <div className="mt-3">
              <h6>Tài liệu đã chọn ({uploadedDocuments.length}):</h6>
              <ul className="list-group">
                {uploadedDocuments.map(doc => (
                  <li key={doc.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <i className="fas fa-file me-2"></i>
                      {doc.name}
                    </span>
                    <Badge bg="secondary">{(doc.size / 1024).toFixed(2)} KB</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDocumentModal(false)}>
            Đóng
          </Button>
          <Button 
            variant="primary"
            onClick={() => {
              setShowDocumentModal(false);
              if (uploadedDocuments.length > 0) {
                showNotification(`Đã upload ${uploadedDocuments.length} tài liệu thành công!`, 'success');
              }
            }}
          >
            Hoàn tất upload
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add/Edit Zone Modal */}
      <Modal show={showAddZoneModal} onHide={() => setShowAddZoneModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Thêm Kho Mới</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-info mb-3">
            <i className="fas fa-info-circle me-2"></i>
            Form thêm kho sẽ được hiển thị tại đây
          </div>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Mã Kho</Form.Label>
                <Form.Control type="text" placeholder="Ví dụ: A1" />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Tên Kho</Form.Label>
                <Form.Control type="text" placeholder="Ví dụ: Khu vực A1" />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Diện tích (m²)</Form.Label>
                <Form.Control type="number" placeholder="500" />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Giá thuê (đ/m²/tháng)</Form.Label>
                <Form.Control type="number" placeholder="150000" />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Trạng thái</Form.Label>
            <Form.Select>
              <option value="available">Chưa cho thuê</option>
              <option value="rented">Đã cho thuê</option>
              <option value="deposited">Đã cọc</option>
              <option value="maintenance">Bảo trì</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddZoneModal(false)}>
            Hủy
          </Button>
          <Button variant="primary" onClick={() => setShowAddZoneModal(false)}>
            Lưu Kho
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ProjectDetail;