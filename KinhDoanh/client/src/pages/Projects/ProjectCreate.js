/**
 * Project Create Page - KHO MVG
 * Form tạo dự án mới với đầy đủ các trường nhập
 */

import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Form, Button, Card, Alert, Breadcrumb, 
  Modal, Tab, Nav, InputGroup, FormText
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import GoogleMapWrapper from '../../components/Map/GoogleMapWrapper';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function ProjectCreate() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 10.8231, lng: 106.6297 }); // TP.HCM center
  const [geocoding, setGeocoding] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Form data với tất cả các trường
  const [formData, setFormData] = useState({
    // Thông tin cơ bản
    name: '',
    code: '',
    description: '',
    status: 'planning',
    
    // Địa chỉ
    address: '',
    province: '',
    district: '',
    ward: '',
    latitude: '',
    longitude: '',
    
    // Diện tích
    total_area: '',
    available_area: '',
    fixed_area: '',
    
    // Thông tin chủ sở hữu
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    owner_tax_code: '',
    owner_address: '',
    owner_representative: '',
    
    // Giấy tờ pháp lý
    business_license: '',
    construction_permit: '',
    fire_safety_cert: '',
    environmental_cert: '',
    land_use_cert: '',
    other_documents: '',
    // Trường hỗ trợ geocoding
    address_search: ''
  });

  // Danh sách tỉnh/thành phố Việt Nam
  const provinces = [
    'An Giang', 'Bà Rịa - Vũng Tàu', 'Bạc Liêu', 'Bắc Giang', 'Bắc Kạn',
    'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
    'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông',
    'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang',
    'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hải Phòng', 'Hậu Giang',
    'Hòa Bình', 'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum',
    'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An',
    'Nam Định', 'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ',
    'Phú Yên', 'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh',
    'Quảng Trị', 'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình',
    'Thái Nguyên', 'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang',
    'TP. Hồ Chí Minh', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long',
    'Vĩnh Phúc', 'Yên Bái'
  ];

  const statusOptions = [
    { value: 'planning', label: 'Đang lập kế hoạch' },
    { value: 'construction', label: 'Đang xây dựng' },
    { value: 'operational', label: 'Đang vận hành' },
    { value: 'maintenance', label: 'Bảo trì' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Xóa lỗi khi người dùng nhập
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
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

  const handleAddressSearchChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, address_search: value }));
  };

  // Gợi ý địa chỉ (Google Places Autocomplete)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const query = formData.address_search.trim();
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!query || query.length < 3 || !apiKey) {
      setAddressSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setSuggestLoading(true);
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&language=vi&types=geocode&region=VN&components=country:VN`,
          { signal: controller.signal }
        );
        const data = await resp.json();
        if (data.status === 'OK' && data.predictions) {
          setAddressSuggestions(
            data.predictions.map(p => ({
              description: p.description,
              place_id: p.place_id
            }))
          );
        } else {
          setAddressSuggestions([]);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Autocomplete error', err);
          setAddressSuggestions([]);
        }
      } finally {
        setSuggestLoading(false);
      }
    }, 300); // debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData.address_search]);

  const noPermission = !hasPermission('project_create');
  if (noPermission) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Không có quyền truy cập</Alert.Heading>
          <p>Bạn không có quyền tạo dự án mới. Vui lòng liên hệ quản trị viên.</p>
          <Button variant="primary" onClick={() => navigate('/projects')}>
            Quay lại danh sách
          </Button>
        </Alert>
      </Container>
    );
  }

  const handleAddressSearch = async () => {
    if (!formData.address_search.trim()) return;
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      showNotification('Thiếu Google Maps API key. Vui lòng cấu hình REACT_APP_GOOGLE_MAPS_API_KEY.', 'warning');
      return;
    }
    try {
      setGeocoding(true);
      const encoded = encodeURIComponent(formData.address_search.trim());
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}&language=vi&region=VN&components=country:VN`
      );
      const data = await resp.json();
      if (data.status !== 'OK' || !data.results?.length) {
        showNotification('Không tìm thấy địa chỉ. Vui lòng thử lại.', 'warning');
        return;
      }
      const result = data.results[0];
      const loc = result.geometry.location;
      const getPart = (types) => result.address_components?.find(c => types.some(t => c.types.includes(t)))?.long_name || '';

      setMapCenter({ lat: loc.lat, lng: loc.lng });
      setFormData(prev => ({
        ...prev,
        address: result.formatted_address || prev.address,
        latitude: loc.lat.toString(),
        longitude: loc.lng.toString(),
        province: prev.province || getPart(['administrative_area_level_1']),
        district: prev.district || getPart(['administrative_area_level_2']),
        ward: prev.ward || getPart(['administrative_area_level_3', 'sublocality']),
      }));
      showNotification('Đã định vị địa chỉ và cập nhật tọa độ.', 'success');
    } catch (err) {
      console.error('Geocoding error', err);
      showNotification('Không tìm thấy địa chỉ. Vui lòng thử lại.', 'danger');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSelectSuggestion = async (suggestion) => {
    setFormData(prev => ({ ...prev, address_search: suggestion.description }));
    setAddressSuggestions([]);
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    try {
      setGeocoding(true);
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?place_id=${suggestion.place_id}&key=${apiKey}&language=vi&region=VN&components=country:VN`
      );
      const data = await resp.json();
      if (data.status !== 'OK' || !data.results?.length) {
        showNotification('Không tìm thấy địa chỉ. Vui lòng thử lại.', 'warning');
        return;
      }
      const result = data.results[0];
      const loc = result.geometry.location;
      const getPart = (types) => result.address_components?.find(c => types.some(t => c.types.includes(t)))?.long_name || '';

      setMapCenter({ lat: loc.lat, lng: loc.lng });
      setFormData(prev => ({
        ...prev,
        address: result.formatted_address || prev.address,
        latitude: loc.lat.toString(),
        longitude: loc.lng.toString(),
        province: prev.province || getPart(['administrative_area_level_1']),
        district: prev.district || getPart(['administrative_area_level_2']),
        ward: prev.ward || getPart(['administrative_area_level_3', 'sublocality']),
      }));
      showNotification('Đã định vị địa chỉ và cập nhật tọa độ.', 'success');
    } catch (err) {
      console.error('Select suggestion error', err);
      showNotification('Không tìm thấy địa chỉ. Vui lòng thử lại.', 'danger');
    } finally {
      setGeocoding(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Thông tin cơ bản
    if (!formData.name.trim()) {
      newErrors.name = 'Tên dự án là bắt buộc';
    }
    if (!formData.code.trim()) {
      newErrors.code = 'Mã dự án là bắt buộc';
    } else if (formData.code.length > 50) {
      newErrors.code = 'Mã dự án không được quá 50 ký tự';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Địa chỉ là bắt buộc';
    }
    if (!formData.province) {
      newErrors.province = 'Tỉnh/Thành phố là bắt buộc';
    }

    // Diện tích
    if (!formData.total_area || parseFloat(formData.total_area) <= 0) {
      newErrors.total_area = 'Diện tích tổng phải lớn hơn 0';
    }
    if (formData.available_area && parseFloat(formData.available_area) < 0) {
      newErrors.available_area = 'Diện tích có sẵn không được âm';
    }
    if (formData.fixed_area && parseFloat(formData.fixed_area) < 0) {
      newErrors.fixed_area = 'Diện tích cố định không được âm';
    }

    // Kiểm tra logic diện tích
    if (formData.total_area && formData.available_area && formData.fixed_area) {
      const total = parseFloat(formData.total_area);
      const available = parseFloat(formData.available_area);
      const fixed = parseFloat(formData.fixed_area);
      if (available + fixed > total) {
        newErrors.available_area = 'Tổng diện tích có sẵn và cố định không được vượt quá diện tích tổng';
      }
    }

    // Thông tin chủ sở hữu
    if (!formData.owner_name.trim()) {
      newErrors.owner_name = 'Tên chủ sở hữu là bắt buộc';
    }
    if (formData.owner_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.owner_email)) {
      newErrors.owner_email = 'Email không hợp lệ';
    }
    if (formData.owner_phone && !/^[0-9]{10,11}$/.test(formData.owner_phone.replace(/[-\s]/g, ''))) {
      newErrors.owner_phone = 'Số điện thoại không hợp lệ (10-11 số)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showNotification('Vui lòng kiểm tra lại các trường bắt buộc', 'error');
      setActiveTab('basic'); // Chuyển về tab đầu tiên nếu có lỗi
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      // Chuẩn bị dữ liệu
      const projectData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        address: formData.address.trim(),
        province: formData.province,
        district: formData.district.trim(),
        ward: formData.ward.trim(),
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        total_area: parseFloat(formData.total_area),
        available_area: formData.available_area ? parseFloat(formData.available_area) : parseFloat(formData.total_area),
        fixed_area: formData.fixed_area ? parseFloat(formData.fixed_area) : 0,
        status: formData.status,
        owner_info: {
          name: formData.owner_name.trim(),
          phone: formData.owner_phone.trim(),
          email: formData.owner_email.trim(),
          tax_code: formData.owner_tax_code.trim(),
          address: formData.owner_address.trim(),
          representative: formData.owner_representative.trim()
        },
        legal_documents: {
          business_license: formData.business_license.trim(),
          construction_permit: formData.construction_permit.trim(),
          fire_safety_cert: formData.fire_safety_cert.trim(),
          environmental_cert: formData.environmental_cert.trim(),
          land_use_cert: formData.land_use_cert.trim(),
          other: formData.other_documents.trim()
        }
      };

      const response = await axios.post(`${API_BASE}/projects`, projectData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        showNotification('Tạo dự án thành công!', 'success');
        navigate(`/projects/${response.data.data.id}`);
      } else {
        throw new Error(response.data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      let errorMessage = 'Có lỗi xảy ra khi tạo dự án';
      
      if (error.response) {
        if (error.response.status === 409) {
          errorMessage = 'Mã dự án đã tồn tại. Vui lòng chọn mã khác.';
          setErrors({ code: errorMessage });
        } else if (error.response.data && error.response.data.errors) {
          const apiErrors = {};
          error.response.data.errors.forEach(err => {
            apiErrors[err.param || err.path] = err.msg || err.message;
          });
          setErrors(apiErrors);
          errorMessage = 'Vui lòng kiểm tra lại các trường nhập';
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Bạn có chắc muốn hủy? Dữ liệu chưa lưu sẽ bị mất.')) {
      navigate('/projects');
    }
  };

  return (
    <Container fluid className="mt-4">
      <Breadcrumb>
        <Breadcrumb.Item href="/projects">Dự án</Breadcrumb.Item>
        <Breadcrumb.Item active>Tạo dự án mới</Breadcrumb.Item>
      </Breadcrumb>

      <Row>
        <Col>
          <Card>
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                Tạo dự án mới
              </h4>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
                  <Nav variant="tabs" className="mb-4">
                    <Nav.Item>
                      <Nav.Link eventKey="basic">
                        <i className="bi bi-info-circle me-2"></i>
                        Thông tin cơ bản
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="location">
                        <i className="bi bi-geo-alt me-2"></i>
                        Địa chỉ & Vị trí
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="area">
                        <i className="bi bi-rulers me-2"></i>
                        Diện tích
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="owner">
                        <i className="bi bi-building me-2"></i>
                        Chủ sở hữu
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="legal">
                        <i className="bi bi-file-earmark-text me-2"></i>
                        Giấy tờ pháp lý
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>

                  <Tab.Content>
                    {/* Tab 1: Thông tin cơ bản */}
                    <Tab.Pane eventKey="basic">
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              Tên dự án <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              isInvalid={!!errors.name}
                              placeholder="VD: Khu kho xưởng Bình Dương"
                              maxLength={200}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.name}
                            </Form.Control.Feedback>
                            <FormText className="text-muted">
                              Tên đầy đủ của dự án kho xưởng
                            </FormText>
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              Mã dự án <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="code"
                              value={formData.code}
                              onChange={handleInputChange}
                              isInvalid={!!errors.code}
                              placeholder="VD: KX-BD-001"
                              maxLength={50}
                              style={{ textTransform: 'uppercase' }}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.code}
                            </Form.Control.Feedback>
                            <FormText className="text-muted">
                              Mã duy nhất để nhận diện dự án (tối đa 50 ký tự)
                            </FormText>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label>Mô tả dự án</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Mô tả chi tiết về dự án, đặc điểm, tiện ích..."
                        />
                        <FormText className="text-muted">
                          Mô tả chi tiết về dự án kho xưởng
                        </FormText>
                      </Form.Group>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              Trạng thái <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Select
                              name="status"
                              value={formData.status}
                              onChange={handleInputChange}
                            >
                              {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </Form.Select>
                            <FormText className="text-muted">
                              Trạng thái hiện tại của dự án
                            </FormText>
                          </Form.Group>
                        </Col>
                      </Row>
                    </Tab.Pane>

                    {/* Tab 2: Địa chỉ & Vị trí */}
                    <Tab.Pane eventKey="location">
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Địa chỉ <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          isInvalid={!!errors.address}
                          placeholder="VD: 123 Đường ABC, Phường XYZ"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.address}
                        </Form.Control.Feedback>
                      </Form.Group>

                      <InputGroup className="mb-3">
                        <Form.Control
                          type="text"
                          placeholder="Nhập địa chỉ để tìm trên bản đồ"
                          value={formData.address_search}
                          onChange={handleAddressSearchChange}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddressSearch(); } }}
                        />
                        <Button variant="outline-primary" onClick={handleAddressSearch} disabled={geocoding}>
                          {geocoding ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <i className="bi bi-search"></i>
                          )}
                        </Button>
                      </InputGroup>
                      {addressSuggestions.length > 0 && (
                        <div className="border rounded p-2 mb-3" style={{ maxHeight: 220, overflowY: 'auto' }}>
                          {addressSuggestions.map((sug) => (
                            <div
                              key={sug.place_id}
                              role="button"
                              className="py-1 px-2 hover-bg-light"
                              onClick={() => handleSelectSuggestion(sug)}
                              style={{ cursor: 'pointer' }}
                            >
                              <i className="bi bi-geo-alt me-2 text-primary" />
                              {sug.description}
                            </div>
                          ))}
                          {suggestLoading && (
                            <div className="text-muted small mt-2">
                              <span className="spinner-border spinner-border-sm me-2" />
                              Đang tải gợi ý...
                            </div>
                          )}
                        </div>
                      )}

                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              Tỉnh/Thành phố <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Select
                              name="province"
                              value={formData.province}
                              onChange={handleInputChange}
                              isInvalid={!!errors.province}
                            >
                              <option value="">-- Chọn tỉnh/thành phố --</option>
                              {provinces.map(province => (
                                <option key={province} value={province}>
                                  {province}
                                </option>
                              ))}
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">
                              {errors.province}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Quận/Huyện</Form.Label>
                            <Form.Control
                              type="text"
                              name="district"
                              value={formData.district}
                              onChange={handleInputChange}
                              placeholder="VD: Quận 1"
                            />
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Phường/Xã</Form.Label>
                            <Form.Control
                              type="text"
                              name="ward"
                              value={formData.ward}
                              onChange={handleInputChange}
                              placeholder="VD: Phường Bến Nghé"
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Vĩ độ (Latitude)</Form.Label>
                            <InputGroup>
                              <Form.Control
                                type="number"
                                step="any"
                                name="latitude"
                                value={formData.latitude}
                                onChange={handleInputChange}
                                placeholder="VD: 10.8231"
                              />
                              <Button
                                variant="outline-secondary"
                                onClick={() => setShowMapModal(true)}
                              >
                                <i className="bi bi-map me-1"></i>
                                Chọn trên bản đồ
                              </Button>
                            </InputGroup>
                            <FormText className="text-muted">
                              Tọa độ vĩ độ của dự án (có thể chọn trên bản đồ)
                            </FormText>
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Kinh độ (Longitude)</Form.Label>
                            <Form.Control
                              type="number"
                              step="any"
                              name="longitude"
                              value={formData.longitude}
                              onChange={handleInputChange}
                              placeholder="VD: 106.6297"
                            />
                            <FormText className="text-muted">
                              Tọa độ kinh độ của dự án
                            </FormText>
                          </Form.Group>
                        </Col>
                      </Row>
                    </Tab.Pane>

                    {/* Tab 3: Diện tích */}
                    <Tab.Pane eventKey="area">
                      <Alert variant="info" className="mb-4">
                        <i className="bi bi-info-circle me-2"></i>
                        <strong>Lưu ý:</strong> Tổng diện tích = Diện tích có sẵn + Diện tích cố định
                      </Alert>

                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              Diện tích tổng (m²) <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="number"
                              step="0.01"
                              min="0"
                              name="total_area"
                              value={formData.total_area}
                              onChange={handleInputChange}
                              isInvalid={!!errors.total_area}
                              placeholder="VD: 15000"
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.total_area}
                            </Form.Control.Feedback>
                            <FormText className="text-muted">
                              Tổng diện tích của toàn bộ dự án
                            </FormText>
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Diện tích có sẵn (m²)</Form.Label>
                            <Form.Control
                              type="number"
                              step="0.01"
                              min="0"
                              name="available_area"
                              value={formData.available_area}
                              onChange={handleInputChange}
                              isInvalid={!!errors.available_area}
                              placeholder="Tự động = Diện tích tổng nếu để trống"
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.available_area}
                            </Form.Control.Feedback>
                            <FormText className="text-muted">
                              Diện tích có thể cho thuê/sử dụng
                            </FormText>
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Diện tích cố định (m²)</Form.Label>
                            <Form.Control
                              type="number"
                              step="0.01"
                              min="0"
                              name="fixed_area"
                              value={formData.fixed_area}
                              onChange={handleInputChange}
                              isInvalid={!!errors.fixed_area}
                              placeholder="VD: 2000"
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.fixed_area}
                            </Form.Control.Feedback>
                            <FormText className="text-muted">
                              Diện tích dành cho văn phòng, đường đi, khu vực chung...
                            </FormText>
                          </Form.Group>
                        </Col>
                      </Row>
                    </Tab.Pane>

                    {/* Tab 4: Chủ sở hữu */}
                    <Tab.Pane eventKey="owner">
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Tên chủ sở hữu <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="owner_name"
                          value={formData.owner_name}
                          onChange={handleInputChange}
                          isInvalid={!!errors.owner_name}
                          placeholder="VD: Công ty TNHH ABC Logistics"
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.owner_name}
                        </Form.Control.Feedback>
                      </Form.Group>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Số điện thoại</Form.Label>
                            <Form.Control
                              type="tel"
                              name="owner_phone"
                              value={formData.owner_phone}
                              onChange={handleInputChange}
                              isInvalid={!!errors.owner_phone}
                              placeholder="VD: 0123456789"
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.owner_phone}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                              type="email"
                              name="owner_email"
                              value={formData.owner_email}
                              onChange={handleInputChange}
                              isInvalid={!!errors.owner_email}
                              placeholder="VD: contact@company.com"
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.owner_email}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label>Mã số thuế</Form.Label>
                        <Form.Control
                          type="text"
                          name="owner_tax_code"
                          value={formData.owner_tax_code}
                          onChange={handleInputChange}
                          placeholder="VD: 0123456789"
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Địa chỉ chủ sở hữu</Form.Label>
                        <Form.Control
                          type="text"
                          name="owner_address"
                          value={formData.owner_address}
                          onChange={handleInputChange}
                          placeholder="Địa chỉ trụ sở chính"
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Người đại diện</Form.Label>
                        <Form.Control
                          type="text"
                          name="owner_representative"
                          value={formData.owner_representative}
                          onChange={handleInputChange}
                          placeholder="Tên người đại diện theo pháp luật"
                        />
                      </Form.Group>
                    </Tab.Pane>

                    {/* Tab 5: Giấy tờ pháp lý */}
                    <Tab.Pane eventKey="legal">
                      <Alert variant="warning" className="mb-4">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Các giấy tờ pháp lý này sẽ được lưu trữ và quản lý trong hệ thống
                      </Alert>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Giấy phép kinh doanh</Form.Label>
                            <Form.Control
                              type="text"
                              name="business_license"
                              value={formData.business_license}
                              onChange={handleInputChange}
                              placeholder="Số giấy phép kinh doanh"
                            />
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Giấy phép xây dựng</Form.Label>
                            <Form.Control
                              type="text"
                              name="construction_permit"
                              value={formData.construction_permit}
                              onChange={handleInputChange}
                              placeholder="Số giấy phép xây dựng"
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Giấy chứng nhận PCCC</Form.Label>
                            <Form.Control
                              type="text"
                              name="fire_safety_cert"
                              value={formData.fire_safety_cert}
                              onChange={handleInputChange}
                              placeholder="Số giấy chứng nhận phòng cháy chữa cháy"
                            />
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Giấy chứng nhận môi trường</Form.Label>
                            <Form.Control
                              type="text"
                              name="environmental_cert"
                              value={formData.environmental_cert}
                              onChange={handleInputChange}
                              placeholder="Số giấy chứng nhận môi trường"
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Giấy chứng nhận quyền sử dụng đất</Form.Label>
                            <Form.Control
                              type="text"
                              name="land_use_cert"
                              value={formData.land_use_cert}
                              onChange={handleInputChange}
                              placeholder="Số giấy chứng nhận quyền sử dụng đất"
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label>Giấy tờ khác</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="other_documents"
                          value={formData.other_documents}
                          onChange={handleInputChange}
                          placeholder="Các giấy tờ pháp lý khác (mỗi loại một dòng)"
                        />
                        <FormText className="text-muted">
                          Liệt kê các giấy tờ pháp lý khác, mỗi loại một dòng
                        </FormText>
                      </Form.Group>
                    </Tab.Pane>
                  </Tab.Content>
                </Tab.Container>

                <hr className="my-4" />

                <div className="d-flex justify-content-between">
                  <Button
                    variant="secondary"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Hủy
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Tạo dự án
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal chọn vị trí trên bản đồ */}
      <Modal
        show={showMapModal}
        onHide={() => setShowMapModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Chọn vị trí trên bản đồ</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ minHeight: '520px' }}>
          <Row className="mb-3">
            <Col md={9}>
              <Form.Control
                type="text"
                placeholder="Nhập địa chỉ để tìm trên bản đồ"
                value={formData.address_search}
                onChange={handleAddressSearchChange}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddressSearch(); } }}
              />
              {addressSuggestions.length > 0 && (
                <div className="border rounded p-2 mt-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {addressSuggestions.map((sug) => (
                    <div
                      key={sug.place_id}
                      role="button"
                      className="py-1 px-2 hover-bg-light"
                      onClick={() => handleSelectSuggestion(sug)}
                      style={{ cursor: 'pointer' }}
                    >
                      <i className="bi bi-geo-alt me-2 text-primary" />
                      {sug.description}
                    </div>
                  ))}
                  {suggestLoading && (
                    <div className="text-muted small mt-2">
                      <span className="spinner-border spinner-border-sm me-2" />
                      Đang tải gợi ý...
                    </div>
                  )}
                </div>
              )}
            </Col>
            <Col md={3}>
              <Button className="w-100" onClick={handleAddressSearch} disabled={geocoding}>
                {geocoding ? <span className="spinner-border spinner-border-sm" /> : 'Tìm kiếm'}
              </Button>
            </Col>
          </Row>

          <GoogleMapWrapper
            center={mapCenter}
            onMapClick={handleMapClick}
          />
          <Alert variant="info" className="mt-3">
            Click vào bản đồ để chọn vị trí. Latitude: {formData.latitude}, Longitude: {formData.longitude}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMapModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default ProjectCreate;

