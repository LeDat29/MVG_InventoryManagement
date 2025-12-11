/**
 * Document Manager - Quản lý tài liệu hợp đồng với version control
 */

import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Table, Badge, Form, 
  Modal, Tabs, Tab, Accordion, Alert, ProgressBar 
} from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import contractService from '../../services/contractService';
import LoadingSpinner from '../Common/LoadingSpinner';

const DocumentManager = ({ contractId, onClose }) => {
  const { hasPermission } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [documentsByCategory, setDocumentsByCategory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Document form data
  const [formData, setFormData] = useState({
    category_id: '',
    document_name: '',
    document_type: 'contract',
    content: '',
    variables: {},
    signature_required: false
  });

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load categories and documents in parallel
      const [categoriesResponse, documentsResponse] = await Promise.all([
        contractService.getDocumentCategories(),
        contractService.getContractDocuments(contractId)
      ]);
      
      setCategories(categoriesResponse.data.flat);
      setDocuments(documentsResponse.data.documents);
      setDocumentsByCategory(documentsResponse.data.by_category);
      
    } catch (error) {
      showError('Không thể tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contractId) {
      loadData();
    }
  }, [contractId]);

  // Create document
  const handleCreateDocument = async (e) => {
    e.preventDefault();
    
    try {
      await contractService.createDocument({
        ...formData,
        contract_id: contractId
      });
      
      showSuccess('Tạo tài liệu thành công');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      showError('Lỗi tạo tài liệu: ' + error.message);
    }
  };

  // View document details
  const viewDocument = async (documentId) => {
    try {
      const response = await contractService.getDocument(documentId);
      setSelectedDocument(response.data);
      setShowDocumentModal(true);
    } catch (error) {
      showError('Không thể tải chi tiết tài liệu: ' + error.message);
    }
  };

  // Create new version
  const createNewVersion = async (documentId, comment = '') => {
    try {
      await contractService.createDocumentVersion(documentId, { comment });
      showSuccess('Tạo phiên bản mới thành công');
      loadData();
    } catch (error) {
      showError('Lỗi tạo phiên bản: ' + error.message);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      category_id: '',
      document_name: '',
      document_type: 'contract',
      content: '',
      variables: {},
      signature_required: false
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'review': return 'warning';
      case 'approved': return 'info';
      case 'final': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <Container fluid>
      <Row>
        <Col>
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4>
              <i className="fas fa-folder-open me-2"></i>
              Quản lý tài liệu hợp đồng
            </h4>
            
            <div className="d-flex gap-2">
              {hasPermission('contract_create') && (
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                >
                  <i className="fas fa-plus me-2"></i>
                  Thêm tài liệu
                </Button>
              )}
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={onClose}
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center p-4">
              <LoadingSpinner />
            </div>
          ) : (
            <Row>
              {/* Documents by Category */}
              <Col md={8}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">
                      Tài liệu theo danh mục ({documents.length} tài liệu)
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    {documentsByCategory.length > 0 ? (
                      <Accordion defaultActiveKey="0">
                        {documentsByCategory.map((category, index) => (
                          <Accordion.Item key={category.category_id} eventKey={index.toString()}>
                            <Accordion.Header>
                              <div className="d-flex justify-content-between align-items-center w-100 me-3">
                                <div>
                                  <strong>{category.category_name}</strong>
                                  {category.is_required && (
                                    <Badge bg="danger" className="ms-2">Bắt buộc</Badge>
                                  )}
                                </div>
                                <Badge bg="secondary">
                                  {category.documents.length} tài liệu
                                </Badge>
                              </div>
                            </Accordion.Header>
                            <Accordion.Body>
                              {category.documents.length > 0 ? (
                                <Table size="sm" responsive>
                                  <thead>
                                    <tr>
                                      <th>Tên tài liệu</th>
                                      <th>Phiên bản</th>
                                      <th>Trạng thái</th>
                                      <th>Ngày tạo</th>
                                      <th>Thao tác</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {category.documents.map(doc => (
                                      <tr key={doc.id} className={doc.is_latest ? 'table-info' : ''}>
                                        <td>
                                          <div>
                                            <strong>{doc.document_name}</strong>
                                            {doc.is_latest && (
                                              <Badge bg="success" className="ms-2">Latest</Badge>
                                            )}
                                          </div>
                                          {doc.signature_required && (
                                            <small className="text-muted">
                                              <i className="fas fa-signature me-1"></i>
                                              Yêu cầu ký
                                            </small>
                                          )}
                                        </td>
                                        <td>v{doc.version}</td>
                                        <td>
                                          <Badge bg={getStatusColor(doc.status)}>
                                            {doc.status}
                                          </Badge>
                                        </td>
                                        <td>
                                          {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                                          <br/>
                                          <small className="text-muted">{doc.created_by_name}</small>
                                        </td>
                                        <td>
                                          <div className="d-flex gap-1">
                                            <Button 
                                              variant="outline-primary" 
                                              size="sm"
                                              onClick={() => viewDocument(doc.id)}
                                              title="Xem chi tiết"
                                            >
                                              <i className="fas fa-eye"></i>
                                            </Button>
                                            
                                            {hasPermission('contract_update') && doc.is_latest && (
                                              <Button 
                                                variant="outline-success" 
                                                size="sm"
                                                onClick={() => createNewVersion(doc.id)}
                                                title="Tạo phiên bản mới"
                                              >
                                                <i className="fas fa-code-branch"></i>
                                              </Button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </Table>
                              ) : (
                                <Alert variant="warning" className="mb-0">
                                  <i className="fas fa-exclamation-triangle me-2"></i>
                                  Chưa có tài liệu nào trong danh mục này.
                                  {category.is_required && ' Danh mục này là bắt buộc.'}
                                </Alert>
                              )}
                            </Accordion.Body>
                          </Accordion.Item>
                        ))}
                      </Accordion>
                    ) : (
                      <Alert variant="info">
                        <i className="fas fa-info-circle me-2"></i>
                        Chưa có tài liệu nào. Hãy thêm tài liệu đầu tiên.
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* Document Categories */}
              <Col md={4}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">
                      <i className="fas fa-list me-2"></i>
                      Danh mục tài liệu
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    {categories.map(category => (
                      <div key={category.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                        <div>
                          <strong>{category.category_name}</strong>
                          {category.is_required && (
                            <Badge bg="danger" className="ms-2">Bắt buộc</Badge>
                          )}
                          <br/>
                          <small className="text-muted">{category.description}</small>
                        </div>
                        <Badge bg="secondary">
                          {documents.filter(doc => doc.category_id === category.id).length}
                        </Badge>
                      </div>
                    ))}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default DocumentManager;