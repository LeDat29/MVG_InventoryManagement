/**
 * Customer Form with Tabs - KHO MVG
 * Tab 1: Thông tin cá nhân cơ bản
 * Tab 2: Thông tin công ty 
 * Tab 3: Thông tin hợp đồng
 */

import React, { useState, useEffect } from 'react';
import { Button, Nav, Tab } from 'react-bootstrap';
// import { useAuth } from '../../contexts/AuthContext';
import PersonalInfoTab from './PersonalInfoTab';
import CompanyInfoTab from './CompanyInfoTab';
import ContractInfoTab from './ContractInfoTab';

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
    ],
    // Tab 3: Thông tin hợp đồng (một công ty có thể có nhiều hợp đồng)
    contracts: [
      {
        id: null,
        contract_number: '',
        project_id: '',
        warehouse_location: '',
        company_index: 0, // Index trong mảng companies
        representative_name: '', // Người đại diện công ty
        representative_position: '', // Chức vụ
        area_sqm: 0, // Diện tích thuê (m²)
        rental_price: 0, // Giá thuê
        start_date: '',
        end_date: '',
        payment_terms: '', // Thông tin thanh toán
        binding_terms: '', // Điều khoản ràng buộc
        is_active: true
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
            warehouse_purpose: '',
            is_primary: true
          }
        ],
        contracts: Array.isArray(customer.contracts) ? customer.contracts.map(contract => ({
          id: contract.id || null,
          contract_number: contract.contract_number || '',
          project_id: contract.project_id || '',
          warehouse_location: `${contract.project_name || ''} - ${contract.zone_code || ''}`.trim(),
          company_index: 0,
          representative_name: customer.representative_name || customer.name || '',
          representative_position: '',
          area_sqm: contract.zone_area || 0,
          rental_price: contract.rental_price || contract.total_value || 0,
          start_date: formatDateForInput(contract.start_date),
          end_date: formatDateForInput(contract.end_date),
          payment_terms: contract.payment_cycle || '',
          binding_terms: contract.contract_terms || '',
          is_active: contract.status === 'active',
          status: contract.status || 'draft',
          project_name: contract.project_name || '',
          zone_code: contract.zone_code || '',
          zone_name: contract.zone_name || '',
          days_until_expiry: contract.days_until_expiry || null
        })) : [
          {
            id: null,
            contract_number: '',
            project_id: '',
            warehouse_location: '',
            company_index: 0,
            representative_name: customer.representative_name || customer.name || '',
            representative_position: '',
            area_sqm: 0,
            rental_price: 0,
            start_date: '',
            end_date: '',
            payment_terms: '',
            binding_terms: '',
            is_active: true
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
          <Nav.Item>
            <Nav.Link eventKey="contracts">
              <i className="fas fa-file-contract me-2"></i>
              Thông tin hợp đồng
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

          {/* Tab 3: Thông tin hợp đồng */}
          <Tab.Pane eventKey="contracts">
            <ContractInfoTab 
              contracts={formData.contracts}
              companies={formData.companies}
              personalInfo={formData.personal}
              errors={errors}
              touched={touched}
              onContractsChange={(contracts) => setFormData(prev => ({ ...prev, contracts }))}
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
              onClick={() => {
                const tabs = ['personal', 'company', 'contracts'];
                const currentIndex = tabs.indexOf(activeTab);
                if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
              }}
            >
              <i className="fas fa-arrow-left me-2"></i>
              Quay lại
            </Button>
          )}
          
          {activeTab !== 'contracts' ? (
            <Button 
              variant="primary"
              onClick={() => {
                const tabs = ['personal', 'company', 'contracts'];
                const currentIndex = tabs.indexOf(activeTab);
                if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
              }}
            >
              Tiếp theo
              <i className="fas fa-arrow-right ms-2"></i>
            </Button>
          ) : (
            <Button 
              variant="success"
              onClick={() => {
                try {
                  console.log('🔍 CustomerFormTabs onClick triggered');
                  console.log('📊 Current formData:', formData);
                  console.log('🎯 onSave function exists:', typeof onSave);
                  
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
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomerFormTabs;