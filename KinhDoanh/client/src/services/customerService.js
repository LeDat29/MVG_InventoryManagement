/**
 * Customer Service - API calls for customer management
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class CustomerService {
  async getAuthHeaders(noCache = false) {
    const token = localStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    if (noCache) {
      headers['Cache-Control'] = 'no-cache';
      headers['Pragma'] = 'no-cache';
    }
    
    return headers;
  }

  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      // Log lỗi chi tiết cho debugging
      console.error('CustomerService API Error:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  }

  // Lấy danh sách khách hàng
  async getCustomers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE}/customers${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await this.getAuthHeaders(true) // Force no-cache for fresh data
    });
    
    return this.handleResponse(response);
  }

  // Lấy chi tiết khách hàng
  async getCustomer(id) {
    const response = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  // Tạo khách hàng mới
  async createCustomer(customerData) {
    const response = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(customerData)
    });
    
    return this.handleResponse(response);
  }

  // Cập nhật khách hàng
  async updateCustomer(id, customerData) {
    const response = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(customerData)
    });
    
    return this.handleResponse(response);
  }

  // Xóa khách hàng
  async deleteCustomer(id) {
    const response = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  // Lấy hợp đồng của khách hàng
  async getCustomerContracts(customerId, status = null) {
    const params = status ? { status } : {};
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE}/customers/${customerId}/contracts${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  // Tạo hợp đồng mới
  async createContract(contractData) {
    const response = await fetch(`${API_BASE}/customers/contracts`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(contractData)
    });
    
    return this.handleResponse(response);
  }

  // Lấy hợp đồng sắp hết hạn
  async getExpiringContracts(days = 30) {
    const response = await fetch(`${API_BASE}/customers/contracts/expiring?days=${days}`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  // Lấy thống kê khách hàng
  async getCustomerStats() {
    const response = await fetch(`${API_BASE}/customers/stats`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }
}

const customerService = new CustomerService();
export default customerService;