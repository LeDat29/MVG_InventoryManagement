/**
 * Bundle Optimizer - KHO MVG
 * Tối ưu việc tải và chia nhỏ bundle
 */

// Code splitting cho các trang chính
export const loadDashboard = () => import('../pages/Dashboard');
export const loadContracts = () => import('../pages/Contracts');
export const loadCustomers = () => import('../pages/Customers');
export const loadProjects = () => import('../pages/Projects');
export const loadDocuments = () => import('../pages/Documents');
export const loadSettings = () => import('../pages/Settings');
export const loadUserManagement = () => import('../pages/Users/UserManagement');
export const loadPerformanceDashboard = () => import('../components/Admin/PerformanceDashboard');

// Lazy loading cho các component lớn
export const loadContractManager = () => import('../components/Contracts/ContractManager');
export const loadContractCreator = () => import('../components/Contracts/ContractCreator');
export const loadCustomerFormTabs = () => import('../components/Customers/CustomerFormTabs');
export const loadAIConfigManager = () => import('../components/Users/AIConfigManagerComplete');
export const loadPermissionManager = () => import('../components/Users/PermissionManager');

// Resource hints để preload các tài nguyên quan trọng
export const addResourceHints = () => {
  const head = document.head;
  
  // Preload critical CSS
  const criticalCSSLink = document.createElement('link');
  criticalCSSLink.rel = 'preload';
  criticalCSSLink.href = '/static/css/main.css';
  criticalCSSLink.as = 'style';
  head.appendChild(criticalCSSLink);

  // Preload fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
  fontLink.as = 'style';
  head.appendChild(fontLink);

  // DNS prefetch cho external APIs
  const dnsPrefetch = document.createElement('link');
  dnsPrefetch.rel = 'dns-prefetch';
  dnsPrefetch.href = '//api.example.com';
  head.appendChild(dnsPrefetch);
};

// Service Worker registration - TEMPORARILY DISABLED
export const registerServiceWorker = () => {
  console.log('🚫 Service Worker registration disabled to fix CSP issues');
  // if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  //   window.addEventListener('load', () => {
  //     navigator.serviceWorker.register('/sw.js')
  //       .then((registration) => {
  //         console.log('SW registered: ', registration);
  //       })
  //       .catch((registrationError) => {
  //         console.log('SW registration failed: ', registrationError);
  //       });
  //   });
  // }
};

// Preload strategy
export const preloadStrategy = {
  // Preload routes that user is likely to visit
  preloadLikelyRoutes: () => {
    const routes = ['/contracts', '/customers', '/dashboard'];
    routes.forEach(route => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      document.head.appendChild(link);
    });
  },

  // Preload on user interaction
  preloadOnHover: (componentLoader) => {
    return (event) => {
      // Preload when user hovers over a link/button
      componentLoader();
    };
  },

  // Preload on idle
  preloadOnIdle: (componentLoader) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        componentLoader();
      });
    } else {
      setTimeout(componentLoader, 1000);
    }
  }
};

// Bundle analysis (development only)
export const analyzeBundles = () => {
  if (process.env.NODE_ENV !== 'development') return;

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.name.includes('chunk')) {
        const sizeKB = (entry.transferSize / 1024).toFixed(2);
        console.log(`📦 Loaded chunk: ${entry.name} (${sizeKB} KB)`);
        
        if (entry.transferSize > 200 * 1024) { // 200KB
          console.warn(`⚠️ Large chunk detected: ${entry.name}`);
        }
      }
    });
  });

  observer.observe({ entryTypes: ['resource'] });
};

// Critical path optimization
export const optimizeCriticalPath = () => {
  // Inline critical CSS
  const criticalCSS = `
    .loading-spinner { 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
    }
    .navbar { 
      background-color: #fff; 
      border-bottom: 1px solid #dee2e6; 
    }
  `;
  
  const style = document.createElement('style');
  style.textContent = criticalCSS;
  document.head.appendChild(style);

  // Defer non-critical CSS
  const nonCriticalCSS = document.querySelectorAll('link[rel="stylesheet"]:not([data-critical])');
  nonCriticalCSS.forEach(link => {
    link.media = 'print';
    link.onload = () => { link.media = 'all'; };
  });
};

// Webpack bundle optimization suggestions
export const getBundleOptimizationSuggestions = () => {
  const suggestions = [];
  
  // Check for duplicate dependencies
  if (window.React && window.ReactDOM) {
    suggestions.push('Consider using React as external dependency');
  }
  
  // Check bundle size
  const scripts = document.querySelectorAll('script[src*="static/js"]');
  scripts.forEach(script => {
    if (script.src.includes('main.') && script.getAttribute('data-size-kb') > 300) {
      suggestions.push('Main bundle is large, consider code splitting');
    }
  });
  
  return suggestions;
};

// Initialize optimizations
export const initBundleOptimizations = () => {
  addResourceHints();
  registerServiceWorker();
  optimizeCriticalPath();
  
  // Preload likely routes after initial load
  setTimeout(() => {
    preloadStrategy.preloadLikelyRoutes();
  }, 2000);
  
  // Enable bundle analysis in development
  if (process.env.NODE_ENV === 'development') {
    analyzeBundles();
    
    // Log optimization suggestions
    const suggestions = getBundleOptimizationSuggestions();
    if (suggestions.length > 0) {
      console.log('🚀 Bundle optimization suggestions:', suggestions);
    }
  }
};

const bundleOptimizer = {
  loadDashboard,
  loadContracts,
  loadCustomers,
  loadProjects,
  loadDocuments,
  loadSettings,
  loadUserManagement,
  loadPerformanceDashboard,
  preloadStrategy,
  initBundleOptimizations
};

export default bundleOptimizer;