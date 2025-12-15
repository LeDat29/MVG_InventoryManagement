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
import projectService from '../../services/projectService';

const ContractCreator = ({ show, onHide, onSuccess, initialCustomerId = '' }) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Data states
  const [customers, setCustomers] = useState([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  
  
  // Form data
  const [formData, setFormData] = useState({
    // Basic contract info
    contract_title: '',
    customer_id: '',
    customer_company_id: '',
    template_id: '',
    project_id: '',
    zone_id: '',
    
    // Party A (Lessor) - Bên cho thuê
    party_a_name: 'CÔNG TY KHO MVG',
    party_a_address: 'Khu công nghiệp ABC, Bình Dương',
    party_a_representative: 'Nguyễn Văn A',
    party_a_position: 'Giám đốc',
    party_a_id_number: '123456789',
    
    // Contract terms
    warehouse_location: '',
    warehouse_area: 0,
    warehouse_purpose: '',
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
      const [customersResponse, templatesResponse, projectsResponse] = await Promise.all([
        customerService.getCustomers({ limit: 100 }),
        contractService.getContractTemplates({ is_active: true }),
        projectService.getProjects({ limit: 100 })
      ]);
      // Customers: API shape { success, data: { customers: [...] } }
      setCustomers(customersResponse?.data?.customers || customersResponse?.customers || []);
      setCustomersLoaded(true);
      // Templates: API shape can be: { success, data: [...] } or { success, data: { templates: [...] } } or { templates: [...] }
      const loadedTemplates = 
        templatesResponse?.data?.templates || 
        templatesResponse?.data || 
        templatesResponse?.templates || 
        templatesResponse || [];
      setTemplates(Array.isArray(loadedTemplates) ? loadedTemplates : []);
      setTemplatesLoaded(true);
      // Auto-select default template if available
      const defaultTpl = Array.isArray(loadedTemplates) && loadedTemplates.find(t => t.is_default);
      if (defaultTpl) {
        setSelectedTemplate(defaultTpl);
        setFormData(prev => ({ ...prev, template_id: String(defaultTpl.id) }));
      }
      // Projects: shape could be { success, data: { projects: [...] } } or { success, projects: [...] }
      const loadedProjects = 
        projectsResponse?.data?.projects || 
        projectsResponse?.projects || 
        projectsResponse?.data || [];
      setProjects(Array.isArray(loadedProjects) ? loadedProjects : (Array.isArray(projectsResponse?.data?.projects) ? projectsResponse.data.projects : []));
      setProjectsLoaded(true);
    } catch (error) {
      console.error('Error loading initial data:', error);
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

  // Read customer id from URL if not provided via props
  useEffect(() => {
    if (!show) return;
    if (initialCustomerId) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('customer') || params.get('customer_id');
      if (fromUrl) {
        handleCustomerSelect(fromUrl);
      }
    } catch (e) {
      // no-op
    }
  }, [show, initialCustomerId]);

  // If initialCustomerId is provided, preselect it after data loads
  useEffect(() => {
    async function ensureAndSelectInitialCustomer() {
      if (!show || !initialCustomerId) return;
      // If list already contains the customer, select it
      const exists = customers.some(c => String(c.id) === String(initialCustomerId));
      if (exists) {
        handleCustomerSelect(initialCustomerId);
        return;
      }
      // Otherwise fetch it and add to list
      try {
        const customerResponse = await customerService.getCustomer(initialCustomerId);
        const customerData = customerResponse?.data?.customer || customerResponse?.data || customerResponse;
        if (customerData && customerData.id) {
          setCustomers(prev => {
            const already = prev.some(c => String(c.id) === String(customerData.id));
            return already ? prev : [customerData, ...prev];
          });
          handleCustomerSelect(customerData.id);
        }
      } catch (e) {
        console.warn('Could not preload initial customer', e?.message || e);
      }
    }
    ensureAndSelectInitialCustomer();
  }, [show, initialCustomerId, customers, customersLoaded]);

  // Load zones when project changes
  useEffect(() => {
    async function fetchZones() {
      if (formData.project_id) {
        const zonesResponse = await projectService.getZones(formData.project_id);
        setZones(zonesResponse.zones || []);
      } else {
        setZones([]);
      }
    }
    fetchZones();
  }, [formData.project_id]);

  // Handle customer selection
  const handleCustomerSelect = async (customerId) => {
    try {
      const customer = customers.find(c => c.id === parseInt(customerId));
      if (!customer) return;
      
      setSelectedCustomer(customer);
      
      // Load customer details
      const customerResponse = await customerService.getCustomer(customerId);
      const customerData = customerResponse?.data?.customer || customerResponse?.data || customerResponse;
      
      // Auto-fill contract data based on available fields from API
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        contract_title: `Hợp đồng thuê kho - ${customerData.name || customerData.full_name || 'Khách hàng'}`,
        warehouse_purpose: customerData.warehouse_purpose || 'Lưu kho hàng hóa',
        variables: {
          ...prev.variables,
          // Auto-fill Party B info
          party_b_name: customerData.name || customerData.full_name,
          party_b_address: customerData.address || '',
          party_b_representative: customerData.representative_name || customerData.full_name || '',
          party_b_position: 'Giám đốc',
          party_b_tax_code: customerData.tax_code || '',
          warehouse_purpose: customerData.warehouse_purpose || 'Lưu kho hàng hóa',
          payment_cycle: prev.payment_cycle === 'monthly' ? 'Hàng tháng' :
                        prev.payment_cycle === 'quarterly' ? 'Hàng quý' : 'Hàng năm',
          payment_due_date: prev.payment_due_date
        }
      }));
      
    } catch (error) {
      showError('Không thể tải thông tin khách hàng: ' + error.message);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    if (!templateId) {
      setSelectedTemplate(null);
      setFormData(prev => ({ ...prev, template_id: '' }));
      return;
    }
    const template = templates.find(t => t.id === parseInt(templateId));
    if (!template) return;
    
    setSelectedTemplate(template);
    setFormData(prev => ({ ...prev, template_id: templateId }));
    
    // Parse template variables
    if (template.variables) {
      let templateVars = [];
      try {
        templateVars = typeof template.variables === 'string' 
          ? JSON.parse(template.variables) 
          : (Array.isArray(template.variables) ? template.variables : []);
      } catch (e) {
        console.warn('Invalid template variables JSON:', e?.message || e);
        templateVars = [];
      }
      
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
      // Move to variables tab to let user fill missing variables
      setActiveTab('variables');
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
      project_id: '',
      zone_id: '',
      party_a_name: 'CÔNG TY KHO MVG',
      party_a_address: 'Khu công nghiệp ABC, Bình Dương',
      party_a_representative: 'Nguyễn Văn A',
      party_a_position: 'Giám đốc',
      party_a_id_number: '123456789',
      warehouse_location: '',
      warehouse_area: 0,
      warehouse_purpose: '',
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
    setSelectedProject(null);
    setSelectedZone(null);
    setActiveTab('basic');
  };

  // Format currency for display (without currency symbol)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  // Format currency for variables (with currency symbol)
  const formatCurrencyForVariable = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
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
        {selectedCustomer && (
          <Alert variant="info" className="mb-3">
            <Row>
              <Col md={4}>
                <div><strong>Khách hàng:</strong> {selectedCustomer.name || selectedCustomer.full_name}</div>
                {selectedCustomer.customer_code && (
                  <div><small className="text-muted">Mã KH: {selectedCustomer.customer_code}</small></div>
                )}
              </Col>
              <Col md={4}>
                <div><strong>Điện thoại:</strong> {selectedCustomer.phone || selectedCustomer.representative_phone || '—'}</div>
                <div><strong>Email:</strong> {selectedCustomer.email || selectedCustomer.representative_email || '—'}</div>
              </Col>
              <Col md={4}>
                <div><strong>Địa chỉ:</strong> {selectedCustomer.address || '—'}</div>
              </Col>
            </Row>
          </Alert>
        )}
        <Form onSubmit={handleSubmit}>
          <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
            {/* Tab 1: Thông tin hợp đồng (gộp cơ bản + điều khoản) */}
            <Tab eventKey="basic" title="Thông tin hợp đồng">
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Chọn khách hàng *</Form.Label>
                    <Form.Select
                      value={formData.customer_id}
                      onChange={e => handleCustomerSelect(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn khách hàng --</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {(customer.name || customer.full_name || 'Khách hàng')} {customer.customer_code ? `(${customer.customer_code})` : ''}
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
                  <Form.Group className="mb-3">
                    <Form.Label>Chọn dự án *</Form.Label>
                    <Form.Select
                      value={formData.project_id || ''}
                      onChange={e => {
                        const projectId = e.target.value;
                        const project = projects.find(p => p.id === parseInt(projectId));
                        setSelectedProject(project || null);
                        setFormData(prev => ({ ...prev, project_id: projectId, zone_id: '', warehouse_location: '' }));
                      }}
                      required
                    >
                      <option value="">-- Chọn dự án --</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Vị trí kho thuê *</Form.Label>
                    <Form.Select
                      value={formData.zone_id || ''}
                      onChange={e => {
                        const zoneId = e.target.value;
                        const selectedZone = zones.find(z => z.id === parseInt(zoneId));
                        setFormData(prev => ({
                          ...prev,
                          zone_id: zoneId,
                          warehouse_location: selectedZone ? `${selectedZone.zone_name || selectedZone.zone_code} - ${selectedProject?.name || ''}` : '',
                          variables: {
                            ...prev.variables,
                            warehouse_location: selectedZone ? `${selectedZone.zone_name || selectedZone.zone_code} - ${selectedProject?.name || ''}` : ''
                          }
                        }));
                        setSelectedZone(selectedZone || null);
                      }}
                      required
                      disabled={!formData.project_id}
                    >
                      <option value="">-- Chọn kho --</option>
                      {zones.map(zone => (
                        <option key={zone.id} value={zone.id}>{zone.zone_name} ({zone.zone_code})</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Chọn mẫu hợp đồng *</Form.Label>
                    <Form.Select
                      value={formData.template_id}
                      onChange={e => handleTemplateSelect(e.target.value)}
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
                  <Form.Group className="mb-3">
                    <Form.Label>Tiêu đề hợp đồng *</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.contract_title}
                      onChange={e => setFormData(prev => ({ ...prev, contract_title: e.target.value }))}
                      placeholder="VD: Hợp đồng thuê kho - Công ty ABC"
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
                          type="text"
                          value={formData.rental_price ? formatCurrency(formData.rental_price) : ''}
                          onChange={(e) => {
                            // Remove all non-digits
                            const numericValue = e.target.value.replace(/\D/g, '');
                            const value = parseInt(numericValue) || 0;
                            setFormData(prev => ({
                              ...prev,
                              rental_price: value,
                              variables: {
                                ...prev.variables,
                                rental_price: formatCurrencyForVariable(value)
                              }
                            }));
                          }}
                          placeholder="VD: 10,000,000"
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
                          type="text"
                          value={formData.deposit_amount ? formatCurrency(formData.deposit_amount) : ''}
                          onChange={(e) => {
                            // Remove all non-digits
                            const numericValue = e.target.value.replace(/\D/g, '');
                            const value = parseInt(numericValue) || 0;
                            setFormData(prev => ({
                              ...prev,
                              deposit_amount: value,
                              variables: {
                                ...prev.variables,
                                deposit_amount: formatCurrencyForVariable(value)
                              }
                            }));
                          }}
                          placeholder="VD: 5,000,000"
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Phí dịch vụ (VNĐ)</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.service_fee ? formatCurrency(formData.service_fee) : ''}
                          onChange={(e) => {
                            // Remove all non-digits
                            const numericValue = e.target.value.replace(/\D/g, '');
                            const value = parseInt(numericValue) || 0;
                            setFormData(prev => ({
                              ...prev,
                              service_fee: value,
                              variables: {
                                ...prev.variables,
                                service_fee: formatCurrencyForVariable(value)
                              }
                            }));
                          }}
                          placeholder="VD: 500,000"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

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

                  <Form.Group className="mb-3">
                    <Form.Label>Mục đích sử dụng kho</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.warehouse_purpose}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          warehouse_purpose: value,
                          variables: {
                            ...prev.variables,
                            warehouse_purpose: value
                          }
                        }));
                      }}
                      placeholder="VD: Lưu kho hàng hóa, Sản xuất, Phân phối..."
                    />
                  </Form.Group>

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
                </Col>
              </Row>
            </Tab>

            {/* Tab 2: Biến mẫu */}
            <Tab eventKey="variables" title="Biến mẫu" disabled={!selectedTemplate}>
              {selectedTemplate && selectedTemplate.variables && (
                <div>
                  <Alert variant="info">
                    <i className="fas fa-info-circle me-2"></i>
                    Các biến này sẽ được thay thế trong nội dung hợp đồng cuối cùng.
                  </Alert>
                  
                  <Row>
                    {(() => { let vars = []; try { vars = typeof selectedTemplate.variables === 'string' ? JSON.parse(selectedTemplate.variables) : (Array.isArray(selectedTemplate.variables) ? selectedTemplate.variables : []); } catch (e) { vars = []; } return vars; })().map(variable => (
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

            {/* Tab 3: Preview */}
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
                          __html: String(selectedTemplate?.template_content || '').replace(
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
                  {selectedCustomer?.name || selectedCustomer?.full_name}
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