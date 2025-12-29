/**
 * Project Edit Page - KHO MVG
 * Form chỉnh sửa thông tin dự án
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Form, Button, Card, Alert, Breadcrumb, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import axios from 'axios';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import GoogleMapWrapper from '../../components/Map/GoogleMapWrapper';

function ProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showNotification } = useNotification();

  const defaultCenter = { lat: 10.9045, lng: 106.7213 };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [addressSearch, setAddressSearch] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    address: '',
    province: '',
    ward: '',
    latitude: '',
    longitude: '',
    status: 'operational',
    total_area: '',
    project_director_name: '',
    project_director_phone: '',
    project_director_email: '',
    project_director_position: '',
    project_manager_name: '',
    project_manager_phone: '',
    project_manager_email: '',
    project_manager_position: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    owner_tax_code: '',
    owner_address: ''
  });

  useEffect(() => {
    if (!hasPermission('project_update')) {
      setError('Bạn không có quyền chỉnh sửa dự án');
      return;
    }

    const fetchProject = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const resp = await axios.get(`/api/projects/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (resp.data?.success) {
          const p = resp.data.data.project;
          setFormData({
            name: p.name || '',
            code: p.code || '',
            description: p.description || '',
            address: p.address || '',
            province: p.province || '',
            ward: p.ward || '',
            latitude: p.latitude ? p.latitude.toString() : '',
            longitude: p.longitude ? p.longitude.toString() : '',
            status: p.status || 'planning',
            total_area: p.total_area ? p.total_area.toString() : '',
            project_director_name: p.project_director?.name || '',
            project_director_phone: p.project_director?.phone || '',
            project_director_email: p.project_director?.email || '',
            project_director_position: p.project_director?.position || '',
            project_manager_name: p.project_manager?.name || '',
            project_manager_phone: p.project_manager?.phone || '',
            project_manager_email: p.project_manager?.email || '',
            project_manager_position: p.project_manager?.position || '',
            owner_name: p.owner_info?.name || '',
            owner_phone: p.owner_info?.phone || '',
            owner_email: p.owner_info?.email || '',
            owner_tax_code: p.owner_info?.tax_code || '',
            owner_address: p.owner_info?.address || ''
          });

          setMapCenter({
            lat: p.latitude || defaultCenter.lat,
            lng: p.longitude || defaultCenter.lng
          });
        } else {
          setError(resp.data?.message || 'Không tải được dự án');
        }
      } catch (err) {
        console.error('Load project failed', err);
        setError('Không tải được dự án');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, hasPermission]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMapClick = (lat, lng) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString()
    }));
    setMapCenter({ lat, lng });
    setShowMapModal(false);
  };

  const handleAddressSearch = async (e) => {
    e.preventDefault();
    if (!addressSearch.trim()) return;

    try {
      showNotification('Chức năng tìm địa chỉ cần cấu hình API geocoding (Google/Nominatim).', 'info');
    } catch (err) {
      showNotification('Lỗi tìm kiếm địa chỉ', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        throw new Error('Tên dự án là bắt buộc');
      }
      if (!formData.code.trim()) {
        throw new Error('Mã dự án là bắt buộc');
      }
      if (!formData.address.trim()) {
        throw new Error('Địa chỉ là bắt buộc');
      }

      const token = localStorage.getItem('token');
      const resp = await axios.put(
        `/api/projects/${id}`,
        formData,
        { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      if (!resp.data?.success) {
        throw new Error(resp.data?.message || 'Lỗi cập nhật dự án');
      }
      showNotification('Dự án đã được cập nhật thành công!', 'success');
      navigate(`/projects/${id}`);
    } catch (err) {
      setError(err.message);
      showNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/projects/${id}`);
  };

  if (loading) {
    return <LoadingSpinner text="Đang tải thông tin dự án..." />;
  }

  return (
    <div className="p-4">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item onClick={() => navigate('/projects')} style={{ cursor: 'pointer' }}>
          <i className="fas fa-home me-2"></i>Dự án
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate(`/projects/${id}`)} style={{ cursor: 'pointer' }}>
          {formData.name || 'Chi tiết dự án'}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Chỉnh sửa</Breadcrumb.Item>
      </Breadcrumb>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError(null)} dismissible>
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </Alert>
      )}

      <Row>
        <Col lg={8}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="fas fa-edit me-2 text-primary"></i>
                Chỉnh sửa Dự án: {formData.name || '---'}
              </h5>
            </Card.Header>

            <Card.Body className="p-4">
              <Form onSubmit={handleSubmit}>
                {/* Thông tin cơ bản */}
                <div className="mb-4">
                  <h6 className="text-muted mb-3">
                    <i className="fas fa-info-circle me-2"></i>
                    Thông tin cơ bản
                  </h6>
                  
                  <Row>
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Tên dự án <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Nhập tên dự án"
                          required
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Mã dự án <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          name="code"
                          value={formData.code}
                          onChange={handleInputChange}
                          placeholder="Nhập mã dự án"
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Mô tả</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Nhập mô tả dự án"
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Trạng thái</Form.Label>
                        <Form.Select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                        >
                          <option value="planning">Lên kế hoạch</option>
                          <option value="construction">Xây dựng</option>
                          <option value="operational">Hoạt động</option>
                          <option value="maintenance">Bảo trì</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Tổng diện tích (m²)</Form.Label>
                        <Form.Control
                          type="number"
                          name="total_area"
                          value={formData.total_area}
                          onChange={handleInputChange}
                          placeholder="Nhập tổng diện tích"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Thông tin địa chỉ */}
                <hr />
                <div className="mb-4">
                  <h6 className="text-muted mb-3">
                    <i className="fas fa-map-marker-alt me-2"></i>
                    Thông tin địa chỉ
                  </h6>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Địa chỉ <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Nhập địa chỉ"
                      required
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Tỉnh/Thành phố</Form.Label>
                        <Form.Control
                          type="text"
                          name="province"
                          value={formData.province}
                          onChange={handleInputChange}
                          placeholder="Tỉnh/Thành phố"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Phường/Xã</Form.Label>
                        <Form.Control
                          type="text"
                          name="ward"
                          value={formData.ward}
                          onChange={handleInputChange}
                          placeholder="Phường/Xã"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Chọn vị trí trên bản đồ</Form.Label>
                    <div className="d-flex gap-2 align-items-center">
                      <div className="flex-grow-1">
                        <Form.Control
                          type="text"
                          readOnly
                          value={`${formData.latitude}, ${formData.longitude}`}
                          placeholder="Tọa độ sẽ được cập nhật khi chọn trên bản đồ"
                        />
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => setShowMapModal(true)}
                      >
                        <i className="fas fa-map-pin me-2"></i>
                        Chọn trên bản đồ
                      </Button>
                    </div>
                    <small className="text-muted d-block mt-2">
                      💡 Click nút để mở bản đồ, sau đó click trên bản đồ để chọn vị trí dự án
                    </small>
                  </Form.Group>
                </div>

                {/* Giám đốc dự án */}
                <hr />
                <div className="mb-4">
                  <h6 className="text-muted mb-3">
                    <i className="fas fa-user-tie me-2"></i>
                    Giám đốc dự án
                  </h6>

                  <Row>
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Tên</Form.Label>
                        <Form.Control
                          type="text"
                          name="project_director_name"
                          value={formData.project_director_name}
                          onChange={handleInputChange}
                          placeholder="Tên giám đốc"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Chức vụ</Form.Label>
                        <Form.Control
                          type="text"
                          name="project_director_position"
                          value={formData.project_director_position}
                          onChange={handleInputChange}
                          placeholder="Chức vụ"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Email</Form.Label>
                        <Form.Control
                          type="email"
                          name="project_director_email"
                          value={formData.project_director_email}
                          onChange={handleInputChange}
                          placeholder="Email"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Điện thoại</Form.Label>
                        <Form.Control
                          type="tel"
                          name="project_director_phone"
                          value={formData.project_director_phone}
                          onChange={handleInputChange}
                          placeholder="Điện thoại"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Người quản lý dự án */}
                <hr />
                <div className="mb-4">
                  <h6 className="text-muted mb-3">
                    <i className="fas fa-user me-2"></i>
                    Người quản lý dự án
                  </h6>

                  <Row>
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Tên</Form.Label>
                        <Form.Control
                          type="text"
                          name="project_manager_name"
                          value={formData.project_manager_name}
                          onChange={handleInputChange}
                          placeholder="Tên quản lý"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Chức vụ</Form.Label>
                        <Form.Control
                          type="text"
                          name="project_manager_position"
                          value={formData.project_manager_position}
                          onChange={handleInputChange}
                          placeholder="Chức vụ"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Email</Form.Label>
                        <Form.Control
                          type="email"
                          name="project_manager_email"
                          value={formData.project_manager_email}
                          onChange={handleInputChange}
                          placeholder="Email"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Điện thoại</Form.Label>
                        <Form.Control
                          type="tel"
                          name="project_manager_phone"
                          value={formData.project_manager_phone}
                          onChange={handleInputChange}
                          placeholder="Điện thoại"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Chủ sở hữu */}
                <hr />
                <div className="mb-4">
                  <h6 className="text-muted mb-3">
                    <i className="fas fa-building me-2"></i>
                    Chủ sở hữu/Công ty
                  </h6>

                  <Row>
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Tên công ty</Form.Label>
                        <Form.Control
                          type="text"
                          name="owner_name"
                          value={formData.owner_name}
                          onChange={handleInputChange}
                          placeholder="Tên công ty"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Mã số thuế</Form.Label>
                        <Form.Control
                          type="text"
                          name="owner_tax_code"
                          value={formData.owner_tax_code}
                          onChange={handleInputChange}
                          placeholder="Mã số thuế"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Địa chỉ công ty</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="owner_address"
                      value={formData.owner_address}
                      onChange={handleInputChange}
                      placeholder="Địa chỉ công ty"
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Email</Form.Label>
                        <Form.Control
                          type="email"
                          name="owner_email"
                          value={formData.owner_email}
                          onChange={handleInputChange}
                          placeholder="Email"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold">Điện thoại</Form.Label>
                        <Form.Control
                          type="tel"
                          name="owner_phone"
                          value={formData.owner_phone}
                          onChange={handleInputChange}
                          placeholder="Điện thoại"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Buttons */}
                <div className="d-flex gap-2 pt-3 border-top">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={saving}
                    size="lg"
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Lưu thay đổi
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline-secondary"
                    onClick={handleCancel}
                    disabled={saving}
                    size="lg"
                  >
                    <i className="fas fa-times me-2"></i>
                    Hủy
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Info Sidebar */}
        <Col lg={4}>
          <Card className="shadow-sm border-0 mb-3">
            <Card.Header className="bg-light border-bottom">
              <h6 className="mb-0">
                <i className="fas fa-lightbulb me-2 text-warning"></i>
                Gợi ý
              </h6>
            </Card.Header>
            <Card.Body className="small text-muted">
              <ul className="mb-0">
                <li className="mb-2">Tất cả trường có dấu <span className="text-danger">*</span> là bắt buộc</li>
                <li className="mb-2">Tọa độ GPS được sử dụng để hiển thị trên bản đồ</li>
                <li className="mb-2">Thay đổi sẽ được lưu khi bạn nhấp "Lưu thay đổi"</li>
                <li>Bạn có thể quay lại trang chi tiết bằng nút "Hủy"</li>
              </ul>
            </Card.Body>
          </Card>

          <Card className="shadow-sm border-0">
            <Card.Header className="bg-light border-bottom">
              <h6 className="mb-0">
                <i className="fas fa-info-circle me-2 text-info"></i>
                Thông tin hiện tại
              </h6>
            </Card.Header>
            <Card.Body className="small">
              <div className="mb-2">
                <span className="text-muted">Mã:</span> <strong>{formData.code}</strong>
              </div>
              <div className="mb-2">
                <span className="text-muted">Tên:</span> <strong>{formData.name}</strong>
              </div>
              <div className="mb-2">
                <span className="text-muted">Tạo lúc:</span> <strong>15/01/2024</strong>
              </div>
              <div>
                <span className="text-muted">Tạo bởi:</span> <strong>admin</strong>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Map Modal */}
      <Modal show={showMapModal} onHide={() => setShowMapModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-map-marked-alt me-2"></i>
            Chọn vị trí dự án
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
          {/* Address Search */}
          <Form onSubmit={handleAddressSearch} className="mb-3">
            <Form.Group>
              <Form.Control
                type="text"
                placeholder="Nhập địa chỉ (vd: Bình Dương, Hà Nội, TP HCM)..."
                value={addressSearch}
                onChange={(e) => setAddressSearch(e.target.value)}
              />
            </Form.Group>
            <div className="d-flex gap-2">
              <Button variant="primary" type="submit" size="sm">
                <i className="fas fa-search me-1"></i>
                Tìm kiếm
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setAddressSearch('')}
              >
                Xóa
              </Button>
              <small className="text-muted ms-auto align-self-center">
                💡 Gợi ý: Bình Dương, Hà Nội, TP HCM, Đà Nẵng
              </small>
            </div>
          </Form>

          {/* Map Container */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <GoogleMapWrapper
              center={mapCenter}
              onMapClick={handleMapClick}
              markerPosition={mapCenter}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <span className="text-muted small me-auto">
            Click vào vị trí trên bản đồ để chọn tọa độ
          </span>
          <Button variant="secondary" onClick={() => setShowMapModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ProjectEdit;
