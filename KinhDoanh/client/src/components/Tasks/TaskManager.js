/**
 * Task Manager Component
 * Quản lý công việc định kỳ cho dự án
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Table, Modal, Form, Row, Col, Tab, Nav } from 'react-bootstrap';
import TaskForm from './TaskForm';
import TaskCalendar from './TaskCalendar';
import './TaskManager.css';

const TASK_TYPES = {
  fire_safety: { label: 'Phòng cháy', icon: '🔥', color: 'danger' },
  security: { label: 'An ninh', icon: '🔒', color: 'warning' },
  maintenance: { label: 'Bảo trì', icon: '🔧', color: 'info' },
  inspection: { label: 'Kiểm tra', icon: '🔍', color: 'primary' },
  cleaning: { label: 'Vệ sinh', icon: '🧹', color: 'success' },
  equipment_check: { label: 'Thiết bị', icon: '⚙️', color: 'secondary' },
  other: { label: 'Khác', icon: '📋', color: 'dark' }
};

const STATUS_LABELS = {
  pending: { label: 'Chờ xử lý', variant: 'secondary' },
  in_progress: { label: 'Đang làm', variant: 'primary' },
  completed: { label: 'Hoàn thành', variant: 'success' },
  overdue: { label: 'Quá hạn', variant: 'danger' },
  cancelled: { label: 'Đã hủy', variant: 'dark' }
};

const PRIORITY_LABELS = {
  low: { label: 'Thấp', variant: 'secondary' },
  medium: { label: 'Trung bình', variant: 'info' },
  high: { label: 'Cao', variant: 'warning' },
  critical: { label: 'Khẩn cấp', variant: 'danger' }
};

function TaskManager({ projectId, projectName }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    task_type: '',
    assigned_to: ''
  });

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0
  });

  useEffect(() => {
    if (projectId) {
      loadTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, filters]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams(filters);
      
      const response = await fetch(`/api/projects/${projectId}/tasks?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response) {
        console.error('Error loading tasks: Response is null');
        alert('Could not retrieve tasks. The server response was empty.');
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Error loading tasks: Invalid content type');
        const text = await response.text();
        console.error('Response:', text);
        alert('Could not retrieve tasks. The server sent an invalid response.');
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setTasks(data.data.tasks || []);
        calculateStats(data.data.tasks || []);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (taskList) => {
    const stats = {
      total: taskList.length,
      pending: taskList.filter(t => t.status === 'pending').length,
      in_progress: taskList.filter(t => t.status === 'in_progress').length,
      completed: taskList.filter(t => t.status === 'completed').length,
      overdue: taskList.filter(t => t.status === 'overdue').length
    };
    setStats(stats);
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Bạn có chắc muốn xóa công việc này?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        loadTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleCompleteTask = async (taskId) => {
    const notes = prompt('Ghi chú hoàn thành (tùy chọn):');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completion_notes: notes })
      });
      
      if (response.ok) {
        loadTasks();
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleViewDetail = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setSelectedTask(data.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error loading task detail:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getTaskTypeInfo = (type) => TASK_TYPES[type] || TASK_TYPES.other;

  return (
    <div className="task-manager">
      {/* Header */}
      <div className="task-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h4 className="mb-1">📋 Quản lý công việc</h4>
            <p className="text-muted mb-0">{projectName}</p>
          </div>
          <Button variant="primary" onClick={handleCreateTask}>
            <i className="fas fa-plus me-2"></i>
            Thêm công việc
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={2}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <h3 className="mb-1">{stats.total}</h3>
              <small className="text-muted">Tổng số</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="stat-card border-secondary">
            <Card.Body className="text-center">
              <h3 className="mb-1 text-secondary">{stats.pending}</h3>
              <small className="text-muted">Chờ xử lý</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="stat-card border-primary">
            <Card.Body className="text-center">
              <h3 className="mb-1 text-primary">{stats.in_progress}</h3>
              <small className="text-muted">Đang làm</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="stat-card border-success">
            <Card.Body className="text-center">
              <h3 className="mb-1 text-success">{stats.completed}</h3>
              <small className="text-muted">Hoàn thành</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="stat-card border-danger">
            <Card.Body className="text-center">
              <h3 className="mb-1 text-danger">{stats.overdue}</h3>
              <small className="text-muted">Quá hạn</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-white">
            <Nav variant="tabs" className="border-0">
              <Nav.Item>
                <Nav.Link eventKey="list">
                  <i className="fas fa-list me-2"></i>
                  Danh sách
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="calendar">
                  <i className="fas fa-calendar me-2"></i>
                  Lịch
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Card.Header>

          <Card.Body>
            {/* Filters */}
            <Row className="mb-3">
              <Col md={3}>
                <Form.Select
                  size="sm"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">Tất cả trạng thái</option>
                  {Object.entries(STATUS_LABELS).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Select
                  size="sm"
                  value={filters.task_type}
                  onChange={(e) => setFilters({ ...filters, task_type: e.target.value })}
                >
                  <option value="">Tất cả loại công việc</option>
                  {Object.entries(TASK_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.icon} {val.label}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setFilters({ status: '', task_type: '', assigned_to: '' })}
                >
                  <i className="fas fa-times me-1"></i>
                  Xóa bộ lọc
                </Button>
              </Col>
            </Row>

            <Tab.Content>
              {/* List View */}
              <Tab.Pane eventKey="list">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary"></div>
                    <p className="mt-2 text-muted">Đang tải...</p>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <p className="text-muted">Chưa có công việc nào.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover>
                      <thead className="bg-light">
                        <tr>
                          <th style={{ width: '50px' }}>Ưu tiên</th>
                          <th>Công việc</th>
                          <th style={{ width: '120px' }}>Loại</th>
                          <th style={{ width: '120px' }}>Người thực hiện</th>
                          <th style={{ width: '100px' }}>Hạn</th>
                          <th style={{ width: '100px' }}>Trạng thái</th>
                          <th style={{ width: '150px' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map(task => {
                          const daysUntil = getDaysUntilDue(task.due_date);
                          const typeInfo = getTaskTypeInfo(task.task_type);
                          
                          return (
                            <tr key={task.id} className={task.status === 'overdue' ? 'table-danger' : ''}>
                              <td>
                                <Badge bg={PRIORITY_LABELS[task.priority]?.variant || 'secondary'}>
                                  {task.priority === 'critical' ? '🔴' : 
                                   task.priority === 'high' ? '🟠' :
                                   task.priority === 'medium' ? '🟡' : '⚪'}
                                </Badge>
                              </td>
                              <td>
                                <div className="fw-bold">{task.title}</div>
                                {task.description && (
                                  <small className="text-muted">{task.description.substring(0, 50)}...</small>
                                )}
                              </td>
                              <td>
                                <Badge bg={typeInfo.color}>
                                  {typeInfo.icon} {typeInfo.label}
                                </Badge>
                              </td>
                              <td>
                                <small>{task.assigned_to_name || 'Chưa gán'}</small>
                              </td>
                              <td>
                                <div>{formatDate(task.due_date)}</div>
                                {daysUntil >= 0 && daysUntil <= 7 && task.status !== 'completed' && (
                                  <small className="text-warning">Còn {daysUntil} ngày</small>
                                )}
                                {daysUntil < 0 && task.status !== 'completed' && (
                                  <small className="text-danger">Trễ {Math.abs(daysUntil)} ngày</small>
                                )}
                              </td>
                              <td>
                                <Badge bg={STATUS_LABELS[task.status]?.variant || 'secondary'}>
                                  {STATUS_LABELS[task.status]?.label || task.status}
                                </Badge>
                              </td>
                              <td>
                                <div className="btn-group btn-group-sm">
                                  <Button
                                    variant="outline-info"
                                    size="sm"
                                    onClick={() => handleViewDetail(task.id)}
                                    title="Xem chi tiết"
                                  >
                                    <i className="fas fa-eye"></i>
                                  </Button>
                                  
                                  {task.status !== 'completed' && (
                                    <Button
                                      variant="outline-success"
                                      size="sm"
                                      onClick={() => handleCompleteTask(task.id)}
                                      title="Hoàn thành"
                                    >
                                      <i className="fas fa-check"></i>
                                    </Button>
                                  )}
                                  
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleEditTask(task)}
                                    title="Sửa"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </Button>
                                  
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleDeleteTask(task.id)}
                                    title="Xóa"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Tab.Pane>

              {/* Calendar View */}
              <Tab.Pane eventKey="calendar">
                <TaskCalendar tasks={tasks} onTaskClick={handleViewDetail} />
              </Tab.Pane>
            </Tab.Content>
          </Card.Body>
        </Card>
      </Tab.Container>

      {/* Task Form Modal */}
      <TaskForm
        show={showForm}
        onHide={() => setShowForm(false)}
        projectId={projectId}
        task={editingTask}
        onSave={() => {
          setShowForm(false);
          loadTasks();
        }}
      />

      {/* Task Detail Modal */}
      {selectedTask && (
        <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Chi tiết công việc</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <h6>Thông tin chung</h6>
                <div className="mb-2"><strong>Tiêu đề:</strong> {selectedTask.task.title}</div>
                <div className="mb-2"><strong>Mô tả:</strong> {selectedTask.task.description || 'N/A'}</div>
                <div className="mb-2">
                  <strong>Loại:</strong>{' '}
                  <Badge bg={getTaskTypeInfo(selectedTask.task.task_type).color}>
                    {getTaskTypeInfo(selectedTask.task.task_type).label}
                  </Badge>
                </div>
                <div className="mb-2">
                  <strong>Ưu tiên:</strong>{' '}
                  <Badge bg={PRIORITY_LABELS[selectedTask.task.priority]?.variant}>
                    {PRIORITY_LABELS[selectedTask.task.priority]?.label}
                  </Badge>
                </div>
                <div className="mb-2">
                  <strong>Trạng thái:</strong>{' '}
                  <Badge bg={STATUS_LABELS[selectedTask.task.status]?.variant}>
                    {STATUS_LABELS[selectedTask.task.status]?.label}
                  </Badge>
                </div>
              </Col>
              <Col md={6}>
                <h6>Lịch trình</h6>
                <div className="mb-2"><strong>Ngày bắt đầu:</strong> {formatDate(selectedTask.task.start_date)}</div>
                <div className="mb-2"><strong>Hạn chót:</strong> {formatDate(selectedTask.task.due_date)}</div>
                <div className="mb-2"><strong>Tần suất:</strong> {selectedTask.task.frequency}</div>
                {selectedTask.task.is_recurring && (
                  <div className="mb-2"><strong>Lần kế tiếp:</strong> {formatDate(selectedTask.task.next_due_date)}</div>
                )}
                <div className="mb-2"><strong>Người thực hiện:</strong> {selectedTask.task.assigned_to_name || 'Chưa gán'}</div>
              </Col>
            </Row>

            {selectedTask.task.completed_at && (
              <div className="mt-3 pt-3 border-top">
                <h6>Thông tin hoàn thành</h6>
                <div className="mb-2"><strong>Hoàn thành lúc:</strong> {formatDate(selectedTask.task.completed_at)}</div>
                <div className="mb-2"><strong>Người hoàn thành:</strong> {selectedTask.task.completed_by_name}</div>
                {selectedTask.task.completion_notes && (
                  <div className="mb-2"><strong>Ghi chú:</strong> {selectedTask.task.completion_notes}</div>
                )}
              </div>
            )}

            {selectedTask.comments && selectedTask.comments.length > 0 && (
              <div className="mt-3 pt-3 border-top">
                <h6>Bình luận ({selectedTask.comments.length})</h6>
                {selectedTask.comments.map(comment => (
                  <div key={comment.id} className="mb-2 p-2 bg-light rounded">
                    <small className="text-muted">{comment.user_name} - {formatDate(comment.created_at)}</small>
                    <div>{comment.comment}</div>
                  </div>
                ))}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
              Đóng
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

export default TaskManager;
