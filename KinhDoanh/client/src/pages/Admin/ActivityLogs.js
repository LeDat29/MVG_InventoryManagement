/**
 * Activity Logs Page - Admin Only
 * Phân hệ 2.4.4 - Quản lý lịch sử thao tác
 * Features:
 * - View all user activity logs
 * - Filter by user, action, date range
 * - Filter AI-assisted actions
 * - Export logs to CSV
 * - Real-time pagination
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Badge, Alert } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import './ActivityLogs.css';

const ACTION_LABELS = {
  'LOGIN': { label: 'Đăng nhập', variant: 'success', icon: '🔑' },
  'LOGOUT': { label: 'Đăng xuất', variant: 'secondary', icon: '🚪' },
  'CREATE_PROJECT': { label: 'Tạo dự án', variant: 'primary', icon: '➕' },
  'UPDATE_PROJECT': { label: 'Cập nhật dự án', variant: 'info', icon: '✏️' },
  'DELETE_PROJECT': { label: 'Xóa dự án', variant: 'danger', icon: '🗑️' },
  'CREATE_CUSTOMER': { label: 'Tạo khách hàng', variant: 'primary', icon: '👤' },
  'UPDATE_CUSTOMER': { label: 'Cập nhật khách hàng', variant: 'info', icon: '✏️' },
  'DELETE_CUSTOMER': { label: 'Xóa khách hàng', variant: 'danger', icon: '🗑️' },
  'CREATE_CONTRACT': { label: 'Tạo hợp đồng', variant: 'success', icon: '📝' },
  'UPDATE_CONTRACT': { label: 'Cập nhật hợp đồng', variant: 'info', icon: '✏️' },
  'AI_QUERY': { label: 'Truy vấn AI', variant: 'warning', icon: '🤖' },
  'VIEW_USER_DETAIL': { label: 'Xem chi tiết user', variant: 'info', icon: '👁️' },
  'UPDATE_USER_PROJECT_PERMISSIONS': { label: 'Cập nhật quyền', variant: 'primary', icon: '🔐' },
  'UPLOAD_DOCUMENT': { label: 'Upload tài liệu', variant: 'success', icon: '📤' },
  'DELETE_DOCUMENT': { label: 'Xóa tài liệu', variant: 'danger', icon: '🗑️' },
};

function ActivityLogs() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    is_ai_assisted: '',
    start_date: '',
    end_date: '',
    page: 1,
    limit: 50
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  const [selectedLog, setSelectedLog] = useState(null);

  // Load logs
  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`/api/users/activity-logs?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data.logs || []);
        setPagination(data.data.pagination || pagination);
      } else {
        setError(data.message || 'Không thể tải logs');
      }
    } catch (err) {
      console.error('Error loading logs:', err);
      setError('Lỗi kết nối server. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load users for filter
  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  useEffect(() => {
    if (isAdmin()) {
      loadUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin()) {
      loadLogs();
    }
  }, [isAdmin, filters, loadLogs]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page on filter change
    }));
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      user_id: '',
      action: '',
      is_ai_assisted: '',
      start_date: '',
      end_date: '',
      page: 1,
      limit: 50
    });
  };

  // Pagination
  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Export to CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined && key !== 'page' && key !== 'limit') {
          queryParams.append(key, value);
        }
      });

      // Export all matching records (no pagination)
      queryParams.append('limit', '10000');

      const response = await fetch(`/api/users/activity-logs?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      
      if (data.success) {
        const exportLogs = data.data.logs || [];
        
        // Convert to CSV
        const csvContent = convertToCSV(exportLogs);
        
        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `activity-logs-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Error exporting logs:', err);
      alert('Không thể xuất file. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  // Convert logs to CSV
  const convertToCSV = (data) => {
    const headers = ['ID', 'User', 'Action', 'Entity Type', 'Entity ID', 'AI Assisted', 'IP Address', 'Created At', 'Details'];
    const rows = data.map(log => [
      log.id,
      log.full_name || log.username || 'Unknown',
      log.action,
      log.entity_type || '',
      log.entity_id || '',
      log.is_ai_assisted ? 'Yes' : 'No',
      log.ip_address || '',
      new Date(log.created_at).toLocaleString('vi-VN'),
      JSON.stringify(log.details || {})
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return '\uFEFF' + csvContent; // Add BOM for Excel UTF-8 support
  };

  // Get action badge
  const getActionBadge = (action) => {
    const actionInfo = ACTION_LABELS[action] || { label: action, variant: 'secondary', icon: '📋' };
    return (
      <Badge bg={actionInfo.variant}>
        {actionInfo.icon} {actionInfo.label}
      </Badge>
    );
  };

  // Format date time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get unique actions for filter (currently unused, but may be needed for dynamic filters)
  // const uniqueActions = [...new Set(logs.map(log => log.action))].sort();

  if (!isAdmin()) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="text-center">
          <h4>⛔ Không có quyền truy cập</h4>
          <p>Chỉ Admin mới có thể xem lịch sử hoạt động.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="activity-logs-page p-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">📊 Lịch sử hoạt động</h2>
              <p className="text-muted mb-0">Phân hệ 2.4.4 - Theo dõi toàn bộ hoạt động người dùng</p>
            </div>
            <Button 
              variant="success" 
              onClick={handleExport}
              disabled={exporting || logs.length === 0}
            >
              {exporting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Đang xuất...
                </>
              ) : (
                <>
                  <i className="fas fa-download me-2"></i>
                  Xuất CSV
                </>
              )}
            </Button>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0">🔍 Bộ lọc</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Người dùng</Form.Label>
                <Form.Select 
                  value={filters.user_id}
                  onChange={(e) => handleFilterChange('user_id', e.target.value)}
                >
                  <option value="">Tất cả người dùng</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.username})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={2}>
              <Form.Group>
                <Form.Label>Hành động</Form.Label>
                <Form.Select 
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <option value="">Tất cả hành động</option>
                  {Object.keys(ACTION_LABELS).map(action => (
                    <option key={action} value={action}>
                      {ACTION_LABELS[action].label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={2}>
              <Form.Group>
                <Form.Label>AI Assisted</Form.Label>
                <Form.Select 
                  value={filters.is_ai_assisted}
                  onChange={(e) => handleFilterChange('is_ai_assisted', e.target.value)}
                >
                  <option value="">Tất cả</option>
                  <option value="true">Có AI hỗ trợ</option>
                  <option value="false">Không có AI</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={2}>
              <Form.Group>
                <Form.Label>Từ ngày</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                />
              </Form.Group>
            </Col>

            <Col md={2}>
              <Form.Group>
                <Form.Label>Đến ngày</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                />
              </Form.Group>
            </Col>

            <Col md={1} className="d-flex align-items-end">
              <Button 
                variant="outline-secondary" 
                onClick={handleClearFilters}
                title="Xóa bộ lọc"
              >
                <i className="fas fa-times"></i>
              </Button>
            </Col>
          </Row>

          {/* Stats */}
          <Row className="mt-3">
            <Col>
              <div className="d-flex gap-3">
                <Badge bg="primary" className="p-2">
                  📊 Tổng: {pagination.total} logs
                </Badge>
                <Badge bg="warning" className="p-2">
                  🤖 AI: {logs.filter(l => l.is_ai_assisted).length} logs
                </Badge>
                <Badge bg="info" className="p-2">
                  📄 Trang {pagination.page}/{pagination.pages}
                </Badge>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Logs Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <LoadingSpinner message="Đang tải logs..." />
          ) : logs.length === 0 ? (
            <div className="text-center p-5">
              <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
              <p className="text-muted">Không có logs nào phù hợp với bộ lọc.</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th style={{ width: '80px' }}>ID</th>
                      <th style={{ width: '150px' }}>Người dùng</th>
                      <th style={{ width: '200px' }}>Hành động</th>
                      <th style={{ width: '120px' }}>Entity</th>
                      <th style={{ width: '80px' }}>AI</th>
                      <th style={{ width: '120px' }}>IP</th>
                      <th style={{ width: '180px' }}>Thời gian</th>
                      <th style={{ width: '100px' }}>Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className={log.is_ai_assisted ? 'ai-assisted-row' : ''}>
                        <td>#{log.id}</td>
                        <td>
                          <div>
                            <div className="fw-bold">{log.full_name || 'Unknown'}</div>
                            <small className="text-muted">{log.username}</small>
                          </div>
                        </td>
                        <td>{getActionBadge(log.action)}</td>
                        <td>
                          {log.entity_type && (
                            <small>
                              {log.entity_type}
                              {log.entity_id && ` #${log.entity_id}`}
                            </small>
                          )}
                        </td>
                        <td>
                          {log.is_ai_assisted ? (
                            <Badge bg="warning">🤖 AI</Badge>
                          ) : (
                            <Badge bg="secondary">👤 Manual</Badge>
                          )}
                        </td>
                        <td>
                          <small className="text-muted">{log.ip_address || 'N/A'}</small>
                        </td>
                        <td>
                          <small>{formatDateTime(log.created_at)}</small>
                        </td>
                        <td>
                          {log.details && (
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <i className="fas fa-info-circle"></i>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="p-3 border-top">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="text-muted">
                      Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
                    </div>
                    <div className="btn-group">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        <i className="fas fa-chevron-left"></i> Trước
                      </Button>
                      
                      {[...Array(Math.min(5, pagination.pages))].map((_, idx) => {
                        let pageNum;
                        if (pagination.pages <= 5) {
                          pageNum = idx + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = idx + 1;
                        } else if (pagination.page >= pagination.pages - 2) {
                          pageNum = pagination.pages - 4 + idx;
                        } else {
                          pageNum = pagination.page - 2 + idx;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={pagination.page === pageNum ? 'primary' : 'outline-primary'}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}

                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                      >
                        Sau <i className="fas fa-chevron-right"></i>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="log-detail-modal" onClick={() => setSelectedLog(null)}>
          <div className="log-detail-content" onClick={(e) => e.stopPropagation()}>
            <div className="log-detail-header">
              <h5>📋 Chi tiết Log #{selectedLog.id}</h5>
              <button className="btn-close" onClick={() => setSelectedLog(null)}></button>
            </div>
            <div className="log-detail-body">
              <Row>
                <Col md={6}>
                  <h6>Thông tin cơ bản</h6>
                  <div className="info-item">
                    <strong>Người dùng:</strong> {selectedLog.full_name} ({selectedLog.username})
                  </div>
                  <div className="info-item">
                    <strong>Hành động:</strong> {getActionBadge(selectedLog.action)}
                  </div>
                  <div className="info-item">
                    <strong>Entity:</strong> {selectedLog.entity_type || 'N/A'} 
                    {selectedLog.entity_id && ` #${selectedLog.entity_id}`}
                  </div>
                  <div className="info-item">
                    <strong>AI Assisted:</strong> {selectedLog.is_ai_assisted ? '🤖 Có' : '👤 Không'}
                  </div>
                </Col>
                <Col md={6}>
                  <h6>Thông tin kỹ thuật</h6>
                  <div className="info-item">
                    <strong>IP Address:</strong> {selectedLog.ip_address || 'N/A'}
                  </div>
                  <div className="info-item">
                    <strong>User Agent:</strong> <small>{selectedLog.user_agent || 'N/A'}</small>
                  </div>
                  <div className="info-item">
                    <strong>Thời gian:</strong> {formatDateTime(selectedLog.created_at)}
                  </div>
                </Col>
              </Row>
              
              {selectedLog.details && (
                <div className="mt-3">
                  <h6>Chi tiết bổ sung</h6>
                  <pre className="log-details-json">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="log-detail-footer">
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}

export default ActivityLogs;
