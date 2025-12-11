/**
 * Customers Page - KHO MVG
 * Danh sách và quản lý khách hàng
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Form, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import CustomerFormTabs from '../../components/Customers/CustomerFormTabs';
import customerService from '../../services/customerService';

function Customers() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    customer_type: '',
    credit_rating: ''
  });

  // Load customers from API
  const loadCustomers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await customerService.getCustomers(params);
      
      setCustomers(response.data.customers);
      setFilteredCustomers(response.data.customers);
      setPagination(response.data.pagination);
    } catch (error) {
      // showError('Không thể tải danh sách khách hàng: ' + error.message);
      console.warn('Customer loading error:', error.message);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, showError]);

  useEffect(() => {
    if (hasPermission('customer_read')) {
      loadCustomers(pagination.page);
    }
  }, [hasPermission, loadCustomers, pagination.page]);

  useEffect(() => {
    loadCustomers(pagination.page);
  }, []);

  // Handle filter changes
  useEffect(() => {
    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      if (pagination.page === 1) {
        loadCustomers(1);
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
        loadCustomers(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getCreditRatingBadge = (rating) => {
    const ratingMap = {
      A: { variant: 'success', label: 'A - Tốt' },
      B: { variant: 'primary', label: 'B - Khá' },
      C: { variant: 'warning', label: 'C - Trung bình' },
      D: { variant: 'danger', label: 'D - Kém' }
    };
    
    const ratingInfo = ratingMap[rating] || { variant: 'secondary', label: rating };
    return <Badge bg={ratingInfo.variant}>{ratingInfo.label}</Badge>;
  };

  const getCustomerTypeBadge = (type) => {
    return type === 'company' ? 
      <Badge bg="info">Doanh nghiệp</Badge> : 
      <Badge bg="secondary">Cá nhân</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount).replace('₫', 'đ');
  };

  const handleViewCustomer = (customerId) => {
    navigate(`/customers/${customerId}`);
  };

  const handleCreateCustomer = () => {
    if (!hasPermission('customer_create')) {
      showError('Bạn không có quyền tạo khách hàng mới');
      return;
    }
    setEditingCustomer(null);
    setShowCreateModal(true);
  };

  const handleEditCustomer = async (customer) => {
    if (!hasPermission('customer_update')) {
      showError('Bạn không có quyền chỉnh sửa khách hàng');
      return;
    }
    
    try {
      setFormLoading(true);
      console.log('🔍 Loading full customer data including contracts...');
      
      // Load full customer data with contracts from API
      const fullCustomerData = await customerService.getCustomer(customer.id);
      console.log('✅ Full customer data loaded:', fullCustomerData.data);
      
      // Merge customer info with contracts data
      const customerWithContracts = {
        ...fullCustomerData.data.customer,  // Customer personal/company info
        contracts: fullCustomerData.data.contracts || [],  // Contracts array
        statistics: fullCustomerData.data.statistics
      };
      
      console.log('✅ Merged customer data for form:', customerWithContracts);
      setEditingCustomer(customerWithContracts);
      setShowEditModal(true);
    } catch (error) {
      console.error('❌ Failed to load customer details:', error);
      // Fallback to using basic customer data if API fails
      setEditingCustomer(customer);
      setShowEditModal(true);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (!hasPermission('customer_delete')) {
      showError('Bạn không có quyền xóa khách hàng');
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa khách hàng "${customer.company_name || customer.contact_person}"?`)) {
      try {
        await customerService.deleteCustomer(customer.id);
        showSuccess('Xóa khách hàng thành công');
        loadCustomers(pagination.page);
      } catch (error) {
        showError('Không thể xóa khách hàng: ' + error.message);
      }
    }
  };

  // Transform form data to API format
  const transformFormDataToAPI = (formData) => {
    console.log('🔍 Raw form data received:', formData);
    
    // Safety checks for form data structure
    if (!formData || typeof formData !== 'object') {
      console.error('❌ Invalid form data structure:', formData);
      throw new Error('Invalid form data received');
    }
    
    const { personal = {}, companies = [] } = formData;
    const primaryCompany = companies[0] || {};
    
    console.log('📋 Form data breakdown:', {
      personal,
      primaryCompany,
      companiesLength: companies.length
    });
    
    const apiData = {
      // Map from personal tab
      name: primaryCompany.company_name || personal.full_name || '',
      full_name: personal.full_name || '',
      representative_name: personal.full_name || '',
      phone: personal.phone || '',
      email: personal.email || '',
      address: personal.address || primaryCompany.invoice_address || '',
      customer_type: personal.customer_type || 'individual', 
      notes: personal.notes || '',
      id_number: personal.id_number || '',
      warehouse_purpose: primaryCompany.warehouse_purpose || '',
      
      // Map from company tab  
      tax_code: primaryCompany.tax_code || '',
      representative_phone: personal.phone || '', 
      representative_email: personal.email || ''
    };
    
    console.log('📊 Field mapping details:');
    console.log('  personal.full_name →', apiData.full_name, '& representative_name →', apiData.representative_name);
    console.log('  personal.id_number →', apiData.id_number);
    console.log('  personal.phone →', apiData.phone);
    console.log('  personal.email →', apiData.email);
    console.log('  personal.address →', apiData.address);
    console.log('  primaryCompany.company_name →', apiData.name);
    console.log('  primaryCompany.warehouse_purpose →', apiData.warehouse_purpose);
    console.log('  primaryCompany.tax_code →', apiData.tax_code);
    
    console.log('✅ Transformed API data:', apiData);
    
    // Validation checks
    if (!apiData.representative_name || !apiData.phone) {
      console.error('❌ Missing required fields:', {
        representative_name: apiData.representative_name,
        phone: apiData.phone
      });
      throw new Error('Missing required fields: representative_name or phone');
    }
    
    return apiData;
  };

  const handleSaveCustomer = async (customerData) => {
    try {
      setFormLoading(true);
      
      // Transform the nested form data to flat API format
      const apiData = transformFormDataToAPI(customerData);
      console.log('Transformed customer data:', apiData);
      
      if (editingCustomer) {
        await customerService.updateCustomer(editingCustomer.id, apiData);
        showSuccess('Cập nhật khách hàng thành công');
        setShowEditModal(false);
        
        // Force reload customer data to show updated info
        console.log('🔄 Reloading customers list after update...');
        await loadCustomers(pagination.page);
        console.log('✅ Customers list reloaded successfully');
      } else {
        await customerService.createCustomer(apiData);
        showSuccess('Tạo khách hàng mới thành công');
        setShowCreateModal(false);
        
        // Reload list to show new customer
        await loadCustomers(pagination.page);
      }
      
      setEditingCustomer(null);
    } catch (error) {
      throw error; // Let the form handle the error
    } finally {
      setFormLoading(false);
    }
  };

  // const handlePageChange = (newPage) => {
  //   setPagination(prev => ({ ...prev, page: newPage }));
  //   loadCustomers(newPage);
  // };

  const totalRevenue = customers.reduce((sum, customer) => sum + customer.monthly_revenue, 0);
  const activeCustomers = customers.filter(c => c.active_contracts > 0).length;
  const averageRevenue = customers.length > 0 ? totalRevenue / customers.length : 0;

  if (loading) {
    return <LoadingSpinner text="Đang tải danh sách khách hàng..." />;
  }

  return (
    <Container fluid className="p-4">
      {/* Page Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Quản lý Khách hàng</h2>
              <p className="text-muted mb-0">
                Quản lý thông tin khách hàng và hợp đồng
              </p>
            </div>
            {hasPermission('customer_create') && (
              <Button variant="primary" onClick={handleCreateCustomer}>
                <i className="fas fa-plus me-2"></i>
                Thêm khách hàng
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
                  <h6 className="text-muted mb-1">Tổng khách hàng</h6>
                  <h4 className="mb-0 text-primary">{customers.length}</h4>
                </div>
                <i className="fas fa-users fa-2x text-primary opacity-25"></i>
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
                  <h4 className="mb-0 text-success">{activeCustomers}</h4>
                </div>
                <i className="fas fa-user-check fa-2x text-success opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Tổng doanh thu/tháng</h6>
                  <h4 className="mb-0 text-warning">{formatCurrency(totalRevenue)}</h4>
                </div>
                <i className="fas fa-chart-line fa-2x text-warning opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">TB doanh thu/KH</h6>
                  <h4 className="mb-0 text-info">{formatCurrency(averageRevenue)}</h4>
                </div>
                <i className="fas fa-calculator fa-2x text-info opacity-25"></i>
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
                  placeholder="Tìm theo mã, tên, SĐT, email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Loại khách hàng</Form.Label>
                <Form.Select
                  value={filters.customer_type}
                  onChange={(e) => handleFilterChange('customer_type', e.target.value)}
                >
                  <option value="">Tất cả loại</option>
                  <option value="company">Doanh nghiệp</option>
                  <option value="individual">Cá nhân</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Xếp hạng tín dụng</Form.Label>
                <Form.Select
                  value={filters.credit_rating}
                  onChange={(e) => handleFilterChange('credit_rating', e.target.value)}
                >
                  <option value="">Tất cả xếp hạng</option>
                  <option value="A">A - Tốt</option>
                  <option value="B">B - Khá</option>
                  <option value="C">C - Trung bình</option>
                  <option value="D">D - Kém</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Customers Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0">
          <h5 className="mb-0">
            <i className="fas fa-list me-2"></i>
            Danh sách khách hàng ({filteredCustomers.length})
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Khách hàng</th>
                  <th>Liên hệ</th>
                  <th>Loại</th>
                  <th>Xếp hạng</th>
                  <th>Hợp đồng</th>
                  <th>Doanh thu/tháng</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <div>
                          <div className="fw-bold">
                            {customer.company_name || customer.contact_person}
                          </div>
                          <small className="text-muted">{customer.customer_code}</small>
                          {customer.company_name && (
                            <div>
                              <small className="text-muted">{customer.contact_person}</small>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div>
                            <i className="fas fa-phone fa-sm me-1"></i>
                            {customer.phone}
                          </div>
                          {customer.email && (
                            <div>
                              <i className="fas fa-envelope fa-sm me-1"></i>
                              <small>{customer.email}</small>
                            </div>
                          )}
                          <div className="text-muted">
                            <small>{customer.address}</small>
                          </div>
                        </div>
                      </td>
                      <td>{getCustomerTypeBadge(customer.customer_type)}</td>
                      <td>{getCreditRatingBadge(customer.credit_rating)}</td>
                      <td>
                        <div>
                          <div>
                            <span className="fw-medium text-success">
                              {customer.active_contracts}
                            </span>
                            <span className="text-muted">/{customer.total_contracts}</span>
                          </div>
                          <small className="text-muted">Hiệu lực/Tổng</small>
                        </div>
                      </td>
                      <td>
                        <div className="fw-bold text-success">
                          {formatCurrency(customer.monthly_revenue)}
                        </div>
                      </td>
                      <td>
                        <div className="btn-group">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleViewCustomer(customer.id)}
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          {hasPermission('customer_update') && (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleEditCustomer(customer)}
                              title="Chỉnh sửa"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                          )}
                          {hasPermission('customer_delete') && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="ms-1"
                              onClick={() => handleDeleteCustomer(customer)}
                              title="Xóa khách hàng"
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          )}
                          {hasPermission('contract_create') && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => navigate(`/contracts/create?customer=${customer.id}`)}
                              title="Tạo hợp đồng mới"
                            >
                              <i className="fas fa-file-contract"></i>
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
                        <p>Không tìm thấy khách hàng nào phù hợp với bộ lọc</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Quick Actions */}
      <Row className="mt-4">
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <h6 className="mb-0">
                <i className="fas fa-exclamation-triangle text-warning me-2"></i>
                Khách hàng cần chú ý
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>Xếp hạng D (Kém)</span>
                <Badge bg="danger">{customers.filter(c => c.credit_rating === 'D').length}</Badge>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>Không có hợp đồng hiệu lực</span>
                <Badge bg="warning">{customers.filter(c => c.active_contracts === 0).length}</Badge>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span>Doanh thu = 0</span>
                <Badge bg="secondary">{customers.filter(c => c.monthly_revenue === 0).length}</Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
              <h6 className="mb-0">
                <i className="fas fa-chart-pie text-info me-2"></i>
                Thống kê nhanh
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>Doanh nghiệp</span>
                <Badge bg="info">
                  {customers.filter(c => c.customer_type === 'company').length}
                  <span className="ms-1">
                    ({Math.round(customers.filter(c => c.customer_type === 'company').length / customers.length * 100)}%)
                  </span>
                </Badge>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>Cá nhân</span>
                <Badge bg="secondary">
                  {customers.filter(c => c.customer_type === 'individual').length}
                  <span className="ms-1">
                    ({Math.round(customers.filter(c => c.customer_type === 'individual').length / customers.length * 100)}%)
                  </span>
                </Badge>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span>Xếp hạng A (Tốt)</span>
                <Badge bg="success">{customers.filter(c => c.credit_rating === 'A').length}</Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create Customer Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Thêm khách hàng mới</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div style={{ maxHeight: '80vh', overflowY: 'auto', padding: '1rem' }}>
            <CustomerFormTabs
              customer={null}
              onSave={handleSaveCustomer}
              onCancel={() => setShowCreateModal(false)}
              isLoading={formLoading}
            />
          </div>
        </Modal.Body>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Chỉnh sửa khách hàng</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div style={{ maxHeight: '80vh', overflowY: 'auto', padding: '1rem' }}>
            <CustomerFormTabs
              customer={editingCustomer}
              onSave={handleSaveCustomer}
              onCancel={() => setShowEditModal(false)}
              isLoading={formLoading}
            />
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default Customers;