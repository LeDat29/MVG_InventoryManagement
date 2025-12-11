/**
 * Contract Template Manager - Quản lý mẫu hợp đồng
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Row, Col, Card, Button, Table, Badge, Form, 
  Modal, Alert, Tabs, Tab 
} from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import contractService from '../../services/contractService';
import LoadingSpinner from '../Common/LoadingSpinner';

const ContractTemplateManager = () => {
  const { hasPermission } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Template form data
  const [formData, setFormData] = useState({
    template_name: '',
    template_code: '',
    template_type: 'warehouse_rental',
    template_content: '',
    variables: [],
    version: '1.0',
    is_active: true,
    is_default: false
  });

  // Variable management
  const [newVariable, setNewVariable] = useState({
    name: '',
    type: 'text',
    required: true,
    description: ''
  });

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await contractService.getContractTemplates();
      setTemplates(response.data);
    } catch (error) {
      showError('Không thể tải danh sách mẫu hợp đồng: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (hasPermission('contract_template_read')) {
      loadTemplates();
    }
  }, [hasPermission, loadTemplates]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (selectedTemplate) {
        await contractService.updateContractTemplate(selectedTemplate.id, formData);
        showSuccess('Cập nhật mẫu hợp đồng thành công');
        setShowEditModal(false);
      } else {
        await contractService.createContractTemplate(formData);
        showSuccess('Tạo mẫu hợp đồng thành công');
        setShowCreateModal(false);
      }
      
      loadTemplates();
      resetForm();
    } catch (error) {
      showError('Lỗi: ' + error.message);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      template_name: '',
      template_code: '',
      template_type: 'warehouse_rental',
      template_content: '',
      variables: [],
      version: '1.0',
      is_active: true,
      is_default: false
    });
    setSelectedTemplate(null);
  };

  // Add variable
  const addVariable = () => {
    if (!newVariable.name.trim()) return;
    
    const variable = {
      name: newVariable.name,
      type: newVariable.type,
      required: newVariable.required,
      description: newVariable.description
    };
    
    setFormData(prev => ({
      ...prev,
      variables: [...prev.variables, variable]
    }));
    
    setNewVariable({ name: '', type: 'text', required: true, description: '' });
  };

  // Remove variable
  const removeVariable = (index) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }));
  };

  // Edit template
  const editTemplate = (template) => {
    setFormData({
      template_name: template.template_name,
      template_code: template.template_code,
      template_type: template.template_type,
      template_content: template.template_content,
      variables: template.variables || [],
      version: template.version,
      is_active: template.is_active,
      is_default: template.is_default
    });
    setSelectedTemplate(template);
    setShowEditModal(true);
  };

  // Preview template
  const previewTemplate = async (template) => {
    try {
      const response = await contractService.getContractTemplate(template.id);
      setSelectedTemplate(response.data);
      setShowPreviewModal(true);
    } catch (error) {
      showError('Không thể tải chi tiết mẫu: ' + error.message);
    }
  };

  // Default contract template content
  const defaultTemplateContent = `
<div class="contract-header">
  <h1 style="text-align: center;">HỢP ĐỒNG THUÊ KHO</h1>
  <p style="text-align: center;">Số: {{contract_number}}</p>
</div>

<div class="contract-parties">
  <h3>CÁC BÊN THAM GIA HỢP ĐỒNG</h3>
  
  <h4>BÊN CHO THUÊ (Bên A):</h4>
  <p><strong>Tên:</strong> {{party_a_name}}</p>
  <p><strong>Địa chỉ:</strong> {{party_a_address}}</p>
  <p><strong>Người đại diện:</strong> {{party_a_representative}} - {{party_a_position}}</p>
  <p><strong>CMND/CCCD:</strong> {{party_a_id_number}}</p>
  
  <h4>BÊN THUÊ (Bên B):</h4>
  <p><strong>Tên công ty:</strong> {{party_b_name}}</p>
  <p><strong>Địa chỉ:</strong> {{party_b_address}}</p>
  <p><strong>Mã số thuế:</strong> {{party_b_tax_code}}</p>
  <p><strong>Người đại diện:</strong> {{party_b_representative}} - {{party_b_position}}</p>
</div>

<div class="contract-terms">
  <h3>ĐIỀU KHOẢN HỢP ĐỒNG</h3>
  
  <h4>Điều 1: Đối tượng thuê</h4>
  <p>Bên A đồng ý cho Bên B thuê kho tại vị trí: <strong>{{warehouse_location}}</strong></p>
  <p>Diện tích: <strong>{{warehouse_area}} m²</strong></p>
  
  <h4>Điều 2: Thời hạn thuê</h4>
  <p>Từ ngày: <strong>{{start_date}}</strong> đến ngày: <strong>{{end_date}}</strong></p>
  
  <h4>Điều 3: Giá thuê và thanh toán</h4>
  <p>Giá thuê: <strong>{{rental_price}} VNĐ/tháng</strong></p>
  <p>Tiền cọc: <strong>{{deposit_amount}} VNĐ</strong></p>
  <p>Chu kỳ thanh toán: <strong>{{payment_cycle}}</strong></p>
  <p>Hạn thanh toán: Trước ngày <strong>{{payment_due_date}}</strong> hàng tháng</p>
  
  <h4>Điều 4: Mục đích sử dụng</h4>
  <p>{{warehouse_purpose}}</p>
  
  <h4>Điều 5: Điều khoản đặc biệt</h4>
  <p>{{special_terms}}</p>
</div>

<div class="contract-signature">
  <div style="display: flex; justify-content: space-between; margin-top: 50px;">
    <div style="text-align: center;">
      <p><strong>BÊN A</strong></p>
      <p>(Ký tên và đóng dấu)</p>
      <br><br><br>
      <p>{{party_a_representative}}</p>
    </div>
    <div style="text-align: center;">
      <p><strong>BÊN B</strong></p>
      <p>(Ký tên và đóng dấu)</p>
      <br><br><br>
      <p>{{party_b_representative}}</p>
    </div>
  </div>
</div>
  `;

  if (!hasPermission('contract_template_read')) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          Bạn không có quyền truy cập quản lý mẫu hợp đồng.
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <Row>
        <Col>
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>
              <i className="fas fa-file-alt me-2"></i>
              Quản lý mẫu hợp đồng
            </h2>
            
            {hasPermission('contract_template_create') && (
              <Button 
                variant="primary" 
                onClick={() => {
                  resetForm();
                  setFormData(prev => ({ ...prev, template_content: defaultTemplateContent }));
                  setShowCreateModal(true);
                }}
              >
                <i className="fas fa-plus me-2"></i>
                Tạo mẫu mới
              </Button>
            )}
          </div>

          {/* Templates Table */}
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                Danh sách mẫu hợp đồng ({templates.length})
              </h5>
            </Card.Header>
            
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center p-4">
                  <LoadingSpinner />
                </div>
              ) : (
                <Table responsive hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Tên mẫu</th>
                      <th>Mã mẫu</th>
                      <th>Loại</th>
                      <th>Phiên bản</th>
                      <th>Trạng thái</th>
                      <th>Sử dụng</th>
                      <th>Người tạo</th>
                      <th>Ngày tạo</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map(template => (
                      <tr key={template.id}>
                        <td>
                          <div>
                            <strong>{template.template_name}</strong>
                            {template.is_default && (
                              <Badge bg="primary" className="ms-2">Mặc định</Badge>
                            )}
                          </div>
                        </td>
                        <td>
                          <code>{template.template_code}</code>
                        </td>
                        <td>
                          <Badge bg="info">
                            {template.template_type === 'warehouse_rental' ? 'Thuê kho' : 
                             template.template_type === 'service_agreement' ? 'Dịch vụ' : 
                             'Phụ lục'}
                          </Badge>
                        </td>
                        <td>v{template.version}</td>
                        <td>
                          <Badge bg={template.is_active ? 'success' : 'secondary'}>
                            {template.is_active ? 'Hoạt động' : 'Ngưng'}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg="secondary">
                            {template.usage_count || 0} lần
                          </Badge>
                        </td>
                        <td>{template.created_by_name}</td>
                        <td>
                          {new Date(template.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button 
                              variant="outline-info" 
                              size="sm"
                              onClick={() => previewTemplate(template)}
                              title="Xem trước"
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                            
                            {hasPermission('contract_template_update') && (
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => editTemplate(template)}
                                title="Chỉnh sửa"
                              >
                                <i className="fas fa-edit"></i>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create/Edit Template Modal */}
      <Modal 
        show={showCreateModal || showEditModal} 
        onHide={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          resetForm();
        }}
        size="xl"
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedTemplate ? 'Chỉnh sửa mẫu hợp đồng' : 'Tạo mẫu hợp đồng mới'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Tabs defaultActiveKey="basic" className="mb-3">
              <Tab eventKey="basic" title="Thông tin cơ bản">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tên mẫu *</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.template_name}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          template_name: e.target.value
                        }))}
                        placeholder="VD: Hợp đồng thuê kho tiêu chuẩn"
                        required
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Mã mẫu *</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.template_code}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          template_code: e.target.value.toUpperCase()
                        }))}
                        placeholder="VD: STANDARD_WAREHOUSE_RENTAL"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Loại mẫu</Form.Label>
                      <Form.Select
                        value={formData.template_type}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          template_type: e.target.value
                        }))}
                      >
                        <option value="warehouse_rental">Hợp đồng thuê kho</option>
                        <option value="service_agreement">Hợp đồng dịch vụ</option>
                        <option value="amendment">Phụ lục hợp đồng</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phiên bản</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.version}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          version: e.target.value
                        }))}
                        placeholder="1.0"
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tùy chọn</Form.Label>
                      <div>
                        <Form.Check
                          type="checkbox"
                          id="is_active"
                          label="Hoạt động"
                          checked={formData.is_active}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            is_active: e.target.checked
                          }))}
                        />
                        <Form.Check
                          type="checkbox"
                          id="is_default"
                          label="Mặc định"
                          checked={formData.is_default}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            is_default: e.target.checked
                          }))}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>

              <Tab eventKey="variables" title={`Biến (${formData.variables.length})`}>
                <div className="mb-3">
                  <h5>Thêm biến mới</h5>
                  <Row>
                    <Col md={3}>
                      <Form.Control
                        type="text"
                        placeholder="Tên biến (VD: contract_number)"
                        value={newVariable.name}
                        onChange={(e) => setNewVariable(prev => ({
                          ...prev,
                          name: e.target.value
                        }))}
                      />
                    </Col>
                    <Col md={2}>
                      <Form.Select
                        value={newVariable.type}
                        onChange={(e) => setNewVariable(prev => ({
                          ...prev,
                          type: e.target.value
                        }))}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="currency">Currency</option>
                        <option value="boolean">Boolean</option>
                      </Form.Select>
                    </Col>
                    <Col md={4}>
                      <Form.Control
                        type="text"
                        placeholder="Mô tả"
                        value={newVariable.description}
                        onChange={(e) => setNewVariable(prev => ({
                          ...prev,
                          description: e.target.value
                        }))}
                      />
                    </Col>
                    <Col md={2}>
                      <Form.Check
                        type="checkbox"
                        label="Bắt buộc"
                        checked={newVariable.required}
                        onChange={(e) => setNewVariable(prev => ({
                          ...prev,
                          required: e.target.checked
                        }))}
                      />
                    </Col>
                    <Col md={1}>
                      <Button variant="success" onClick={addVariable}>
                        <i className="fas fa-plus"></i>
                      </Button>
                    </Col>
                  </Row>
                </div>

                {formData.variables.length > 0 && (
                  <Table size="sm">
                    <thead>
                      <tr>
                        <th>Tên biến</th>
                        <th>Loại</th>
                        <th>Mô tả</th>
                        <th>Bắt buộc</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.variables.map((variable, index) => (
                        <tr key={index}>
                          <td><code>{`{{${variable.name}}}`}</code></td>
                          <td><Badge bg="info">{variable.type}</Badge></td>
                          <td>{variable.description}</td>
                          <td>
                            {variable.required && (
                              <Badge bg="warning">Bắt buộc</Badge>
                            )}
                          </td>
                          <td>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => removeVariable(index)}
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Tab>

              <Tab eventKey="content" title="Nội dung mẫu">
                <Form.Group className="mb-3">
                  <Form.Label>Nội dung HTML</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={20}
                    value={formData.template_content}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      template_content: e.target.value
                    }))}
                    placeholder="Nhập nội dung HTML cho mẫu hợp đồng..."
                    style={{ fontFamily: 'monospace', fontSize: '14px' }}
                  />
                  <Form.Text className="text-muted">
                    Sử dụng cú pháp {`{{variable_name}}`} để chèn biến vào nội dung
                  </Form.Text>
                </Form.Group>
              </Tab>
            </Tabs>

            <div className="d-flex justify-content-end gap-2">
              <Button 
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                Hủy
              </Button>
              <Button type="submit" variant="primary">
                <i className="fas fa-save me-2"></i>
                {selectedTemplate ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Preview Template Modal */}
      <Modal 
        show={showPreviewModal} 
        onHide={() => setShowPreviewModal(false)}
        size="xl"
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Xem trước mẫu: {selectedTemplate?.template_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTemplate && (
            <div className="border p-3" 
                 dangerouslySetInnerHTML={{ __html: selectedTemplate.template_content }} 
            />
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default ContractTemplateManager;