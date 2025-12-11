/**
 * Contract Creator - Tạo hợp đồng từ mẫu với dữ liệu khách hàng
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Modal, Form, Row, Col, Button, Alert, Tabs, Tab,
  Card 
} from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import contractService from '../../services/contractService';
import customerService from '../../services/customerService';

const ContractCreator = ({ show, onHide, onSuccess }) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Data states
  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    // Basic contract info
    contract_title: '',
    customer_id: '',
    customer_company_id: '',
    template_id: '',
    
    // Party A (Lessor) - Bên cho thuê
    party_a_name: 'CÔNG TY KHO MVG',
    party_a_address: 'Khu công nghiệp ABC, Bình Dương',
    party_a_representative: 'Nguyễn Văn A',
    party_a_position: 'Giám đốc',
    party_a_id_number: '123456789',
    
    // Contract terms
    warehouse_location: '',
    warehouse_area: 0,
    rental_price: 0,
    deposit_amount: 0,
    service_fee: 0,
    
    // Dates
    start_date: '',
    end_date: '',
    auto_renewal: false,
    renewal_period: 12,
    
    // Payment
    payment_cycle: 'monthly',
    payment_due_date: 5,
    payment_method: 'Chuyển khoản',
    late_fee_percentage: 2.0,
    
    // Additional terms
    special_terms: '',
    notes: '',
    assigned_to: user?.id || '',
    
    // Template variables
    variables: {}
  });

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load customers and templates
      const [customersResponse, templatesResponse] = await Promise.all([
        customerService.getCustomers({ limit: 100 }),
        contractService.getContractTemplates({ is_active: true })
      ]);
      
      setCustomers(customersResponse.data.customers || []);
      setTemplates(templatesResponse.data || []);
      
    } catch (error) {
      showError('Không thể tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Load initial data
  useEffect(() => {
    if (show) {
      loadInitialData();
    }
  }, [show, loadInitialData]);

  // Handle customer selection
  const handleCustomerSelect = async (customerId) => {
    try {
      const customer = customers.find(c => c.id === parseInt(customerId));
      if (!customer) return;
      
      setSelectedCustomer(customer);
      
      // Load customer details with companies
      const customerResponse = await customerService.getCustomer(customerId);
      const customerData = customerResponse.data;
      
      // Auto-fill contract data
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        customer_company_id: customerData.companies?.[0]?.id || '',
        contract_title: `Hợp đồng thuê kho - ${customerData.company_name || customerData.full_name}`,
        variables: {
          ...prev.variables,
          // Auto-fill Party B info
          party_b_name: customerData.companies?.[0]?.company_name || customerData.full_name,
          party_b_address: customerData.companies?.[0]?.invoice_address || customerData.address,
          party_b_representative: customerData.full_name || customerData.contact_person,
          party_b_position: 'Giám đốc',
          party_b_tax_code: customerData.companies?.[0]?.tax_code || '',
          warehouse_purpose: customerData.companies?.[0]?.warehouse_purpose || ''
        }
      }));
      
    } catch (error) {
      showError('Không thể tải thông tin khách hàng: ' + error.message);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t.id === parseInt(templateId));
    if (!template) return;
    
    setSelectedTemplate(template);
    setFormData(prev => ({ ...prev, template_id: templateId }));
    
    // Parse template variables
    if (template.variables) {
      const templateVars = typeof template.variables === 'string' 
        ? JSON.parse(template.variables) 
        : template.variables;
      
      // Initialize variables with current form data
      const newVariables = { ...formData.variables };
      templateVars.forEach(variable => {
        if (!newVariables[variable.name]) {
          // Auto-populate common variables
          switch (variable.name) {
            case 'party_a_name':
              newVariables[variable.name] = formData.party_a_name;
              break;
            case 'party_a_representative':
              newVariables[variable.name] = formData.party_a_representative;
              break;
            case 'start_date':
              newVariables[variable.name] = formData.start_date;
              break;
            case 'end_date':
              newVariables[variable.name] = formData.end_date;
              break;
            case 'warehouse_location':
              newVariables[variable.name] = formData.warehouse_location;
              break;
            case 'rental_price':
              newVariables[variable.name] = formData.rental_price.toLocaleString('vi-VN') + ' VNĐ';
              break;
            default:
              newVariables[variable.name] = '';
          }
        }
      });
      
      setFormData(prev => ({ ...prev, variables: newVariables }));
    }
  };

  // Generate contract number
  const generateContractNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `HD${year}${month}${random}`;
  };

  // Calculate contract end date
  const calculateEndDate = (startDate, months = 12) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    return end.toISOString().split('T')[0];
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Generate contract number if not provided
      if (!formData.variables.contract_number) {
        formData.variables.contract_number = generateContractNumber();
      }
      
      // Create contract
      const response = await contractService.createContract(formData);
      
      showSuccess('Tạo hợp đồng thành công');
      onSuccess?.(response.data);
      onHide();
      resetForm();
      
    } catch (error) {
      showError('Lỗi tạo hợp đồng: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      contract_title: '',
      customer_id: '',
      customer_company_id: '',
      template_id: '',
      party_a_name: 'CÔNG TY KHO MVG',
      party_a_address: 'Khu công nghiệp ABC, Bình Dương',
      party_a_representative: 'Nguyễn Văn A',
      party_a_position: 'Giám đốc',
      party_a_id_number: '123456789',
      warehouse_location: '',
      warehouse_area: 0,
      rental_price: 0,
      deposit_amount: 0,
      service_fee: 0,
      start_date: '',
      end_date: '',
      auto_renewal: false,
      renewal_period: 12,
      payment_cycle: 'monthly',
      payment_due_date: 5,
      payment_method: 'Chuyển khoản',
      late_fee_percentage: 2.0,
      special_terms: '',
      notes: '',
      assigned_to: user?.id || '',
      variables: {}
    });
    setSelectedCustomer(null);
    setSelectedTemplate(null);
    setActiveTab('basic');
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-plus-circle me-2"></i>
          Tạo hợp đồng mới
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Tabs 
            activeKey={activeTab} 
            onSelect={setActiveTab}
            className="mb-3"
          >
            {/* Tab 1: Basic Info */}
            <Tab eventKey="basic" title="Thông tin cơ bản">
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Chọn khách hàng *</Form.Label>
                    <Form.Select
                      value={formData.customer_id}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn khách hàng --</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.company_name || customer.full_name} 
                          ({customer.customer_code})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  
                  {selectedCustomer && (
                    <Alert variant="info">
                      <strong>Thông tin khách hàng:</strong><br/>
                      <small>
                        SĐT: {selectedCustomer.phone}<br/>
                        Email: {selectedCustomer.email}<br/>
                        Địa chỉ: {selectedCustomer.address}
                      </small>
                    </Alert>
                  )}
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Chọn mẫu hợp đồng *</Form.Label>
                    <Form.Select
                      value={formData.template_id}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn mẫu hợp đồng --</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.template_name}
                          {template.is_default && ' (Mặc định)'}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  
                  {selectedTemplate && (
                    <Alert variant="success">
                      <strong>Mẫu đã chọn:</strong><br/>
                      <small>
                        Mã: {selectedTemplate.template_code}<br/>
                        Phiên bản: {selectedTemplate.version}<br/>
                        Loại: {selectedTemplate.template_type}
                      </small>
                    </Alert>
                  )}
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Tiêu đề hợp đồng *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.contract_title}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contract_title: e.target.value
                  }))}
                  placeholder="VD: Hợp đồng thuê kho - Công ty ABC"
                  required
                />
              </Form.Group>
            </Tab>

            {/* Tab 2: Contract Terms */}
            <Tab eventKey="terms" title="Điều khoản hợp đồng">
              <Row>
                <Col md={6}>
                  <h5>Thông tin kho</h5>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Vị trí kho *</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.warehouse_location}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          warehouse_location: value,
                          variables: {
                            ...prev.variables,
                            warehouse_location: value
                          }
                        }));
                      }}
                      placeholder="VD: Khu A, Lô 01, Tầng 1"
                      required
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Diện tích (m²) *</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.warehouse_area}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setFormData(prev => ({
                              ...prev,
                              warehouse_area: value,
                              variables: {
                                ...prev.variables,
                                warehouse_area: value
                              }
                            }));
                          }}
                          required
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Giá thuê/tháng (VNĐ) *</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          value={formData.rental_price}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setFormData(prev => ({
                              ...prev,
                              rental_price: value,
                              variables: {
                                ...prev.variables,
                                rental_price: formatCurrency(value) + ' VNĐ'
                              }
                            }));
                          }}
                          required
                        />
                        {formData.rental_price > 0 && formData.warehouse_area > 0 && (
                          <Form.Text className="text-muted">
                            Giá/m²: {formatCurrency(Math.round(formData.rental_price / formData.warehouse_area))} VNĐ/m²
                          </Form.Text>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Tiền cọc (VNĐ)</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          value={formData.deposit_amount}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setFormData(prev => ({
                              ...prev,
                              deposit_amount: value,
                              variables: {
                                ...prev.variables,
                                deposit_amount: formatCurrency(value) + ' VNĐ'
                              }
                            }));
                          }}
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Phí dịch vụ (VNĐ)</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          value={formData.service_fee}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            service_fee: parseInt(e.target.value) || 0
                          }))}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Col>

                <Col md={6}>
                  <h5>Thời hạn & Thanh toán</h5>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Ngày bắt đầu *</Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => {
                            const startDate = e.target.value;
                            const endDate = calculateEndDate(startDate, formData.renewal_period);
                            setFormData(prev => ({
                              ...prev,
                              start_date: startDate,
                              end_date: endDate,
                              variables: {
                                ...prev.variables,
                                start_date: new Date(startDate).toLocaleDateString('vi-VN'),
                                end_date: new Date(endDate).toLocaleDateString('vi-VN')
                              }
                            }));
                          }}
                          required
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Ngày kết thúc *</Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              end_date: value,
                              variables: {
                                ...prev.variables,
                                end_date: new Date(value).toLocaleDateString('vi-VN')
                              }
                            }));
                          }}
                          min={formData.start_date}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Chu kỳ thanh toán</Form.Label>
                    <Form.Select
                      value={formData.payment_cycle}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        payment_cycle: e.target.value,
                        variables: {
                          ...prev.variables,
                          payment_cycle: e.target.value === 'monthly' ? 'Hàng tháng' :
                                        e.target.value === 'quarterly' ? 'Hàng quý' : 'Hàng năm'
                        }
                      }))}
                    >
                      <option value="monthly">Hàng tháng</option>
                      <option value="quarterly">Hàng quý</option>
                      <option value="yearly">Hàng năm</option>
                    </Form.Select>
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Hạn thanh toán (ngày)</Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          max="31"
                          value={formData.payment_due_date}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 5;
                            setFormData(prev => ({
                              ...prev,
                              payment_due_date: value,
                              variables: {
                                ...prev.variables,
                                payment_due_date: value
                              }
                            }));
                          }}
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Phí trễ hạn (%)</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={formData.late_fee_percentage}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            late_fee_percentage: parseFloat(e.target.value) || 2.0
                          }))}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      id="auto_renewal"
                      label="Tự động gia hạn"
                      checked={formData.auto_renewal}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        auto_renewal: e.target.checked
                      }))}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Điều khoản đặc biệt</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.special_terms}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      special_terms: value,
                      variables: {
                        ...prev.variables,
                        special_terms: value
                      }
                    }));
                  }}
                  placeholder="Các điều khoản đặc biệt khác..."
                />
              </Form.Group>
            </Tab>

            {/* Tab 3: Template Variables */}
            <Tab eventKey="variables" title="Biến mẫu" disabled={!selectedTemplate}>
              {selectedTemplate && selectedTemplate.variables && (
                <div>
                  <Alert variant="info">
                    <i className="fas fa-info-circle me-2"></i>
                    Các biến này sẽ được thay thế trong nội dung hợp đồng cuối cùng.
                  </Alert>
                  
                  <Row>
                    {(typeof selectedTemplate.variables === 'string' ? JSON.parse(selectedTemplate.variables) : selectedTemplate.variables || []).map(variable => (
                      <Col md={6} key={variable.name}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            {variable.description || variable.name}
                            {variable.required && <span className="text-danger">*</span>}
                          </Form.Label>
                          
                          {variable.type === 'boolean' ? (
                            <Form.Check
                              type="checkbox"
                              checked={formData.variables[variable.name] === 'true'}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                variables: {
                                  ...prev.variables,
                                  [variable.name]: e.target.checked.toString()
                                }
                              }))}
                            />
                          ) : (
                            <Form.Control
                              type={variable.type === 'date' ? 'date' : 
                                   variable.type === 'number' ? 'number' : 'text'}
                              value={formData.variables[variable.name] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                variables: {
                                  ...prev.variables,
                                  [variable.name]: e.target.value
                                }
                              }))}
                              required={variable.required}
                              placeholder={`{{${variable.name}}}`}
                            />
                          )}
                          
                          <Form.Text className="text-muted">
                            Biến: <code>{`{{${variable.name}}}`}</code>
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Tab>

            {/* Tab 4: Preview */}
            <Tab eventKey="preview" title="Xem trước" disabled={!selectedTemplate}>
              {selectedTemplate && (
                <div>
                  <Alert variant="success">
                    <i className="fas fa-eye me-2"></i>
                    Xem trước nội dung hợp đồng với dữ liệu đã nhập
                  </Alert>
                  
                  <Card>
                    <Card.Body>
                      <div 
                        className="contract-preview"
                        dangerouslySetInnerHTML={{
                          __html: selectedTemplate.template_content.replace(
                            /\{\{(\w+)\}\}/g,
                            (match, varName) => formData.variables[varName] || `[${varName}]`
                          )
                        }}
                        style={{ 
                          border: '1px solid #ddd', 
                          padding: '20px',
                          backgroundColor: 'white',
                          fontFamily: 'Times New Roman, serif'
                        }}
                      />
                    </Card.Body>
                  </Card>
                </div>
              )}
            </Tab>
          </Tabs>

          {/* Summary */}
          {formData.customer_id && formData.template_id && (
            <Alert variant="light">
              <Row>
                <Col md={3}>
                  <strong>Khách hàng:</strong><br/>
                  {selectedCustomer?.company_name || selectedCustomer?.full_name}
                </Col>
                <Col md={3}>
                  <strong>Mẫu hợp đồng:</strong><br/>
                  {selectedTemplate?.template_name}
                </Col>
                <Col md={3}>
                  <strong>Diện tích:</strong><br/>
                  {formData.warehouse_area} m²
                </Col>
                <Col md={3}>
                  <strong>Giá thuê:</strong><br/>
                  {formatCurrency(formData.rental_price)} VNĐ/tháng
                </Col>
              </Row>
            </Alert>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Hủy
        </Button>
        
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={loading || !formData.customer_id || !formData.template_id}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Đang tạo...
            </>
          ) : (
            <>
              <i className="fas fa-save me-2"></i>
              Tạo hợp đồng
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ContractCreator;