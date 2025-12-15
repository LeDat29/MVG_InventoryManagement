/**
 * Customer Form with Tabs - KHO MVG
 * Tab 1: Thông tin cá nhân cơ bản
 * Tab 2: Thông tin công ty 
 */

import React, { useState, useEffect } from 'react';
import { Button, Nav, Tab } from 'react-bootstrap';
// import { useAuth } from '../../contexts/AuthContext';
import PersonalInfoTab from './PersonalInfoTab';
import CompanyInfoTab from './CompanyInfoTab';

function CustomerFormTabs({ customer = null, onSave, onCancel, isLoading = false }) {
  // const { hasPermission } = useAuth();
  
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    // Tab 1: Thông tin cá nhân cơ bản
    personal: {
      customer_code: '',
      customer_type: 'individual', // 'individual' hoặc 'company'
      full_name: '', // Họ tên đầy đủ
      phone: '',
      email: '',
      address: '',
      id_number: '', // CMND/CCCD
      notes: ''
    },
    // Tab 2: Thông tin công ty (một cá nhân có thể có nhiều công ty)
    companies: [
      {
        id: null,
        tax_code: '',
        company_name: '',
        invoice_address: '',
        warehouse_purpose: '', // Mục đích sử dụng kho
        is_primary: true // Công ty chính
      }
    ]
  });
  
  const [errors] = useState({});
  const [touched] = useState({});

  // Generate customer code based on type
  const generateCustomerCode = () => {
    const prefix = formData.personal.customer_type === 'individual' ? 'CN' : 'DN';
    const timestamp = Date.now().toString();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const sequence = (timestamp.slice(-2) + randomNum).slice(0, 6);
    const newCode = `${prefix}${sequence}`;
    
    setFormData(prev => ({
      ...prev,
      personal: {
        ...prev.personal,
        customer_code: newCode
      }
    }));
  };

  // Helper function to safely format dates
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      // Handle both ISO format and already formatted dates
      if (dateString.includes('T')) {
        return dateString.split('T')[0];
      }
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString; // Already in correct format
      }
      // Try to parse and format
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return '';
    } catch (error) {
      console.warn('Date formatting error:', error, 'for date:', dateString);
      return '';
    }
  };

  // Load customer data nếu đang edit
  useEffect(() => {
    if (customer) {
      console.log('🔍 Loading customer data for edit:', customer);
      
      // Map database customer object to form tabs structure
      setFormData({
        personal: {
          customer_code: customer.customer_code || '',
          customer_type: customer.customer_type || 'individual',
          // Map from database fields - ensure correct mapping
          full_name: customer.representative_name || customer.name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
          id_number: customer.id_number || '',
          notes: customer.notes || ''
        },
        companies: [
          {
            id: null,
            // Map from database fields - prioritize name for company
            tax_code: customer.tax_code || '',
            company_name: customer.name || '',  // Always use customer.name as company name
            invoice_address: customer.address || '',
            warehouse_purpose: customer.warehouse_purpose || '',
            is_primary: true
          }
        ]
      });
      
      console.log('✅ Form data populated for customer:', customer.customer_code);
    } else {
      console.log('🆕 Creating new customer - using default form structure');
    }
  }, [customer]);

  return (
    <div>
      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
        {/* Tab Navigation */}
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="personal">
              <i className="fas fa-user me-2"></i>
              Thông tin cơ bản
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="company">
              <i className="fas fa-building me-2"></i>
              Thông tin công ty
            </Nav.Link>
          </Nav.Item>
        </Nav>

        {/* Tab Content */}
        <Tab.Content>
          {/* Tab 1: Thông tin cá nhân cơ bản */}
          <Tab.Pane eventKey="personal">
            <PersonalInfoTab 
              data={formData.personal}
              errors={errors}
              touched={touched}
              onDataChange={(newData) => setFormData(prev => ({ ...prev, personal: newData }))}
              onGenerateCode={generateCustomerCode}
            />
          </Tab.Pane>

          {/* Tab 2: Thông tin công ty */}
          <Tab.Pane eventKey="company">
            <CompanyInfoTab 
              companies={formData.companies}
              errors={errors}
              touched={touched}
              onCompaniesChange={(companies) => setFormData(prev => ({ ...prev, companies }))}
            />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* Action Buttons */}
      <div className="d-flex justify-content-between mt-4">
        <Button 
          variant="outline-secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          <i className="fas fa-times me-2"></i>
          Hủy bỏ
        </Button>
        
        <div>
          {activeTab !== 'personal' && (
            <Button 
              variant="outline-primary"
              className="me-2"
              onClick={() => setActiveTab('personal')}
            >
              <i className="fas fa-arrow-left me-2"></i>
              Quay lại
            </Button>
          )}
          <Button 
            variant="success"
            onClick={() => {
              try {
                if (typeof onSave !== 'function') {
                  throw new Error('onSave is not a function');
                }
                onSave(formData);
              } catch (error) {
                console.error('❌ CustomerFormTabs onClick error:', error);
                alert('Error: ' + error.message);
              }
            }}
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Đang lưu...
              </>
            ) : (
              <>
                <i className="fas fa-save me-2"></i>
                {customer ? 'Cập nhật' : 'Lưu thông tin'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CustomerFormTabs;