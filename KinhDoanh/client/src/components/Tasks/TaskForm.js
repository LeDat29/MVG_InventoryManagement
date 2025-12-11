/**
 * Task Form Component
 * Form tạo/sửa công việc
 */

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert } from 'react-bootstrap';

const TASK_TYPES = [
  { value: 'fire_safety', label: '🔥 Phòng cháy chữa cháy' },
  { value: 'security', label: '🔒 An ninh' },
  { value: 'maintenance', label: '🔧 Bảo trì' },
  { value: 'inspection', label: '🔍 Kiểm tra' },
  { value: 'cleaning', label: '🧹 Vệ sinh' },
  { value: 'equipment_check', label: '⚙️ Kiểm tra thiết bị' },
  { value: 'other', label: '📋 Khác' }
];

const FREQUENCIES = [
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'biweekly', label: '2 tuần/lần' },
  { value: 'monthly', label: 'Hàng tháng' },
  { value: 'quarterly', label: 'Hàng quý' },
  { value: 'semiannual', label: '6 tháng/lần' },
  { value: 'yearly', label: 'Hàng năm' },
  { value: 'one_time', label: 'Một lần' }
];

const PRIORITIES = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'critical', label: 'Khẩn cấp' }
];

function TaskForm({ show, onHide, projectId, task, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'maintenance',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    assigned_to: '',
    priority: 'medium',
    is_recurring: false,
    notify_before_days: 3
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      loadUsers();
      if (task) {
        // Edit mode
        setFormData({
          title: task.title || '',
          description: task.description || '',
          task_type: task.task_type || 'maintenance',
          frequency: task.frequency || 'monthly',
          start_date: task.start_date ? task.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
          due_date: task.due_date ? task.due_date.split('T')[0] : '',
          assigned_to: task.assigned_to || '',
          priority: task.priority || 'medium',
          is_recurring: task.is_recurring || false,
          notify_before_days: task.notify_before_days || 3
        });
      } else {
        // Create mode - reset
        setFormData({
          title: '',
          description: '',
          task_type: 'maintenance',
          frequency: 'monthly',
          start_date: new Date().toISOString().split('T')[0],
          due_date: '',
          assigned_to: '',
          priority: 'medium',
          is_recurring: false,
          notify_before_days: 3
        });
      }
    }
  }, [show, task]);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const url = task 
        ? `/api/projects/${projectId}/tasks/${task.id}`
        : `/api/projects/${projectId}/tasks`;
      
      const method = task ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        onSave();
      } else {
        setError(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error saving task:', error);
      setError('Không thể lưu công việc. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>
            {task ? '✏️ Sửa công việc' : '➕ Thêm công việc mới'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Tiêu đề <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Nhập tiêu đề công việc"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Mô tả</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Nhập mô tả chi tiết công việc"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Loại công việc <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  value={formData.task_type}
                  onChange={(e) => handleChange('task_type', e.target.value)}
                  required
                >
                  {TASK_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Ưu tiên <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  required
                >
                  {PRIORITIES.map(priority => (
                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Ngày bắt đầu <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  required
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Hạn chót <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  min={formData.start_date}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Tần suất <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  value={formData.frequency}
                  onChange={(e) => handleChange('frequency', e.target.value)}
                  required
                >
                  {FREQUENCIES.map(freq => (
                    <option key={freq.value} value={freq.value}>{freq.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Người thực hiện</Form.Label>
                <Form.Select
                  value={formData.assigned_to}
                  onChange={(e) => handleChange('assigned_to', e.target.value)}
                >
                  <option value="">-- Chưa gán --</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.role})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Công việc lặp lại"
                  checked={formData.is_recurring}
                  onChange={(e) => handleChange('is_recurring', e.target.checked)}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Nhắc trước (ngày)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="30"
                  value={formData.notify_before_days}
                  onChange={(e) => handleChange('notify_before_days', parseInt(e.target.value))}
                />
                <Form.Text className="text-muted">
                  Gửi thông báo trước hạn chót bao nhiêu ngày
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          {formData.frequency !== 'one_time' && (
            <Alert variant="info">
              <i className="fas fa-info-circle me-2"></i>
              <strong>Lưu ý:</strong> Công việc này sẽ tự động tạo lịch kế tiếp sau khi hoàn thành (nếu chọn "Công việc lặp lại").
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Hủy
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Đang lưu...
              </>
            ) : (
              <>
                <i className="fas fa-save me-2"></i>
                {task ? 'Cập nhật' : 'Tạo mới'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default TaskForm;
