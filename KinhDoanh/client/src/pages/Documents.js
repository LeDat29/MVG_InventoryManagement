/**
 * Documents Page - KHO MVG
 * Quản lý hồ sơ tài liệu
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Form, Modal, Alert, Tab, Nav } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';

function Documents() {
  const { hasPermission } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('files');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    resource_type: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const fetchAll = async () => {
      setLoading(true);
      try {
        const resp = await axios.get('/api/documents', { headers });
        if (resp.data?.success) {
          setDocuments(resp.data.data?.files || []);
          setCategories(resp.data.data?.categories || []);
          setTemplates(resp.data.data?.templates || []);
        } else {
          showError('Không tải được danh sách tài liệu');
          setDocuments([]);
          setCategories([]);
          setTemplates([]);
        }
      } catch (err) {
        console.error('Load documents failed', err);
        showError('Không tải được danh sách tài liệu');
        setDocuments([]);
        setCategories([]);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [showError]);

  // File upload with react-dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/acad': ['.dwg'],
      'image/vnd.dwg': ['.dwg']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        showError('Một số file không được hỗ trợ hoặc quá lớn (>10MB)');
      }
      if (acceptedFiles.length > 0) {
        handleFileUpload(acceptedFiles);
      }
    }
  });

  const handleFileUpload = async (files) => {
    if (!hasPermission('document_upload')) {
      showError('Bạn không có quyền upload tài liệu');
      return;
    }

    // Simulate file upload
    showSuccess(`Upload thành công ${files.length} file(s)`);
    setShowUploadModal(false);
  };

  const handleDownload = (doc) => {
    // Simulate file download
    showSuccess(`Đang tải xuống ${doc.originalname}`);
  };

  const handleGenerateContract = (template) => {
    if (!hasPermission('contract_generate')) {
      showError('Bạn không có quyền tạo hợp đồng từ template');
      return;
    }
    showSuccess(`Đang tạo hợp đồng từ template: ${template.template_name}`);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype) => {
    if (mimetype.includes('pdf')) return 'fas fa-file-pdf text-danger';
    if (mimetype.includes('image')) return 'fas fa-file-image text-success';
    if (mimetype.includes('word')) return 'fas fa-file-word text-primary';
    if (mimetype.includes('excel') || mimetype.includes('sheet')) return 'fas fa-file-excel text-success';
    if (mimetype.includes('dwg') || mimetype.includes('acad')) return 'fas fa-drafting-compass text-info';
    return 'fas fa-file text-secondary';
  };

  const getResourceTypeBadge = (type) => {
    const typeMap = {
      project: { variant: 'primary', label: 'Dự án' },
      customer: { variant: 'success', label: 'Khách hàng' },
      contract: { variant: 'warning', label: 'Hợp đồng' },
      task: { variant: 'info', label: 'Công việc' }
    };
    
    const typeInfo = typeMap[type] || { variant: 'secondary', label: type };
    return <Badge bg={typeInfo.variant}>{typeInfo.label}</Badge>;
  };

  const filteredDocuments = documents.filter(doc => {
    return (!filters.search || 
            doc.originalname.toLowerCase().includes(filters.search.toLowerCase()) ||
            doc.description.toLowerCase().includes(filters.search.toLowerCase())) &&
           (!filters.category || doc.category === filters.category) &&
           (!filters.resource_type || doc.resource_type === filters.resource_type);
  });

  if (loading) {
    return <LoadingSpinner text="Đang tải tài liệu..." />;
  }

  return (
    <Container fluid className="p-4">
      {/* Page Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Quản lý Hồ sơ</h2>
              <p className="text-muted mb-0">
                Quản lý tài liệu, mẫu hợp đồng và danh mục hồ sơ
              </p>
            </div>
            <div className="d-flex gap-2">
              {hasPermission('document_upload') && (
                <Button variant="primary" onClick={() => setShowUploadModal(true)}>
                  <i className="fas fa-upload me-2"></i>
                  Upload tài liệu
                </Button>
              )}
              {hasPermission('document_category_create') && (
                <Button variant="outline-primary" onClick={() => setShowCategoryModal(true)}>
                  <i className="fas fa-plus me-2"></i>
                  Thêm danh mục
                </Button>
              )}
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
                  <h6 className="text-muted mb-1">Tổng tài liệu</h6>
                  <h4 className="mb-0 text-primary">{documents.length}</h4>
                </div>
                <i className="fas fa-file fa-2x text-primary opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Danh mục</h6>
                  <h4 className="mb-0 text-success">{categories.length}</h4>
                </div>
                <i className="fas fa-folder fa-2x text-success opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Template</h6>
                  <h4 className="mb-0 text-warning">{templates.length}</h4>
                </div>
                <i className="fas fa-file-contract fa-2x text-warning opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Dung lượng</h6>
                  <h4 className="mb-0 text-info">
                    {formatFileSize(documents.reduce((sum, doc) => sum + doc.size, 0))}
                  </h4>
                </div>
                <i className="fas fa-hdd fa-2x text-info opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Content with Tabs */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0">
          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Nav variant="tabs" className="border-0">
              <Nav.Item>
                <Nav.Link eventKey="files">
                  <i className="fas fa-file me-2"></i>
                  Tài liệu ({documents.length})
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="categories">
                  <i className="fas fa-folder me-2"></i>
                  Danh mục ({categories.length})
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="templates">
                  <i className="fas fa-file-contract me-2"></i>
                  Template ({templates.length})
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Tab.Container>
        </Card.Header>

        <Card.Body>
          <Tab.Container activeKey={activeTab}>
            <Tab.Content>
              {/* Files Tab */}
              <Tab.Pane eventKey="files">
                {/* Filters */}
                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Control
                      type="text"
                      placeholder="Tìm kiếm tài liệu..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Select
                      value={filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="">Tất cả danh mục</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.category_name}>{cat.category_name}</option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Select
                      value={filters.resource_type}
                      onChange={(e) => setFilters(prev => ({ ...prev, resource_type: e.target.value }))}
                    >
                      <option value="">Tất cả loại</option>
                      <option value="project">Dự án</option>
                      <option value="customer">Khách hàng</option>
                      <option value="contract">Hợp đồng</option>
                      <option value="task">Công việc</option>
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    <Button 
                      variant="outline-secondary" 
                      className="w-100"
                      onClick={() => setFilters({ search: '', category: '', resource_type: '' })}
                    >
                      <i className="fas fa-times me-2"></i>
                      Xóa bộ lọc
                    </Button>
                  </Col>
                </Row>

                <div className="table-responsive">
                  <Table hover>
                    <thead className="bg-light">
                      <tr>
                        <th>Tài liệu</th>
                        <th>Loại</th>
                        <th>Danh mục</th>
                        <th>Kích thước</th>
                        <th>Người upload</th>
                        <th>Ngày upload</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.length > 0 ? (
                        filteredDocuments.map((doc) => (
                          <tr key={doc.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <i className={`${getFileIcon(doc.mimetype)} fa-lg me-3`}></i>
                                <div>
                                  <div className="fw-medium">{doc.originalname}</div>
                                  {doc.description && (
                                    <small className="text-muted">{doc.description}</small>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>{getResourceTypeBadge(doc.resource_type)}</td>
                            <td>
                              <Badge bg="outline-secondary">{doc.category}</Badge>
                            </td>
                            <td>{formatFileSize(doc.size)}</td>
                            <td>{doc.uploaded_by}</td>
                            <td>
                              {new Date(doc.uploaded_at).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit', 
                                year: 'numeric'
                              })}
                            </td>
                            <td>
                              <div className="btn-group">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleDownload(doc)}
                                >
                                  <i className="fas fa-download"></i>
                                </Button>
                                {hasPermission('document_update') && (
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </Button>
                                )}
                                {hasPermission('document_delete') && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                  >
                                    <i className="fas fa-trash"></i>
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
                              <i className="fas fa-folder-open fa-2x mb-3"></i>
                              <p>Không có tài liệu nào</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Tab.Pane>

              {/* Categories Tab */}
              <Tab.Pane eventKey="categories">
                <div className="table-responsive">
                  <Table hover>
                    <thead className="bg-light">
                      <tr>
                        <th>Danh mục</th>
                        <th>Loại</th>
                        <th>Mô tả</th>
                        <th>Bắt buộc</th>
                        <th>Thứ tự</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <tr key={category.id}>
                          <td>
                            <div>
                              <div className="fw-bold">{category.category_name}</div>
                              <small className="text-muted">{category.category_code}</small>
                            </div>
                          </td>
                          <td>{getResourceTypeBadge(category.category_type)}</td>
                          <td>{category.description}</td>
                          <td>
                            {category.is_required ? (
                              <Badge bg="danger">Bắt buộc</Badge>
                            ) : (
                              <Badge bg="secondary">Tùy chọn</Badge>
                            )}
                          </td>
                          <td>{category.sort_order}</td>
                          <td>
                            <div className="btn-group">
                              {hasPermission('document_category_update') && (
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                >
                                  <i className="fas fa-edit"></i>
                                </Button>
                              )}
                              {hasPermission('document_category_delete') && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                >
                                  <i className="fas fa-trash"></i>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Tab.Pane>

              {/* Templates Tab */}
              <Tab.Pane eventKey="templates">
                <Row>
                  {templates.map((template) => (
                    <Col md={6} key={template.id} className="mb-3">
                      <Card className="border">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="mb-0">{template.template_name}</h6>
                            <Badge bg="info">{template.template_type}</Badge>
                          </div>
                          <p className="text-muted small mb-2">{template.description}</p>
                          <div className="mb-3">
                            <small className="text-muted">Placeholders:</small>
                            <div>
                              {template.placeholders.map((placeholder, index) => (
                                <Badge key={index} bg="outline-secondary" className="me-1 mb-1">
                                  {placeholder}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                              {new Date(template.created_at).toLocaleDateString('vi-VN')}
                            </small>
                            <div className="btn-group">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleGenerateContract(template)}
                              >
                                <i className="fas fa-file-contract me-1"></i>
                                Tạo HĐ
                              </Button>
                              {hasPermission('template_update') && (
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                >
                                  <i className="fas fa-edit"></i>
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>

      {/* Upload Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Upload tài liệu</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded p-4 text-center ${isDragActive ? 'border-primary bg-light' : 'border-secondary'}`}
            style={{ minHeight: '200px', cursor: 'pointer' }}
          >
            <input {...getInputProps()} />
            <i className="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
            <h5>Kéo thả file vào đây hoặc click để chọn</h5>
            <p className="text-muted">
              Hỗ trợ: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, DWG (tối đa 10MB)
            </p>
          </div>
        </Modal.Body>
      </Modal>

      {/* Category Modal */}
      <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Thêm danh mục mới</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <i className="fas fa-info-circle me-2"></i>
            Form tạo danh mục sẽ được phát triển ở phiên bản tiếp theo
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
            Đóng
          </Button>
          <Button variant="primary">
            Thêm danh mục
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Documents;