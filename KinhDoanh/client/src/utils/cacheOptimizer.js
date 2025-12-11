/**
 * Cache Optimizer - KHO MVG
 * Quản lý cache để tối ưu hiệu suất
 */

class CacheOptimizer {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  // Cache contract templates
  cacheContractTemplates(templates) {
    this.set('contract_templates', templates, 10 * 60 * 1000); // 10 minutes
  }

  getContractTemplates() {
    return this.get('contract_templates');
  }

  // Cache customer data
  cacheCustomer(customerId, customerData) {
    this.set(`customer_${customerId}`, customerData, 5 * 60 * 1000);
  }

  getCustomer(customerId) {
    return this.get(`customer_${customerId}`);
  }

  // Cache contract data
  cacheContract(contractId, contractData) {
    this.set(`contract_${contractId}`, contractData, 3 * 60 * 1000);
  }

  getContract(contractId) {
    return this.get(`contract_${contractId}`);
  }

  // Generic cache methods
  set(key, value, ttl = this.defaultTTL) {
    // Remove oldest item if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.stats.deletes++;
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
    this.stats.sets++;
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.deletes++;
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) this.stats.deletes++;
    return deleted;
  }

  clear() {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  // Cache statistics
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      total,
      hitRate: hitRate.toFixed(2),
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  // Invalidate related cache entries
  invalidatePattern(pattern) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    return keysToDelete.length;
  }

  // Preload important data
  async preloadEssentialData() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Preload contract templates
      const templatesResponse = await fetch('/api/contract-templates', { headers });
      if (templatesResponse.ok) {
        const templates = await templatesResponse.json();
        this.cacheContractTemplates(templates.data);
      }

      // Preload user permissions if available
      const userResponse = await fetch('/api/users/profile', { headers });
      if (userResponse.ok) {
        const user = await userResponse.json();
        this.set('user_profile', user.data, 15 * 60 * 1000); // 15 minutes
      }

    } catch (error) {
      console.warn('Cache preload failed:', error);
    }
  }
}

// Create singleton instance
const cacheOptimizer = new CacheOptimizer();

// Expose to window for debugging
if (process.env.NODE_ENV === 'development') {
  window.cacheOptimizer = cacheOptimizer;
}

export default cacheOptimizer;