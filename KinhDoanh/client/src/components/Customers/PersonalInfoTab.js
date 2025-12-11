/**
 * Personal Info Tab - Thông tin cá nhân cơ bản
 */

import React from 'react';
import { Form, Row, Col, Card, Button, InputGroup, Alert } from 'react-bootstrap';

function PersonalInfoTab({ data, errors, touched, onDataChange, onGenerateCode }) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...data, [name]: value };
    onDataChange(newData);
  };

  // const _validateField = (name, value) => {
  //   switch (name) {
  //     case 'customer_code':
  //       if (!value.trim()) return 'Mã khách hàng là bắt buộc';
  //       if (!/^(CN|DN)\d{6}$/.test(value)) return 'Mã khách hàng phải có format: CN/DN + 6 số';
  //       break;
  //     case 'full_name':
  //       if (!value.trim()) return 'Họ tên là bắt buộc';
  //       if (value.length < 2) return 'Họ tên phải có ít nhất 2 ký tự';
  //       break;
  //     case 'phone':
  //       if (!value.trim()) return 'Số điện thoại là bắt buộc';
  //       if (!/^[0-9+\-\s()]{10,15}$/.test(value)) return 'Số điện thoại không hợp lệ';
  //       break;
  //     case 'email':
  //       if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
  //         return 'Email không hợp lệ';
  //       }
  //       break;
  //     case 'id_number':
  //       if (value && !/^[0-9]{9,12}$/.test(value)) {
  //         return 'CMND/CCCD phải có 9-12 số';
  //       }
  //       break;
  //     default:
  //       break;
  //   }
  //   return '';
  // };

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">
          <i className="fas fa-user me-2"></i>
          Thông tin cá nhân cơ bản
        </h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Loại khách hàng *</Form.Label>
              <Form.Select
                name="customer_type"
                value={data.customer_type}
                onChange={handleInputChange}
              >
                <option value="individual">Cá nhân (CN)</option>
                <option value="company">Doanh nghiệp (DN)</option>
              </Form.Select>
              <Form.Text className="text-muted">
                Mã khách hàng sẽ bắt đầu bằng CN (Cá nhân) hoặc DN (Doanh nghiệp)
              </Form.Text>
            </Form.Group>
          </Col>
          
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Mã khách hàng *</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  name="customer_code"
                  value={data.customer_code}
                  onChange={handleInputChange}
                  placeholder={`VD: ${data.customer_type === 'individual' ? 'CN' : 'DN'}123456`}
                  isInvalid={touched.customer_code && errors.customer_code}
                />
                <Button 
                  variant="outline-secondary" 
                  onClick={onGenerateCode}
                  title="Tự động tạo mã"
                >
                  <i className="fas fa-magic"></i>
                </Button>
              </InputGroup>
              {touched.customer_code && errors.customer_code && (
                <div className="invalid-feedback d-block">{errors.customer_code}</div>
              )}
              <Form.Text className="text-muted">
                Format: 2 ký tự phân loại + 6 ký tự số tự động
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col md={8}>
            <Form.Group className="mb-3">
              <Form.Label>Họ và tên đầy đủ *</Form.Label>
              <Form.Control
                type="text"
                name="full_name"
                value={data.full_name}
                onChange={handleInputChange}
                placeholder="Nhập họ tên đầy đủ"
                isInvalid={touched.full_name && errors.full_name}
              />
              {touched.full_name && errors.full_name && (
                <div className="invalid-feedback">{errors.full_name}</div>
              )}
            </Form.Group>
          </Col>
          
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Số điện thoại *</Form.Label>
              <Form.Control
                type="text"
                name="phone"
                value={data.phone}
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

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={data.email}
                onChange={handleInputChange}
                placeholder="email@example.com"
                isInvalid={touched.email && errors.email}
              />
              {touched.email && errors.email && (
                <div className="invalid-feedback">{errors.email}</div>
              )}
            </Form.Group>
          </Col>
          
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>CMND/CCCD</Form.Label>
              <Form.Control
                type="text"
                name="id_number"
                value={data.id_number}
                onChange={handleInputChange}
                placeholder="Số CMND/CCCD"
                isInvalid={touched.id_number && errors.id_number}
              />
              {touched.id_number && errors.id_number && (
                <div className="invalid-feedback">{errors.id_number}</div>
              )}
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>Địa chỉ liên hệ</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            name="address"
            value={data.address}
            onChange={handleInputChange}
            placeholder="Địa chỉ đầy đủ (số nhà, đường, phường/xã, quận/huyện, tỉnh/thành)"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Ghi chú</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            name="notes"
            value={data.notes}
            onChange={handleInputChange}
            placeholder="Ghi chú thêm về khách hàng..."
          />
        </Form.Group>

        {data.customer_type === 'individual' && (
          <Alert variant="info">
            <i className="fas fa-info-circle me-2"></i>
            <strong>Lưu ý cho khách hàng cá nhân:</strong> Một cá nhân có thể thuê kho thông qua nhiều công ty khác nhau. 
            Vui lòng điền thông tin công ty ở tab tiếp theo.
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
}

export default PersonalInfoTab;