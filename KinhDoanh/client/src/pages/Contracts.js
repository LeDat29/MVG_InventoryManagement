/**
 * Contracts Page - KHO MVG
 * Quản lý hợp đồng cho thuê kho xưởng
 */

import React, { useState } from 'react';
import { Container, Nav, Tab } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import ContractManager from '../components/Contracts/ContractManager';
import ContractTemplateManager from '../components/Contracts/ContractTemplateManager';

import { useLocation } from 'react-router-dom';

function Contracts() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const pathname = location.pathname || '';
  const initialOpenCreate = pathname.endsWith('/contracts/create') || searchParams.get('create') === '1' || searchParams.get('open') === 'create';
  const initialCustomerId = searchParams.get('customer') || '';

  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('contracts');

  if (!hasPermission('contract_read')) {
    return (
      <Container className="mt-4">
        <div className="alert alert-warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Bạn không có quyền truy cập quản lý hợp đồng.
        </div>
      </Container>
    );
  }

  return (
    <div className="contracts-page">
      <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
        {/* Tab Navigation */}
        <Container fluid className="bg-light border-bottom">
          <Nav variant="tabs" className="border-0">
            <Nav.Item>
              <Nav.Link eventKey="contracts">
                <i className="fas fa-file-contract me-2"></i>
                Quản lý hợp đồng
              </Nav.Link>
            </Nav.Item>
            
            {hasPermission('contract_template_read') && (
              <Nav.Item>
                <Nav.Link eventKey="templates">
                  <i className="fas fa-file-alt me-2"></i>
                  Mẫu hợp đồng
                </Nav.Link>
              </Nav.Item>
            )}
          </Nav>
        </Container>

        {/* Tab Content */}
        <Tab.Content>
          <Tab.Pane eventKey="contracts">
            <ContractManager initialOpenCreate={initialOpenCreate} initialCustomerId={initialCustomerId} />
          </Tab.Pane>
          
          <Tab.Pane eventKey="templates">
            <ContractTemplateManager />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </div>
  );
}

export default Contracts;