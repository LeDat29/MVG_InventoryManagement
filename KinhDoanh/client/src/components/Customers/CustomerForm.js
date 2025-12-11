/**
 * Customer Form Component - KHO MVG
 * Form tạo mới và chỉnh sửa khách hàng
 */

import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Card, Button, Alert, InputGroup } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

function CustomerForm({ customer = null, onSave, onCancel, isLoading = false }) {
  const { hasPermission } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [formData, setFormData] = useState({
    customer_code: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_code: '',
    business_license: '',
    customer_type: 'company',
    credit_rating: 'B',
    notes: '',
    bank_info: {
      bank_name: '',
      account_number: '',
      account_holder: ''
    }
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Load customer data nếu đang edit
  useEffect(() => {
    if (customer) {
      setFormData({
        customer_code: customer.customer_code || '',
        company_name: customer.company_name || '',
        contact_person: customer.contact_person || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        tax_code: customer.tax_code || '',
        business_license: customer.business_license || '',
        customer_type: customer.customer_type || 'company',
        credit_rating: customer.credit_rating || 'B',
        notes: customer.notes || '',
        bank_info: customer.bank_info || {
          bank_name: '',
          account_number: '',
          account_holder: ''
        }
      });
    }
  }, [customer]);

  // Validation rules
  const validateField = (name, value) => {
    switch (name) {
      case 'customer_code':
        if (!value.trim()) return 'Mã khách hàng là bắt buộc';
        if (value.length > 50) return 'Mã khách hàng không được quá 50 ký tự';
        if (!/^[A-Z0-9]+$/.test(value)) return 'Mã khách hàng chỉ chứa chữ hoa và số';
        break;
      case 'contact_person':
        if (!value.trim()) return 'Người liên hệ là bắt buộc';
        if (value.length > 100) return 'Tên người liên hệ không được quá 100 ký tự';
        break;
      case 'phone':
        if (!value.trim()) return 'Số điện thoại là bắt buộc';
        if (!/^[0-9+\-\s()]+$/.test(value)) return 'Số điện thoại không hợp lệ';
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Email không hợp lệ';
        }
        break;
      case 'company_name':
        if (formData.customer_type === 'company' && !value.trim()) {
          return 'Tên công ty là bắt buộc cho doanh nghiệp';
        }
        break;
      default:
        break;
    }
    return '';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('bank_info.')) {
      const bankField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        bank_info: {
          ...prev.bank_info,
          [bankField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Validate field
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      if (key !== 'bank_info') {
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      showError('Vui lòng kiểm tra lại thông tin đã nhập');
      return;
    }

    // Prepare data for submission
    const submitData = {
      ...formData,
      bank_info: formData.bank_info.bank_name ? formData.bank_info : null
    };

    try {
      await onSave(submitData);
    } catch (error) {
      showError(error.message || 'Có lỗi xảy ra khi lưu thông tin');
    }
  };

  const generateCustomerCode = () => {
    const prefix = formData.customer_type === 'company' ? 'CTY' : 'CN';
    const timestamp = Date.now().toString().slice(-6);
    const newCode = `${prefix}${timestamp}`;
    
    setFormData(prev => ({
      ...prev,
      customer_code: newCode
    }));
    
    setTouched(prev => ({
      ...prev,
      customer_code: true
    }));
  };

  const isEdit = !!customer;
  const canEdit = isEdit ? hasPermission('customer_update') : hasPermission('customer_create');

  if (!canEdit) {
    return (
      <Alert variant="warning">
        Bạn không có quyền {isEdit ? 'chỉnh sửa' : 'tạo mới'} khách hàng
      </Alert>
    );
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Row>
        {/* Basic Information */}
        <Col lg={8}>
          <Card className="mb-3">
            <Card.Header>
              <h5 className="mb-0">Thông tin cơ bản</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Mã khách hàng *</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        name="customer_code"
                        value={formData.customer_code}
                        onChange={handleInputChange}
                        placeholder="VD: CTY001, CN001"
                        isInvalid={touched.customer_code && errors.customer_code}
                        disabled={isEdit} // Không cho edit mã khách hàng
                      />
                      {!isEdit && (
                        <Button variant="outline-secondary" onClick={generateCustomerCode}>
                          <i className="fas fa-magic"></i>
                        </Button>
                      )}
                    </InputGroup>
                    {touched.customer_code && errors.customer_code && (
                      <div className="invalid-feedback d-block">{errors.customer_code}</div>
                    )}
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Loại khách hàng *</Form.Label>
                    <Form.Select
                      name="customer_type"
                      value={formData.customer_type}
                      onChange={handleInputChange}
                    >
                      <option value="company">Doanh nghiệp</option>
                      <option value="individual">Cá nhân</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {formData.customer_type === 'company' && (
                <Form.Group className="mb-3">
                  <Form.Label>Tên công ty *</Form.Label>
                  <Form.Control
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    placeholder="Nhập tên công ty"
                    isInvalid={touched.company_name && errors.company_name}
                  />
                  {touched.company_name && errors.company_name && (
                    <div className="invalid-feedback">{errors.company_name}</div>
                  )}
                </Form.Group>
              )}

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Người liên hệ *</Form.Label>
                    <Form.Control
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      placeholder="Tên người liên hệ"
                      isInvalid={touched.contact_person && errors.contact_person}
                    />
                    {touched.contact_person && errors.contact_person && (
                      <div className="invalid-feedback">{errors.contact_person}</div>
                    )}
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Số điện thoại *</Form.Label>
                    <Form.Control
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="0123456789"
                      isInvalid={touched.phone && errors.phone}
                    />
                    {touched.phone && errors.phone && (
                      <div className="invalid-feedback">{errors.phone}</div>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@company.com"
                  isInvalid={touched.email && errors.email}
                />
                {touched.email && errors.email && (
                  <div className="invalid-feedback">{errors.email}</div>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Địa chỉ</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Địa chỉ đầy đủ"
                />
              </Form.Group>
            </Card.Body>
          </Card>

          {/* Business Information */}
          {formData.customer_type === 'company' && (
            <Card className="mb-3">
              <Card.Header>
                <h5 className="mb-0">Thông tin kinh doanh</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Mã số thuế</Form.Label>
                      <Form.Control
                        type="text"
                        name="tax_code"
                        value={formData.tax_code}
                        onChange={handleInputChange}
                        placeholder="0123456789"
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Giấy phép kinh doanh</Form.Label>
                      <Form.Control
                        type="text"
                        name="business_license"
                        value={formData.business_license}
                        onChange={handleInputChange}
                        placeholder="Số giấy phép"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Bank Information */}
          <Card className="mb-3">
            <Card.Header>
              <h5 className="mb-0">Thông tin ngân hàng (Tùy chọn)</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Tên ngân hàng</Form.Label>
                    <Form.Control
                      type="text"
                      name="bank_info.bank_name"
                      value={formData.bank_info.bank_name}
                      onChange={handleInputChange}
                      placeholder="VD: Vietcombank, BIDV"
                    />
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Số tài khoản</Form.Label>
                    <Form.Control
                      type="text"
                      name="bank_info.account_number"
                      value={formData.bank_info.account_number}
                      onChange={handleInputChange}
                      placeholder="Số tài khoản"
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Form.Group className="mb-3">
                <Form.Label>Chủ tài khoản</Form.Label>
                <Form.Control
                  type="text"
                  name="bank_info.account_holder"
                  value={formData.bank_info.account_holder}
                  onChange={handleInputChange}
                  placeholder="Tên chủ tài khoản"
                />
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>

        {/* Sidebar */}
        <Col lg={4}>
          <Card className="mb-3">
            <Card.Header>
              <h5 className="mb-0">Đánh giá & Ghi chú</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Xếp hạng tín dụng</Form.Label>
                <Form.Select
                  name="credit_rating"
                  value={formData.credit_rating}
                  onChange={handleInputChange}
                >
                  <option value="A">A - Tuyệt vời</option>
                  <option value="B">B - Tốt</option>
                  <option value="C">C - Trung bình</option>
                  <option value="D">D - Cần theo dõi</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Ghi chú</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Ghi chú thêm về khách hàng..."
                />
              </Form.Group>
            </Card.Body>
          </Card>

          {/* Action Buttons */}
          <div className="d-grid gap-2">
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Đang lưu...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  {isEdit ? 'Cập nhật' : 'Tạo mới'}
                </>
              )}
            </Button>
            
            <Button 
              type="button" 
              variant="outline-secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              <i className="fas fa-times me-2"></i>
              Hủy bỏ
            </Button>
          </div>
        </Col>
      </Row>
    </Form>
  );
}

export default CustomerForm;