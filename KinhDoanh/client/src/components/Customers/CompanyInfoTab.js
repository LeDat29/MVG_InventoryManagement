/**
 * Company Info Tab - Thông tin công ty
 * Một cá nhân có thể thuê nhiều kho bằng nhiều công ty khác nhau
 */

import React from 'react';
import { Form, Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap';

function CompanyInfoTab({ companies, errors, touched, onCompaniesChange }) {
  
  const addCompany = () => {
    const newCompany = {
      id: null,
      tax_code: '',
      company_name: '',
      invoice_address: '',
      warehouse_purpose: '',
      is_primary: companies.length === 0 // First company is primary
    };
    onCompaniesChange([...companies, newCompany]);
  };

  const removeCompany = (index) => {
    if (companies.length <= 1) {
      alert('Phải có ít nhất một công ty');
      return;
    }
    
    if (window.confirm('Bạn có chắc chắn muốn xóa công ty này?')) {
      const newCompanies = companies.filter((_, i) => i !== index);
      // If removing primary company, make first one primary
      if (companies[index].is_primary && newCompanies.length > 0) {
        newCompanies[0].is_primary = true;
      }
      onCompaniesChange(newCompanies);
    }
  };

  const updateCompany = (index, field, value) => {
    const newCompanies = [...companies];
    newCompanies[index] = {
      ...newCompanies[index],
      [field]: value
    };
    onCompaniesChange(newCompanies);
  };

  const setPrimaryCompany = (index) => {
    const newCompanies = companies.map((company, i) => ({
      ...company,
      is_primary: i === index
    }));
    onCompaniesChange(newCompanies);
  };

  const validateTaxCode = (taxCode) => {
    if (!taxCode.trim()) return 'Mã số thuế là bắt buộc';
    if (!/^[0-9]{10}(-[0-9]{3})?$/.test(taxCode)) {
      return 'Mã số thuế phải có 10 số hoặc 10 số + 3 số mã chi nhánh (VD: 0123456789 hoặc 0123456789-001)';
    }
    return '';
  };

  const warehousePurposes = [
    'Kho hàng hóa tổng hợp',
    'Kho nguyên liệu sản xuất', 
    'Kho thành phẩm',
    'Kho phụ tùng, linh kiện',
    'Kho thiết bị, máy móc',
    'Kho hàng điện tử',
    'Kho hàng thời trang',
    'Kho hàng thực phẩm',
    'Kho hàng dược phẩm',
    'Kho hàng hóa chất',
    'Kho văn phòng phẩm',
    'Kho tài liệu, hồ sơ',
    'Khác'
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">
          <i className="fas fa-building me-2"></i>
          Thông tin công ty ({companies.length})
        </h5>
        <Button variant="outline-primary" size="sm" onClick={addCompany}>
          <i className="fas fa-plus me-2"></i>
          Thêm công ty
        </Button>
      </div>

      <Alert variant="info" className="mb-3">
        <i className="fas fa-info-circle me-2"></i>
        <strong>Lưu ý:</strong> Một cá nhân có thể thuê nhiều kho bằng nhiều công ty khác nhau. 
        Mỗi công ty sẽ có thông tin riêng để xuất hóa đơn và ký hợp đồng.
      </Alert>

      {companies.map((company, index) => (
        <Card key={index} className="mb-3">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Công ty {index + 1}</strong>
              {company.is_primary && (
                <Badge bg="primary" className="ms-2">Công ty chính</Badge>
              )}
            </div>
            <div>
              {!company.is_primary && companies.length > 1 && (
                <Button
                  variant="outline-success"
                  size="sm"
                  className="me-2"
                  onClick={() => setPrimaryCompany(index)}
                  title="Đặt làm công ty chính"
                >
                  <i className="fas fa-star"></i>
                </Button>
              )}
              {companies.length > 1 && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => removeCompany(index)}
                  title="Xóa công ty"
                >
                  <i className="fas fa-trash"></i>
                </Button>
              )}
            </div>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Mã số thuế *</Form.Label>
                  <Form.Control
                    type="text"
                    value={company.tax_code}
                    onChange={(e) => updateCompany(index, 'tax_code', e.target.value)}
                    placeholder="0123456789 hoặc 0123456789-001"
                    isInvalid={validateTaxCode(company.tax_code)}
                  />
                  <Form.Text className="text-muted">
                    10 số cho trụ sở chính, thêm -001, -002... cho chi nhánh
                  </Form.Text>
                  {validateTaxCode(company.tax_code) && (
                    <div className="invalid-feedback d-block">
                      {validateTaxCode(company.tax_code)}
                    </div>
                  )}
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tên công ty *</Form.Label>
                  <Form.Control
                    type="text"
                    value={company.company_name}
                    onChange={(e) => updateCompany(index, 'company_name', e.target.value)}
                    placeholder="Tên công ty đầy đủ"
                    isInvalid={!company.company_name.trim()}
                  />
                  {!company.company_name.trim() && (
                    <div className="invalid-feedback d-block">
                      Tên công ty là bắt buộc
                    </div>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Địa chỉ xuất hóa đơn *</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={company.invoice_address}
                onChange={(e) => updateCompany(index, 'invoice_address', e.target.value)}
                placeholder="Địa chỉ đầy đủ để xuất hóa đơn VAT"
                isInvalid={!company.invoice_address.trim()}
              />
              {!company.invoice_address.trim() && (
                <div className="invalid-feedback d-block">
                  Địa chỉ xuất hóa đơn là bắt buộc
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Mục đích sử dụng kho *</Form.Label>
              <Form.Select
                value={company.warehouse_purpose}
                onChange={(e) => updateCompany(index, 'warehouse_purpose', e.target.value)}
                isInvalid={!company.warehouse_purpose}
              >
                <option value="">-- Chọn mục đích sử dụng --</option>
                {warehousePurposes.map(purpose => (
                  <option key={purpose} value={purpose}>{purpose}</option>
                ))}
              </Form.Select>
              {!company.warehouse_purpose && (
                <div className="invalid-feedback d-block">
                  Vui lòng chọn mục đích sử dụng kho
                </div>
              )}
              <Form.Text className="text-muted">
                Thông tin này sẽ được sử dụng trong hợp đồng thuê kho
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>
      ))}

      {companies.length === 0 && (
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Chưa có thông tin công ty nào. Vui lòng thêm ít nhất một công ty để tiếp tục.
        </Alert>
      )}
    </div>
  );
}

export default CompanyInfoTab;