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
        const [documentsResp, categoriesResp, templatesResp] = await Promise.all([
          axios.get('/api/documents', { headers }),
          axios.get('/api/documents/categories', { headers }).catch(() => ({ data: { success: true, data: { categories: [] } } })),
          axios.get('/api/documents/templates', { headers }).catch(() => ({ data: { success: true, data: { templates: [] } } }))
        ]);

        if (documentsResp.data?.success) {
          setDocuments(documentsResp.data.data?.files || []);
        } else {
          setDocuments([]);
        }

        if (categoriesResp.data?.success) {
          setCategories(categoriesResp.data.data?.categories || []);
        } else {
          setCategories([]);
        }

        if (templatesResp.data?.success) {
          setTemplates(templatesResp.data.data?.templates || []);
        } else {
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
    return { variant: typeInfo.variant, label: typeInfo.label };
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
    <Container fluid className="p-4" style={{ fontSize: '16px' }}>
      {/* Page Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-2" style={{ fontSize: '28px', fontWeight: '600' }}>Quản lý Hồ sơ</h2>
              <p className="text-muted mb-0" style={{ fontSize: '15px' }}>
                Quản lý tài liệu, mẫu hợp đồng và danh mục hồ sơ
              </p>
            </div>
            <div className="d-flex gap-3">
              {hasPermission('document_upload') && (
                <Button variant="primary" onClick={() => setShowUploadModal(true)} size="lg" style={{ fontSize: '15px', padding: '10px 20px' }}>
                  <i className="fas fa-upload me-2"></i>
                  Upload tài liệu
                </Button>
              )}
              {hasPermission('document_category_create') && (
                <Button variant="outline-primary" onClick={() => setShowCategoryModal(true)} size="lg" style={{ fontSize: '15px', padding: '10px 20px' }}>
                  <i className="fas fa-plus me-2"></i>
                  Thêm danh mục
                </Button>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>Tổng tài liệu</div>
                  <h3 className="mb-0 text-primary" style={{ fontSize: '32px', fontWeight: '700' }}>{documents.length}</h3>
                </div>
                <i className="fas fa-file fa-3x text-primary opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>Danh mục</div>
                  <h3 className="mb-0 text-success" style={{ fontSize: '32px', fontWeight: '700' }}>{categories.length}</h3>
                </div>
                <i className="fas fa-folder fa-3x text-success opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>Template</div>
                  <h3 className="mb-0 text-warning" style={{ fontSize: '32px', fontWeight: '700' }}>{templates.length}</h3>
                </div>
                <i className="fas fa-file-contract fa-3x text-warning opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>Dung lượng</div>
                  <h3 className="mb-0 text-info" style={{ fontSize: '28px', fontWeight: '700' }}>
                    {formatFileSize(documents.reduce((sum, doc) => sum + doc.size, 0))}
                  </h3>
                </div>
                <i className="fas fa-hdd fa-3x text-info opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Content with Tabs */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0 pb-0">
          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Nav variant="tabs" className="border-0" style={{ fontSize: '16px' }}>
              <Nav.Item>
                <Nav.Link eventKey="files" style={{ padding: '14px 20px', fontWeight: '500' }}>
                  <i className="fas fa-file me-2"></i>
                  Tài liệu ({documents.length})
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="categories" style={{ padding: '14px 20px', fontWeight: '500' }}>
                  <i className="fas fa-folder me-2"></i>
                  Danh mục ({categories.length})
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="templates" style={{ padding: '14px 20px', fontWeight: '500' }}>
                  <i className="fas fa-file-contract me-2"></i>
                  Template ({templates.length})
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Tab.Container>
        </Card.Header>

        <Card.Body className="p-4">
          <Tab.Container activeKey={activeTab}>
            <Tab.Content>
              {/* Files Tab */}
              <Tab.Pane eventKey="files">
                {/* Filters */}
                <Row className="mb-4 g-3">
                  <Col md={4}>
                    <Form.Control
                      type="text"
                      placeholder="Tìm kiếm tài liệu..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      style={{ fontSize: '15px', padding: '10px 15px', height: '45px' }}
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Select
                      value={filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      style={{ fontSize: '15px', padding: '10px 15px', height: '45px' }}
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
                      style={{ fontSize: '15px', padding: '10px 15px', height: '45px' }}
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
                      style={{ fontSize: '15px', padding: '10px', height: '45px' }}
                    >
                      <i className="fas fa-times me-2"></i>
                      Xóa bộ lọc
                    </Button>
                  </Col>
                </Row>

                <div className="table-responsive">
                  <Table hover style={{ fontSize: '15px' }}>
                    <thead className="bg-light">
                      <tr>
                        <th style={{ fontSize: '15px', fontWeight: '600', padding: '14px 12px' }}>Tài liệu</th>
                        <th style={{ fontSize: '15px', fontWeight: '600', padding: '14px 12px' }}>Loại</th>
                        <th style={{ fontSize: '15px', fontWeight: '600', padding: '14px 12px' }}>Danh mục</th>
                        <th style={{ fontSize: '15px', fontWeight: '600', padding: '14px 12px' }}>Kích thước</th>
                        <th style={{ fontSize: '15px', fontWeight: '600', padding: '14px 12px' }}>Người upload</th>
                        <th style={{ fontSize: '15px', fontWeight: '600', padding: '14px 12px' }}>Ngày upload</th>
                        <th style={{ fontSize: '15px', fontWeight: '600', padding: '14px 12px' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.length > 0 ? (
                        filteredDocuments.map((doc) => (
                          <tr key={doc.id}>
                            <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                              <div className="d-flex align-items-center">
                                <i className={`${getFileIcon(doc.mimetype)} me-3`} style={{ fontSize: '20px' }}></i>
                                <div>
                                  <div className="fw-medium" style={{ fontSize: '15px', marginBottom: '4px' }}>{doc.originalname}</div>
                                  {doc.description && (
                                    <div className="text-muted" style={{ fontSize: '13px' }}>{doc.description}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                              {(() => {
                                const badgeInfo = getResourceTypeBadge(doc.resource_type);
                                return <Badge bg={badgeInfo.variant} style={{ fontSize: '13px', padding: '6px 10px' }}>{badgeInfo.label}</Badge>;
                              })()}
                            </td>
                            <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                              <Badge bg="secondary" style={{ fontSize: '13px', padding: '6px 10px' }}>{doc.category_name || doc.category || '-'}</Badge>
                            </td>
                            <td style={{ padding: '16px 12px', verticalAlign: 'middle', fontSize: '15px' }}>{formatFileSize(doc.size)}</td>
                            <td style={{ padding: '16px 12px', verticalAlign: 'middle', fontSize: '15px' }}>{doc.uploaded_by || '-'}</td>
                            <td style={{ padding: '16px 12px', verticalAlign: 'middle', fontSize: '15px' }}>
                              {new Date(doc.uploaded_at).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit', 
                                year: 'numeric'
                              })}
                            </td>
                            <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                              <div className="btn-group">
                                <Button
                                  variant="outline-primary"
                                  onClick={() => handleDownload(doc)}
                                  style={{ fontSize: '14px', padding: '6px 12px' }}
                                >
                                  <i className="fas fa-download"></i>
                                </Button>
                                {hasPermission('document_update') && (
                                  <Button
                                    variant="outline-secondary"
                                    style={{ fontSize: '14px', padding: '6px 12px' }}
                                  >
                                    <i className="fas fa-edit"></i>
                                  </Button>
                                )}
                                {hasPermission('document_delete') && (
                                  <Button
                                    variant="outline-danger"
                                    style={{ fontSize: '14px', padding: '6px 12px' }}
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
                          <td colSpan={7} className="text-center py-5">
                            <div className="text-muted">
                              <i className="fas fa-folder-open fa-3x mb-3"></i>
                              <p style={{ fontSize: '16px', marginTop: '12px' }}>Không có tài liệu nào</p>
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
                  <Table hover style={{ fontSize: '15px' }}>
                    <thead className="bg-light">
                      <tr>
                        <th style={{ fontSize: '15px', fontWeight: '600', padding: '14px 12px' }}>Danh mục</th>
                        <th style={{ fontSize: '15px', fontWeight: '600', padding: '14px 12px' }}>Loại</th>
                        <th style={{ fontSize: '15px', fontWeight: '600', padding: '14px 12px' }}>Mô tả</th>
                        <th style={{ fontSize: '15px', fontWeight: '600', padding: '14px 12px' }}>Bắt buộc</th>
                        <th style={{ fontSize: '15px', fontWeight: '600', padding: '14px 12px' }}>Thứ tự</th>
                        <th style={{ fontSize: '15px', fontWeight: '600', padding: '14px 12px' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <tr key={category.id}>
                          <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                            <div>
                              <div className="fw-bold" style={{ fontSize: '15px', marginBottom: '4px' }}>{category.category_name}</div>
                              <div className="text-muted" style={{ fontSize: '13px' }}>{category.category_code}</div>
                            </div>
                          </td>
                          <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                            {(() => {
                              const badgeInfo = getResourceTypeBadge(category.category_type);
                              return <Badge bg={badgeInfo.variant} style={{ fontSize: '13px', padding: '6px 10px' }}>{badgeInfo.label}</Badge>;
                            })()}
                          </td>
                          <td style={{ padding: '16px 12px', verticalAlign: 'middle', fontSize: '15px' }}>{category.description || '-'}</td>
                          <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                            {category.is_required ? (
                              <Badge bg="danger" style={{ fontSize: '13px', padding: '6px 10px' }}>Bắt buộc</Badge>
                            ) : (
                              <Badge bg="secondary" style={{ fontSize: '13px', padding: '6px 10px' }}>Tùy chọn</Badge>
                            )}
                          </td>
                          <td style={{ padding: '16px 12px', verticalAlign: 'middle', fontSize: '15px' }}>{category.sort_order || '-'}</td>
                          <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
                            <div className="btn-group">
                              {hasPermission('document_category_update') && (
                                <Button
                                  variant="outline-secondary"
                                  style={{ fontSize: '14px', padding: '6px 12px' }}
                                >
                                  <i className="fas fa-edit"></i>
                                </Button>
                              )}
                              {hasPermission('document_category_delete') && (
                                <Button
                                  variant="outline-danger"
                                  style={{ fontSize: '14px', padding: '6px 12px' }}
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
                <Row className="g-3">
                  {templates.map((template) => (
                    <Col md={6} key={template.id}>
                      <Card className="border h-100">
                        <Card.Body className="p-4">
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <h6 className="mb-0" style={{ fontSize: '17px', fontWeight: '600' }}>{template.template_name}</h6>
                            <Badge bg="info" style={{ fontSize: '13px', padding: '6px 10px' }}>{template.template_type}</Badge>
                          </div>
                          <p className="text-muted mb-3" style={{ fontSize: '14px' }}>{template.description || 'Không có mô tả'}</p>
                          <div className="mb-3">
                            <div className="text-muted mb-2" style={{ fontSize: '14px', fontWeight: '500' }}>Placeholders:</div>
                            <div>
                              {template.placeholders && template.placeholders.length > 0 ? (
                                template.placeholders.map((placeholder, index) => (
                                  <Badge key={index} bg="secondary" className="me-2 mb-2" style={{ fontSize: '12px', padding: '5px 8px' }}>
                                    {placeholder}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted" style={{ fontSize: '14px' }}>Không có</span>
                              )}
                            </div>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="text-muted" style={{ fontSize: '14px' }}>
                              {new Date(template.created_at).toLocaleDateString('vi-VN')}
                            </div>
                            <div className="btn-group">
                              <Button
                                variant="primary"
                                onClick={() => handleGenerateContract(template)}
                                style={{ fontSize: '14px', padding: '6px 14px' }}
                              >
                                <i className="fas fa-file-contract me-1"></i>
                                Tạo HĐ
                              </Button>
                              {hasPermission('template_update') && (
                                <Button
                                  variant="outline-secondary"
                                  style={{ fontSize: '14px', padding: '6px 12px' }}
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
        <Modal.Header closeButton style={{ padding: '20px 24px' }}>
          <Modal.Title style={{ fontSize: '20px', fontWeight: '600' }}>Upload tài liệu</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '24px' }}>
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded p-5 text-center ${isDragActive ? 'border-primary bg-light' : 'border-secondary'}`}
            style={{ minHeight: '220px', cursor: 'pointer' }}
          >
            <input {...getInputProps()} />
            <i className="fas fa-cloud-upload-alt fa-4x text-muted mb-4"></i>
            <h5 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Kéo thả file vào đây hoặc click để chọn</h5>
            <p className="text-muted" style={{ fontSize: '15px' }}>
              Hỗ trợ: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, DWG (tối đa 10MB)
            </p>
          </div>
        </Modal.Body>
      </Modal>

      {/* Category Modal */}
      <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)}>
        <Modal.Header closeButton style={{ padding: '20px 24px' }}>
          <Modal.Title style={{ fontSize: '20px', fontWeight: '600' }}>Thêm danh mục mới</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '24px' }}>
          <Alert variant="info" style={{ fontSize: '15px', padding: '16px' }}>
            <i className="fas fa-info-circle me-2"></i>
            Form tạo danh mục sẽ được phát triển ở phiên bản tiếp theo
          </Alert>
        </Modal.Body>
        <Modal.Footer style={{ padding: '16px 24px' }}>
          <Button variant="secondary" onClick={() => setShowCategoryModal(false)} style={{ fontSize: '15px', padding: '8px 20px' }}>
            Đóng
          </Button>
          <Button variant="primary" style={{ fontSize: '15px', padding: '8px 20px' }}>
            Thêm danh mục
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Documents;