/**
 * Permission Manager Component
 * Quản lý quyền hạn user vào từng dự án và chức năng
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form, Table, Badge, Alert, Tabs, Tab } from 'react-bootstrap';
import './PermissionManager.css';

const SYSTEM_PERMISSIONS = [
  { key: 'all', label: 'Toàn quyền', description: 'Quyền admin - truy cập tất cả', color: 'danger' },
  { key: 'project_view', label: 'Xem dự án', description: 'Xem thông tin dự án', color: 'info' },
  { key: 'project_edit', label: 'Sửa dự án', description: 'Chỉnh sửa thông tin dự án', color: 'warning' },
  { key: 'project_delete', label: 'Xóa dự án', description: 'Xóa dự án (nguy hiểm)', color: 'danger' },
  { key: 'customer_view', label: 'Xem khách hàng', description: 'Xem thông tin khách hàng', color: 'info' },
  { key: 'customer_edit', label: 'Sửa khách hàng', description: 'Chỉnh sửa khách hàng', color: 'warning' },
  { key: 'contract_view', label: 'Xem hợp đồng', description: 'Xem hợp đồng', color: 'info' },
  { key: 'contract_edit', label: 'Sửa hợp đồng', description: 'Chỉnh sửa hợp đồng', color: 'warning' },
  { key: 'document_view', label: 'Xem tài liệu', description: 'Xem tài liệu', color: 'info' },
  { key: 'document_upload', label: 'Upload tài liệu', description: 'Upload file tài liệu', color: 'warning' },
  { key: 'user_view', label: 'Xem users', description: 'Xem danh sách users', color: 'info' },
  { key: 'user_manage', label: 'Quản lý users', description: 'Tạo/sửa/xóa users', color: 'danger' },
  { key: 'report_view', label: 'Xem báo cáo', description: 'Xem các báo cáo', color: 'info' },
  { key: 'ai_use', label: 'Sử dụng AI', description: 'Sử dụng AI chatbot', color: 'primary' }
];

const PROJECT_PERMISSIONS = [
  { key: 'view', label: 'Xem', description: 'Xem thông tin dự án', color: 'info' },
  { key: 'edit', label: 'Sửa', description: 'Chỉnh sửa dự án', color: 'warning' },
  { key: 'manage_zones', label: 'Quản lý zones', description: 'Thêm/sửa/xóa zones', color: 'primary' },
  { key: 'manage_contracts', label: 'Quản lý hợp đồng', description: 'Tạo/sửa hợp đồng', color: 'success' },
  { key: 'view_financials', label: 'Xem tài chính', description: 'Xem thông tin tài chính', color: 'warning' }
];

function PermissionManager({ user, userId, show, onHide, onSave }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // System permissions
  const [systemPermissions, setSystemPermissions] = useState([]);
  
  // Project assignments
  const [projectAssignments, setProjectAssignments] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [, /* setProjectPermissions */] = useState([]);
  
  const [activeTab, setActiveTab] = useState('system');

  // Load data khi mở modal

  useEffect(() => {
    const currentUserId = userId || user?.id;
    if (show && currentUserId) {
      loadUserPermissions();
      loadAvailableProjects();
    }
  }, [show, userId, user?.id]); // Removed loadUserPermissions dependency

  const loadUserPermissions = useCallback(async () => {
    try {
      const currentUserId = userId || user?.id;
      console.log('Loading permissions for user ID:', currentUserId);
      
      if (!currentUserId) {
        throw new Error('User ID not found');
      }
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${currentUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('User permissions data:', data);
      
      if (data.success) {
        // System permissions
        const userData = data.data?.user || data.data;
        setSystemPermissions(userData.permissions || []);
        
        // Project permissions
        setProjectAssignments(data.data?.project_permissions || []);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      setError('Không thể tải quyền hạn: ' + error.message);
    }
  }, [userId, user?.id]);

  const loadAvailableProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Loading available projects...');
      
      const response = await fetch('/api/projects?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableProjects(data.data.projects || []);
          console.log('Projects loaded:', data.data.projects?.length || 0);
        }
      } else {
        console.warn('Projects API not available:', response.status);
        // Projects API might not be implemented yet, use empty array
        setAvailableProjects([]);
      }
    } catch (error) {
      console.warn('Error loading projects:', error.message);
      // Don't show error for projects as it's optional
      setAvailableProjects([]);
    }
  };

  const handleSystemPermissionToggle = (permissionKey) => {
    if (systemPermissions.includes('all') && permissionKey !== 'all') {
      // Nếu có quyền 'all', không cho toggle individual permissions
      return;
    }
    
    setSystemPermissions(prev => {
      if (permissionKey === 'all') {
        // Toggle 'all' sẽ clear tất cả permissions khác
        return prev.includes('all') ? [] : ['all'];
      }
      
      if (prev.includes(permissionKey)) {
        return prev.filter(p => p !== permissionKey);
      } else {
        return [...prev, permissionKey];
      }
    });
  };

  const handleAddProjectAssignment = () => {
    if (!selectedProject) {
      setError('Vui lòng chọn dự án');
      return;
    }
    
    // Check nếu đã assign rồi
    if (projectAssignments.some(pa => pa.project_id === parseInt(selectedProject))) {
      setError('Dự án này đã được assign');
      return;
    }
    
    const project = availableProjects.find(p => p.id === parseInt(selectedProject));
    
    setProjectAssignments(prev => [...prev, {
      project_id: parseInt(selectedProject),
      project_name: project.name,
      permissions: ['view'] // Default permission
    }]);
    
    setSelectedProject('');
    setError('');
  };

  const handleRemoveProjectAssignment = (projectId) => {
    setProjectAssignments(prev => prev.filter(pa => pa.project_id !== projectId));
  };

  const handleProjectPermissionToggle = (projectId, permissionKey) => {
    setProjectAssignments(prev => prev.map(pa => {
      if (pa.project_id === projectId) {
        const perms = pa.permissions || [];
        if (perms.includes(permissionKey)) {
          return { ...pa, permissions: perms.filter(p => p !== permissionKey) };
        } else {
          return { ...pa, permissions: [...perms, permissionKey] };
        }
      }
      return pa;
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const currentUserId = userId || user?.id;
      console.log('Saving permissions for user ID:', currentUserId);
      
      if (!currentUserId) {
        throw new Error('User ID not found');
      }
      
      const token = localStorage.getItem('token');
      
      // Save system permissions
      console.log('Saving system permissions:', systemPermissions);
      const systemResponse = await fetch(`/api/users/${currentUserId}/permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permissions: systemPermissions
        })
      });
      
      if (!systemResponse.ok) {
        const errorData = await systemResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Không thể cập nhật quyền hệ thống');
      }
      
      // Save project assignments (if any)
      if (projectAssignments.length > 0) {
        console.log('Saving project permissions:', projectAssignments);
        const projectResponse = await fetch(`/api/users/${currentUserId}/project-permissions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            projects: projectAssignments.map(pa => ({
              project_id: pa.project_id,
              permissions: pa.permissions
            }))
          })
        });
        
        if (!projectResponse.ok) {
          const errorData = await projectResponse.json().catch(() => ({}));
          throw new Error(errorData.message || 'Không thể cập nhật quyền dự án');
        }
      }
      
      setSuccess('Cập nhật quyền hạn thành công!');
      
      setTimeout(() => {
        if (onSave) onSave();
        onHide();
      }, 1500);
      
    } catch (error) {
      console.error('Error saving permissions:', error);
      setError(error.message || 'Có lỗi xảy ra khi lưu quyền hạn');
    } finally {
      setLoading(false);
    }
  };

  const hasAllPermission = systemPermissions.includes('all');

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-shield-lock"></i> Quản lý quyền hạn
          {user && (
            <div className="text-muted" style={{ fontSize: '14px', marginTop: '4px' }}>
              User: <strong>{user.username}</strong> - {user.full_name}
            </div>
          )}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
          {/* System Permissions Tab */}
          <Tab eventKey="system" title={
            <span>
              <i className="bi bi-gear-fill"></i> Quyền hệ thống
              <Badge bg="primary" className="ms-2">{systemPermissions.length}</Badge>
            </span>
          }>
            <div className="permission-matrix">
              {hasAllPermission && (
                <Alert variant="warning">
                  <i className="bi bi-exclamation-triangle-fill"></i> User này có quyền <strong>ADMIN</strong> - truy cập tất cả chức năng
                </Alert>
              )}
              
              <Table hover responsive>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}></th>
                    <th>Quyền</th>
                    <th>Mô tả</th>
                    <th style={{ width: '100px' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {SYSTEM_PERMISSIONS.map(perm => {
                    const hasPermission = systemPermissions.includes(perm.key);
                    const isDisabled = hasAllPermission && perm.key !== 'all';
                    
                    return (
                      <tr key={perm.key} className={hasPermission ? 'table-active' : ''}>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={hasPermission}
                            onChange={() => handleSystemPermissionToggle(perm.key)}
                            disabled={isDisabled}
                          />
                        </td>
                        <td>
                          <strong>{perm.label}</strong>
                          <Badge bg={perm.color} className="ms-2">{perm.key}</Badge>
                        </td>
                        <td className="text-muted">{perm.description}</td>
                        <td>
                          {hasPermission ? (
                            <Badge bg="success">Có quyền</Badge>
                          ) : (
                            <Badge bg="secondary">Không</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Tab>
          
          {/* Project Assignments Tab */}
          <Tab eventKey="projects" title={
            <span>
              <i className="bi bi-building"></i> Quyền dự án
              <Badge bg="success" className="ms-2">{projectAssignments.length}</Badge>
            </span>
          }>
            {/* Add Project Form */}
            <div className="add-project-form mb-4 p-3 border rounded bg-light">
              <h6 className="mb-3"><i className="bi bi-plus-circle"></i> Assign user vào dự án</h6>
              <div className="row g-2 align-items-end">
                <div className="col-md-8">
                  <Form.Label>Chọn dự án</Form.Label>
                  <Form.Select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                  >
                    <option value="">-- Chọn dự án --</option>
                    {availableProjects
                      .filter(p => !projectAssignments.some(pa => pa.project_id === p.id))
                      .map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name} ({project.code})
                        </option>
                      ))
                    }
                  </Form.Select>
                </div>
                <div className="col-md-4">
                  <Button
                    variant="primary"
                    onClick={handleAddProjectAssignment}
                    disabled={!selectedProject}
                    className="w-100"
                  >
                    <i className="bi bi-plus"></i> Thêm
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Project List */}
            {projectAssignments.length === 0 ? (
              <Alert variant="info">
                <i className="bi bi-info-circle"></i> User chưa được assign vào dự án nào. 
                Sử dụng form bên trên để assign.
              </Alert>
            ) : (
              <div className="project-assignments">
                {projectAssignments.map(pa => {
                  const project = availableProjects.find(p => p.id === pa.project_id);
                  
                  return (
                    <div key={pa.project_id} className="project-card mb-3 p-3 border rounded">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h6 className="mb-1">
                            <i className="bi bi-building"></i> {pa.project_name || project?.name}
                          </h6>
                          {project && (
                            <small className="text-muted">Code: {project.code}</small>
                          )}
                        </div>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemoveProjectAssignment(pa.project_id)}
                        >
                          <i className="bi bi-trash"></i> Xóa
                        </Button>
                      </div>
                      
                      <div className="permissions-grid">
                        {PROJECT_PERMISSIONS.map(perm => {
                          const hasPermission = (pa.permissions || []).includes(perm.key);
                          
                          return (
                            <div key={perm.key} className="permission-item">
                              <Form.Check
                                type="checkbox"
                                id={`${pa.project_id}-${perm.key}`}
                                label={
                                  <span>
                                    <strong>{perm.label}</strong>
                                    <br />
                                    <small className="text-muted">{perm.description}</small>
                                  </span>
                                }
                                checked={hasPermission}
                                onChange={() => handleProjectPermissionToggle(pa.project_id, perm.key)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Tab>
        </Tabs>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Hủy
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Đang lưu...
            </>
          ) : (
            <>
              <i className="bi bi-save"></i> Lưu thay đổi
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default PermissionManager;
