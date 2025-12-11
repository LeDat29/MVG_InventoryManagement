/**
 * Contract Service - API calls for contract management
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class ContractService {
  async getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async handleResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    // If response is JSON, parse it.
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      return data;
    }

    // For non-JSON responses (HTML/text), return text body for better error messages
    const text = await response.text();
    if (!response.ok) {
      // try to extract useful message from HTML (strip tags)
      const stripped = text.replace(/<[^>]+>/g, '').trim();
      const message = stripped ? stripped : `HTTP error! status: ${response.status}`;
      throw new Error(message);
    }

    // If OK but not JSON, return raw text
    return { success: true, data: text };
  }

  // Contract Management
  async getContracts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE}/contracts${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async getContract(id) {
    const response = await fetch(`${API_BASE}/contracts/${id}`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async createContract(contractData) {
    const response = await fetch(`${API_BASE}/contracts`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(contractData)
    });
    
    return this.handleResponse(response);
  }

  async updateContract(id, contractData) {
    const response = await fetch(`${API_BASE}/contracts/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(contractData)
    });
    
    return this.handleResponse(response);
  }

  async updateContractStatus(id, statusData) {
    const response = await fetch(`${API_BASE}/contracts/${id}/status`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(statusData)
    });
    
    return this.handleResponse(response);
  }

  // Contract Templates
  async getContractTemplates(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE}/contract-templates${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async getContractTemplate(id) {
    const response = await fetch(`${API_BASE}/contract-templates/${id}`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async createContractTemplate(templateData) {
    const response = await fetch(`${API_BASE}/contract-templates`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(templateData)
    });
    
    return this.handleResponse(response);
  }

  async generateDocumentFromTemplate(templateId, generateData) {
    const response = await fetch(`${API_BASE}/contract-templates/${templateId}/generate`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(generateData)
    });
    
    return this.handleResponse(response);
  }

  // Contract Documents
  async getDocumentCategories() {
    const response = await fetch(`${API_BASE}/contract-documents/categories`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async getContractDocuments(contractId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE}/contract-documents/${contractId}${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async getDocument(id) {
    const response = await fetch(`${API_BASE}/contract-documents/document/${id}`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async createDocument(documentData) {
    const response = await fetch(`${API_BASE}/contract-documents`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(documentData)
    });
    
    return this.handleResponse(response);
  }

  async updateDocument(id, documentData) {
    const response = await fetch(`${API_BASE}/contract-documents/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(documentData)
    });
    
    return this.handleResponse(response);
  }

  async createDocumentVersion(id, versionData = {}) {
    const response = await fetch(`${API_BASE}/contract-documents/${id}/create-version`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(versionData)
    });
    
    return this.handleResponse(response);
  }

  // Workflow & Reviews
  async submitForReview(contractId, reviewData) {
    const response = await fetch(`${API_BASE}/contracts/${contractId}/submit-review`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(reviewData)
    });
    
    return this.handleResponse(response);
  }

  async addReview(contractId, reviewData) {
    const response = await fetch(`${API_BASE}/contracts/${contractId}/reviews`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(reviewData)
    });
    
    return this.handleResponse(response);
  }

  // Statistics
  async getContractStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE}/contracts/stats${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }
}

const contractService = new ContractService();
export default contractService;