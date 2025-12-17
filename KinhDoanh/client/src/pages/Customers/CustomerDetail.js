/**
 * Customer Detail Page - KHO MVG
 * Chi tiết khách hàng với lịch sử hợp đồng
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Tab, Nav, Table, Modal, Alert, Form } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    const fetchCustomer = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const resp = await axios.get(`/api/customers/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (resp.data?.success) {
          setCustomer(resp.data.data.customer);
          setContracts(resp.data.data.contracts || []);
        } else {
          showError(resp.data?.message || 'Không tải được khách hàng');
          setCustomer(null);
          setContracts([]);
        }
      } catch (err) {
        console.error('Load customer failed', err);
        showError('Không tải được khách hàng');
        setCustomer(null);
        setContracts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id, showError]);

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

  const getContractStatusBadge = (status, daysUntilExpiry) => {
    if (status === 'expired') {
      return <Badge bg="danger">Hết hạn</Badge>;
    }
    if (status === 'terminated') {
      return <Badge bg="secondary">Đã thanh lý</Badge>;
    }
    if (status === 'active') {
      if (daysUntilExpiry <= 30) {
        return <Badge bg="warning">Sắp hết hạn</Badge>;
      }
      return <Badge bg="success">Hiệu lực</Badge>;
    }
    if (status === 'draft') {
      return <Badge bg="info">Bản nháp</Badge>;
    }
    return <Badge bg="secondary">{status}</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount).replace('₫', 'đ');
  };

  const formatArea = (area) => {
    return new Intl.NumberFormat('vi-VN').format(area) + ' m²';
  };

  const calculateTotalRevenue = () => {
    return contracts
      .filter(c => c.status === 'active')
      .reduce((sum, contract) => sum + (contract.rental_price * contract.zone_area), 0);
  };

  const handleCreateContract = () => {
    if (!hasPermission('contract_create')) {
      showError('Bạn không có quyền tạo hợp đồng mới');
      return;
    }
    navigate(`/contracts/create?customer=${id}`);
  };

  const handleViewContract = (contractId) => {
    navigate(`/contracts/${contractId}`);
  };

  if (loading) {
    return <LoadingSpinner text="Đang tải thông tin khách hàng..." />;
  }

  if (!customer) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="text-center">
          <h4>Không tìm thấy khách hàng</h4>
          <p>Khách hàng với ID {id} không tồn tại hoặc đã bị xóa.</p>
          <Button variant="primary" onClick={() => navigate('/customers')}>
            Quay lại danh sách khách hàng
          </Button>
        </Alert>
      </Container>
    );
  }

  const activeContracts = contracts.filter(c => c.status === 'active');
  const expiringContracts = activeContracts.filter(c => c.days_until_expiry <= 30);

  return (
    <Container fluid className="p-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="d-flex align-items-center mb-2">
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="me-3"
                  onClick={() => navigate('/customers')}
                >
                  <i className="fas fa-arrow-left"></i>
                </Button>
                <div>
                  <h2 className="mb-0">{customer.company_name || customer.contact_person}</h2>
                  <div className="d-flex align-items-center mt-1">
                    <span className="text-muted me-3">Mã: {customer.customer_code}</span>
                    {getCreditRatingBadge(customer.credit_rating)}
                    <Badge bg={customer.customer_type === 'company' ? 'info' : 'secondary'} className="ms-2">
                      {customer.customer_type === 'company' ? 'Doanh nghiệp' : 'Cá nhân'}
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-muted mb-0">
                <i className="fas fa-user me-2"></i>{customer.contact_person}
                <span className="ms-3">
                  <i className="fas fa-phone me-2"></i>{customer.phone}
                </span>
                {customer.email && (
                  <span className="ms-3">
                    <i className="fas fa-envelope me-2"></i>{customer.email}
                  </span>
                )}
              </p>
            </div>
            
            <div className="d-flex gap-2">
              {hasPermission('customer_update') && (
                <Button variant="outline-primary">
                  <i className="fas fa-edit me-2"></i>
                  Chỉnh sửa
                </Button>
              )}
              {hasPermission('contract_create') && (
                <Button variant="primary" onClick={handleCreateContract}>
                  <i className="fas fa-plus me-2"></i>
                  Tạo hợp đồng
                </Button>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Tổng hợp đồng</h6>
                  <h4 className="mb-0 text-primary">{contracts.length}</h4>
                </div>
                <i className="fas fa-file-contract fa-2x text-primary opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Đang hiệu lực</h6>
                  <h4 className="mb-0 text-success">{activeContracts.length}</h4>
                </div>
                <i className="fas fa-check-circle fa-2x text-success opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Sắp hết hạn</h6>
                  <h4 className="mb-0 text-warning">{expiringContracts.length}</h4>
                </div>
                <i className="fas fa-exclamation-triangle fa-2x text-warning opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Doanh thu/tháng</h6>
                  <h4 className="mb-0 text-info">{formatCurrency(calculateTotalRevenue())}</h4>
                </div>
                <i className="fas fa-chart-line fa-2x text-info opacity-25"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0">
          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Nav variant="tabs" className="border-0">
              <Nav.Item>
                <Nav.Link eventKey="info">
                  <i className="fas fa-info-circle me-2"></i>
                  Thông tin chi tiết
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="contracts">
                  <i className="fas fa-file-contract me-2"></i>
                  Hợp đồng ({contracts.length})
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="documents">
                  <i className="fas fa-folder me-2"></i>
                  Hồ sơ tài liệu
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="activities">
                  <i className="fas fa-history me-2"></i>
                  Lịch sử hoạt động
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Tab.Container>
        </Card.Header>

        <Card.Body>
          <Tab.Container activeKey={activeTab}>
            <Tab.Content>
              {/* Customer Info Tab */}
              <Tab.Pane eventKey="info">
                <Row>
                  <Col md={6}>
                    <h5 className="mb-3">Thông tin cơ bản</h5>
                    <div className="info-group">
                      <div className="info-item">
                        <strong>Mã khách hàng:</strong> {customer.customer_code}
                      </div>
                      {customer.company_name && (
                        <div className="info-item">
                          <strong>Tên công ty:</strong> {customer.company_name}
                        </div>
                      )}
                      <div className="info-item">
                        <strong>Người liên hệ:</strong> {customer.contact_person}
                      </div>
                      <div className="info-item">
                        <strong>Điện thoại:</strong> {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="info-item">
                          <strong>Email:</strong> {customer.email}
                        </div>
                      )}
                      <div className="info-item">
                        <strong>Địa chỉ:</strong> {customer.address}
                      </div>
                      <div className="info-item">
                        <strong>Loại khách hàng:</strong> 
                        <Badge bg={customer.customer_type === 'company' ? 'info' : 'secondary'} className="ms-2">
                          {customer.customer_type === 'company' ? 'Doanh nghiệp' : 'Cá nhân'}
                        </Badge>
                      </div>
                      <div className="info-item">
                        <strong>Xếp hạng tín dụng:</strong> {getCreditRatingBadge(customer.credit_rating)}
                      </div>
                    </div>
                  </Col>
                  
                  <Col md={6}>
                    {customer.customer_type === 'company' && (
                      <>
                        <h5 className="mb-3">Thông tin doanh nghiệp</h5>
                        <div className="info-group">
                          <div className="info-item">
                            <strong>Mã số thuế:</strong> {customer.tax_code || 'Chưa có'}
                          </div>
                          <div className="info-item">
                            <strong>Giấy phép kinh doanh:</strong> {customer.business_license || 'Chưa có'}
                          </div>
                        </div>
                      </>
                    )}

                    {customer.bank_info && (
                      <>
                        <h5 className="mb-3 mt-4">Thông tin ngân hàng</h5>
                        <div className="info-group">
                          <div className="info-item">
                            <strong>Ngân hàng:</strong> {customer.bank_info.bank_name}
                          </div>
                          <div className="info-item">
                            <strong>Số tài khoản:</strong> {customer.bank_info.account_number}
                          </div>
                          <div className="info-item">
                            <strong>Chủ tài khoản:</strong> {customer.bank_info.account_holder}
                          </div>
                        </div>
                      </>
                    )}

                    {customer.notes && (
                      <>
                        <h5 className="mb-3 mt-4">Ghi chú</h5>
                        <p className="text-muted">{customer.notes}</p>
                      </>
                    )}
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Contracts Tab */}
              <Tab.Pane eventKey="contracts">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Danh sách hợp đồng</h5>
                  {hasPermission('contract_create') && (
                    <Button variant="primary" size="sm" onClick={handleCreateContract}>
                      <i className="fas fa-plus me-2"></i>
                      Tạo hợp đồng mới
                    </Button>
                  )}
                </div>

                {expiringContracts.length > 0 && (
                  <Alert variant="warning" className="mb-3">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    <strong>Cảnh báo:</strong> Có {expiringContracts.length} hợp đồng sắp hết hạn trong 30 ngày tới.
                  </Alert>
                )}

                <div className="table-responsive">
                  <Table hover>
                    <thead className="bg-light">
                      <tr>
                        <th>Hợp đồng</th>
                        <th>Dự án</th>
                        <th>Zone</th>
                        <th>Thời hạn</th>
                        <th>Giá thuê</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.length > 0 ? (
                        contracts.map((contract) => (
                          <tr key={contract.id}>
                            <td>
                              <div>
                                <div className="fw-bold">{contract.contract_number}</div>
                                <small className="text-muted">
                                  {contract.payment_cycle === 'monthly' ? 'Tháng' : 
                                   contract.payment_cycle === 'quarterly' ? 'Quý' : 'Năm'}
                                </small>
                              </div>
                            </td>
                            <td>
                              <div>
                                <div>{contract.project_name}</div>
                                <small className="text-muted">{contract.project_code}</small>
                              </div>
                            </td>
                            <td>
                              <div>
                                <div className="fw-medium">{contract.zone_code}</div>
                                <small className="text-muted">{formatArea(contract.zone_area)}</small>
                              </div>
                            </td>
                            <td>
                              <div>
                                <div>
                                  {new Date(contract.start_date).toLocaleDateString('vi-VN')} - 
                                  {new Date(contract.end_date).toLocaleDateString('vi-VN')}
                                </div>
                                {contract.status === 'active' && contract.days_until_expiry > 0 && (
                                  <small className={`${contract.days_until_expiry <= 30 ? 'text-warning' : 'text-muted'}`}>
                                    Còn {contract.days_until_expiry} ngày
                                  </small>
                                )}
                              </div>
                            </td>
                            <td>
                              <div>
                                <div className="fw-bold">
                                  {formatCurrency(contract.rental_price)}/m²
                                </div>
                                <small className="text-muted">
                                  Tổng: {formatCurrency(contract.rental_price * contract.zone_area)}/tháng
                                </small>
                              </div>
                            </td>
                            <td>{getContractStatusBadge(contract.status, contract.days_until_expiry)}</td>
                            <td>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleViewContract(contract.id)}
                              >
                                <i className="fas fa-eye"></i>
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center py-4">
                            <div className="text-muted">
                              <i className="fas fa-file-contract fa-2x mb-3"></i>
                              <p>Chưa có hợp đồng nào</p>
                              {hasPermission('contract_create') && (
                                <Button variant="primary" onClick={handleCreateContract}>
                                  Tạo hợp đồng đầu tiên
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Tab.Pane>

              {/* Documents Tab */}
              <Tab.Pane eventKey="documents">
                <div className="text-center py-5">
                  <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
                  <h5>Hồ sơ tài liệu</h5>
                  <p className="text-muted">
                    Quản lý các tài liệu liên quan đến khách hàng
                  </p>
                  <Alert variant="info">
                    <strong>Tính năng đang phát triển:</strong>
                    <br />- Upload và quản lý hợp đồng
                    <br />- Lưu trữ chứng từ thanh toán
                    <br />- Quản lý giấy tờ pháp lý
                  </Alert>
                </div>
              </Tab.Pane>

              {/* Activities Tab */}
              <Tab.Pane eventKey="activities">
                <div className="text-center py-5">
                  <i className="fas fa-history fa-3x text-muted mb-3"></i>
                  <h5>Lịch sử hoạt động</h5>
                  <p className="text-muted">
                    Theo dõi các hoạt động và thay đổi của khách hàng
                  </p>
                  <Alert variant="info">
                    <strong>Tính năng đang phát triển:</strong>
                    <br />- Log các thao tác trên hợp đồng
                    <br />- Lịch sử thanh toán
                    <br />- Thay đổi thông tin khách hàng
                  </Alert>
                </div>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>

      <style jsx>{`
        .info-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .info-item {
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .info-item strong {
          color: #495057;
          display: inline-block;
          min-width: 140px;
        }
      `}</style>
    </Container>
  );
}

export default CustomerDetail;