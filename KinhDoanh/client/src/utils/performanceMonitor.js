/**
 * Performance Monitor - KHO MVG
 * Giám sát hiệu suất frontend và theo dõi metrics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoads: [],
      apiCalls: [],
      errors: [],
      userActions: []
    };
    this.init();
  }

  init() {
    // Monitor page load performance
    window.addEventListener('load', () => {
      this.recordPageLoad();
    });

    // Monitor API calls
    this.interceptFetch();
    
    // Monitor errors
    window.addEventListener('error', (event) => {
      this.recordError(event);
    });

    // Monitor React errors
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError(event);
    });
  }

  recordPageLoad() {
    if (performance && performance.timing) {
      const timing = performance.timing;
      const metrics = {
        timestamp: Date.now(),
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: this.getFirstPaint(),
        url: window.location.pathname
      };
      
      this.metrics.pageLoads.push(metrics);
      this.reportMetric('pageLoad', metrics);
    }
  }

  getFirstPaint() {
    if (performance && performance.getEntriesByType) {
      const paintEntries = performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
      return firstPaint ? firstPaint.startTime : null;
    }
    return null;
  }

  interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        this.recordApiCall({
          url,
          method: args[1]?.method || 'GET',
          status: response.status,
          duration: endTime - startTime,
          timestamp: Date.now(),
          success: response.ok
        });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        
        this.recordApiCall({
          url,
          method: args[1]?.method || 'GET',
          status: 0,
          duration: endTime - startTime,
          timestamp: Date.now(),
          success: false,
          error: error.message
        });
        
        throw error;
      }
    };
  }

  recordApiCall(metrics) {
    this.metrics.apiCalls.push(metrics);
    
    // Alert for slow API calls
    if (metrics.duration > 3000) {
      console.warn('🐌 Slow API call detected:', metrics);
    }
    
    this.reportMetric('apiCall', metrics);
  }

  recordError(event) {
    const errorData = {
      timestamp: Date.now(),
      message: event.message || event.reason?.message,
      stack: event.error?.stack || event.reason?.stack,
      url: window.location.pathname,
      userAgent: navigator.userAgent,
      type: event.type
    };
    
    this.metrics.errors.push(errorData);
    this.reportMetric('error', errorData);
  }

  recordUserAction(action, data = {}) {
    const actionData = {
      timestamp: Date.now(),
      action,
      url: window.location.pathname,
      ...data
    };
    
    this.metrics.userActions.push(actionData);
    this.reportMetric('userAction', actionData);
  }

  reportMetric(type, data) {
    // Disable metrics reporting temporarily to fix website access
    return;
    
    // Send to backend for analysis (only in production)
    if (process.env.NODE_ENV === 'production') {
      try {
        fetch('/api/metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type, data }),
        }).catch(() => {
          // Silent failure in production
        });
      } catch (error) {
        // Silent failure
      }
    }
  }

  getMetricsSummary() {
    return {
      pageLoads: this.getPageLoadSummary(),
      apiCalls: this.getApiCallSummary(),
      errors: this.getErrorSummary(),
      userActions: this.getUserActionSummary()
    };
  }

  getPageLoadSummary() {
    const loads = this.metrics.pageLoads;
    if (loads.length === 0) return null;
    
    const avgLoadTime = loads.reduce((sum, load) => sum + load.loadTime, 0) / loads.length;
    const avgDomReady = loads.reduce((sum, load) => sum + load.domReady, 0) / loads.length;
    
    return {
      count: loads.length,
      avgLoadTime: Math.round(avgLoadTime),
      avgDomReady: Math.round(avgDomReady),
      slowestPage: loads.reduce((slowest, current) => 
        current.loadTime > slowest.loadTime ? current : slowest
      )
    };
  }

  getApiCallSummary() {
    const calls = this.metrics.apiCalls;
    if (calls.length === 0) return null;
    
    const avgDuration = calls.reduce((sum, call) => sum + call.duration, 0) / calls.length;
    const errorRate = calls.filter(call => !call.success).length / calls.length;
    
    return {
      count: calls.length,
      avgDuration: Math.round(avgDuration),
      errorRate: Math.round(errorRate * 100),
      slowestCall: calls.reduce((slowest, current) => 
        current.duration > slowest.duration ? current : slowest
      )
    };
  }

  getErrorSummary() {
    return {
      count: this.metrics.errors.length,
      recent: this.metrics.errors.slice(-10),
      byType: this.groupBy(this.metrics.errors, 'type')
    };
  }

  getUserActionSummary() {
    return {
      count: this.metrics.userActions.length,
      byAction: this.groupBy(this.metrics.userActions, 'action'),
      recent: this.metrics.userActions.slice(-20)
    };
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  // Debug methods
  logMetrics() {
    console.table(this.getMetricsSummary());
  }

  exportMetrics() {
    const data = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: this.getMetricsSummary(),
      raw: this.metrics
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Create global instance
const performanceMonitor = new PerformanceMonitor();

// Expose to window for debugging
if (process.env.NODE_ENV === 'development') {
  window.performanceMonitor = performanceMonitor;
}

export default performanceMonitor;