/**
 * Contract Info Tab - Thông tin hợp đồng
 * Một công ty có thể thuê nhiều kho ở nhiều dự án, vị trí khác nhau
 */

import React, { useState } from 'react';
import { Form, Row, Col, Card, Button, Alert, Badge, InputGroup } from 'react-bootstrap';

function ContractInfoTab({ contracts, companies, personalInfo, errors, touched, onContractsChange }) {
  const [projects] = useState([
    { id: 1, name: 'Dự án Kho Bình Dương', code: 'BD001' },
    { id: 2, name: 'Dự án Kho Đồng Nai', code: 'DN001' },
    { id: 3, name: 'Dự án Kho Long An', code: 'LA001' },
    { id: 4, name: 'Dự án Kho Tây Ninh', code: 'TN001' }
  ]);

  const addContract = () => {
    if (companies.length === 0) {
      alert('Vui lòng thêm thông tin công ty trước khi tạo hợp đồng');
      return;
    }

    const newContract = {
      id: null,
      contract_number: generateContractNumber(),
      project_id: '',
      warehouse_location: '',
      company_index: 0, // Default to first company
      representative_name: personalInfo.full_name,
      representative_position: 'Giám đốc',
      area_sqm: 0,
      rental_price: 0,
      start_date: '',
      end_date: '',
      payment_terms: 'Thanh toán theo tháng, trước ngày 5 hàng tháng',
      binding_terms: '',
      is_active: true
    };
    onContractsChange([...contracts, newContract]);
  };

  const removeContract = (index) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa hợp đồng này?')) {
      const newContracts = contracts.filter((_, i) => i !== index);
      onContractsChange(newContracts);
    }
  };

  const updateContract = (index, field, value) => {
    const newContracts = [...contracts];
    newContracts[index] = {
      ...newContracts[index],
      [field]: value
    };

    // Auto-calculate end date if start date and rental period change
    if (field === 'start_date' && value && !newContracts[index].end_date) {
      const startDate = new Date(value);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1); // Default 1 year contract
      newContracts[index].end_date = endDate.toISOString().split('T')[0];
    }

    onContractsChange(newContracts);
  };

  const generateContractNumber = () => {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `HD${year}${month}${random}`;
  };

  const calculateMonthlyRent = (totalRent, startDate, endDate) => {
    if (!startDate || !endDate || totalRent <= 0) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    
    return months > 0 ? Math.round(totalRent / months) : 0;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const validateContract = (contract) => {
    const errors = [];
    if (!contract.contract_number.trim()) errors.push('Số hợp đồng là bắt buộc');
    if (!contract.project_id) errors.push('Vui lòng chọn dự án');
    if (!contract.warehouse_location.trim()) errors.push('Vị trí kho là bắt buộc');
    if (!contract.representative_name.trim()) errors.push('Người đại diện là bắt buộc');
    if (contract.area_sqm <= 0) errors.push('Diện tích thuê phải lớn hơn 0');
    if (contract.rental_price <= 0) errors.push('Giá thuê phải lớn hơn 0');
    if (!contract.start_date) errors.push('Ngày bắt đầu là bắt buộc');
    if (!contract.end_date) errors.push('Ngày kết thúc là bắt buộc');
    if (contract.start_date && contract.end_date && new Date(contract.start_date) >= new Date(contract.end_date)) {
      errors.push('Ngày kết thúc phải sau ngày bắt đầu');
    }
    return errors;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">
          <i className="fas fa-file-contract me-2"></i>
          Thông tin hợp đồng ({contracts.length})
        </h5>
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={addContract}
          disabled={companies.length === 0}
        >
          <i className="fas fa-plus me-2"></i>
          Thêm hợp đồng
        </Button>
      </div>

      <Alert variant="info" className="mb-3">
        <i className="fas fa-info-circle me-2"></i>
        <strong>Lưu ý:</strong> Một công ty có thể thuê nhiều kho ở nhiều dự án, vị trí khác nhau. 
        Thông tin này sẽ được sử dụng để tự động tạo hợp đồng thuê kho từ hệ thống.
      </Alert>

      {companies.length === 0 && (
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Vui lòng điền thông tin công ty trước khi tạo hợp đồng.
        </Alert>
      )}

      {contracts.map((contract, index) => {
        const contractErrors = validateContract(contract);
        const selectedCompany = companies[contract.company_index];
        const monthlyRent = calculateMonthlyRent(contract.rental_price, contract.start_date, contract.end_date);

        return (
          <Card key={index} className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Hợp đồng {index + 1}</strong>
                {contract.contract_number && (
                  <Badge bg="secondary" className="ms-2">{contract.contract_number}</Badge>
                )}
                {contract.is_active && (
                  <Badge bg="success" className="ms-2">Đang hoạt động</Badge>
                )}
              </div>
              <div>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => removeContract(index)}
                  title="Xóa hợp đồng"
                >
                  <i className="fas fa-trash"></i>
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {/* Basic Contract Info */}
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Số hợp đồng *</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        value={contract.contract_number}
                        onChange={(e) => updateContract(index, 'contract_number', e.target.value)}
                        placeholder="HD202400001"
                      />
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => updateContract(index, 'contract_number', generateContractNumber())}
                        title="Tạo số hợp đồng tự động"
                      >
                        <i className="fas fa-magic"></i>
                      </Button>
                    </InputGroup>
                  </Form.Group>
                </Col>
                
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Dự án *</Form.Label>
                    <Form.Select
                      value={contract.project_id}
                      onChange={(e) => updateContract(index, 'project_id', e.target.value)}
                    >
                      <option value="">-- Chọn dự án --</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name} ({project.code})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Vị trí kho *</Form.Label>
                    <Form.Control
                      type="text"
                      value={contract.warehouse_location}
                      onChange={(e) => updateContract(index, 'warehouse_location', e.target.value)}
                      placeholder="VD: Khu A, Lô 01, Tầng 1"
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Company and Representative */}
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Công ty thuê *</Form.Label>
                    <Form.Select
                      value={contract.company_index}
                      onChange={(e) => updateContract(index, 'company_index', parseInt(e.target.value))}
                    >
                      {companies.map((company, companyIndex) => (
                        <option key={companyIndex} value={companyIndex}>
                          {company.company_name} ({company.tax_code})
                        </option>
                      ))}
                    </Form.Select>
                    {selectedCompany && (
                      <Form.Text className="text-muted">
                        Mục đích: {selectedCompany.warehouse_purpose}
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>
                
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Người đại diện công ty *</Form.Label>
                    <Form.Control
                      type="text"
                      value={contract.representative_name}
                      onChange={(e) => updateContract(index, 'representative_name', e.target.value)}
                      placeholder="Tên người đại diện"
                    />
                  </Form.Group>
                </Col>
                
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Chức vụ</Form.Label>
                    <Form.Select
                      value={contract.representative_position}
                      onChange={(e) => updateContract(index, 'representative_position', e.target.value)}
                    >
                      <option value="Giám đốc">Giám đốc</option>
                      <option value="Phó Giám đốc">Phó Giám đốc</option>
                      <option value="Trưởng phòng">Trưởng phòng</option>
                      <option value="Quản lý">Quản lý</option>
                      <option value="Đại diện">Đại diện</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {/* Area and Pricing */}
              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Diện tích thuê (m²) *</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.1"
                      value={contract.area_sqm}
                      onChange={(e) => updateContract(index, 'area_sqm', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </Form.Group>
                </Col>
                
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Giá thuê/tháng (VNĐ) *</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={contract.rental_price}
                      onChange={(e) => updateContract(index, 'rental_price', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                    {contract.rental_price > 0 && (
                      <Form.Text className="text-success">
                        {formatCurrency(contract.rental_price)} VNĐ/tháng
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>
                
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Ngày bắt đầu *</Form.Label>
                    <Form.Control
                      type="date"
                      value={contract.start_date}
                      onChange={(e) => updateContract(index, 'start_date', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Ngày kết thúc *</Form.Label>
                    <Form.Control
                      type="date"
                      value={contract.end_date}
                      onChange={(e) => updateContract(index, 'end_date', e.target.value)}
                      min={contract.start_date}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Contract Terms */}
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Thông tin thanh toán</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={contract.payment_terms}
                      onChange={(e) => updateContract(index, 'payment_terms', e.target.value)}
                      placeholder="Điều kiện thanh toán, chu kỳ thanh toán..."
                    />
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Điều khoản ràng buộc</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={contract.binding_terms}
                      onChange={(e) => updateContract(index, 'binding_terms', e.target.value)}
                      placeholder="Các điều khoản đặc biệt, ràng buộc..."
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Contract Summary */}
              {contract.start_date && contract.end_date && contract.rental_price > 0 && (
                <Alert variant="light" className="mb-0">
                  <Row>
                    <Col md={3}>
                      <strong>Tổng thời hạn:</strong><br/>
                      {Math.ceil((new Date(contract.end_date) - new Date(contract.start_date)) / (1000 * 60 * 60 * 24))} ngày
                    </Col>
                    <Col md={3}>
                      <strong>Giá thuê/m²/tháng:</strong><br/>
                      {contract.area_sqm > 0 ? formatCurrency(Math.round(contract.rental_price / contract.area_sqm)) : 0} VNĐ
                    </Col>
                    <Col md={3}>
                      <strong>Tổng giá trị hợp đồng:</strong><br/>
                      <span className="text-success">
                        {formatCurrency(monthlyRent * Math.ceil((new Date(contract.end_date) - new Date(contract.start_date)) / (1000 * 60 * 60 * 24 * 30)))} VNĐ
                      </span>
                    </Col>
                    <Col md={3}>
                      <strong>Trạng thái:</strong><br/>
                      <Badge bg={contract.is_active ? "success" : "secondary"}>
                        {contract.is_active ? "Đang hoạt động" : "Không hoạt động"}
                      </Badge>
                    </Col>
                  </Row>
                </Alert>
              )}

              {/* Validation Errors */}
              {contractErrors.length > 0 && (
                <Alert variant="danger" className="mt-3">
                  <strong>Vui lòng kiểm tra:</strong>
                  <ul className="mb-0 mt-2">
                    {contractErrors.map((error, errorIndex) => (
                      <li key={errorIndex}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              )}
            </Card.Body>
          </Card>
        );
      })}

      {contracts.length === 0 && companies.length > 0 && (
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Chưa có hợp đồng nào. Vui lòng thêm ít nhất một hợp đồng để hoàn tất thông tin khách hàng.
        </Alert>
      )}
    </div>
  );
}

export default ContractInfoTab;