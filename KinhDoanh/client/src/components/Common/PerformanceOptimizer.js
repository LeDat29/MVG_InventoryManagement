/**
 * Performance Optimizer - KHO MVG
 * Tự động tối ưu hiệu suất frontend
 */

import { memo, lazy, useMemo, useCallback } from 'react';

// Lazy loading components
export const LazyContractManager = lazy(() => import('../Contracts/ContractManager'));
export const LazyContractCreator = lazy(() => import('../Contracts/ContractCreator'));
export const LazyUserManagement = lazy(() => import('../../pages/Users/UserManagement'));
export const LazyPerformanceDashboard = lazy(() => import('../Admin/PerformanceDashboard'));
export const LazyCustomerFormTabs = lazy(() => import('../Customers/CustomerFormTabs'));
export const LazyDocuments = lazy(() => import('../../pages/Documents'));

// Image optimization
export const OptimizedImage = memo(({ src, alt, className, ...props }) => {
  const optimizedSrc = useMemo(() => {
    // Add lazy loading and optimization parameters
    if (src && src.includes('http')) {
      const url = new URL(src);
      url.searchParams.set('w', '400'); // Width optimization
      url.searchParams.set('q', '80'); // Quality optimization
      return url.toString();
    }
    return src;
  }, [src]);

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      {...props}
      style={{
        maxWidth: '100%',
        height: 'auto',
        ...props.style
      }}
    />
  );
});

// Debounced input for search
export const useDebouncedValue = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Virtualized list for large datasets
export const VirtualizedTable = memo(({ 
  data, 
  renderRow, 
  height = 400, 
  itemHeight = 50 
}) => {
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(Math.ceil(height / itemHeight));

  const handleScroll = useCallback((e) => {
    const scrollTop = e.target.scrollTop;
    const newStartIndex = Math.floor(scrollTop / itemHeight);
    const newEndIndex = Math.min(
      newStartIndex + Math.ceil(height / itemHeight),
      data.length
    );
    
    setStartIndex(newStartIndex);
    setEndIndex(newEndIndex);
  }, [itemHeight, height, data.length]);

  const visibleItems = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  return (
    <div 
      style={{ height, overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: data.length * itemHeight, position: 'relative' }}>
        <div style={{ 
          transform: `translateY(${startIndex * itemHeight}px)`,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0
        }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index}>
              {renderRow(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// Memoized table row
export const MemoizedTableRow = memo(({ 
  item, 
  onClick, 
  isSelected,
  children 
}) => {
  const handleClick = useCallback(() => {
    onClick?.(item);
  }, [onClick, item]);

  return (
    <tr 
      onClick={handleClick}
      className={isSelected ? 'table-active' : ''}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </tr>
  );
});

// Optimized data fetcher
export const useOptimizedFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const controller = useMemo(() => new AbortController(), []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [url, options, controller.signal]);

  useEffect(() => {
    fetchData();
    return () => controller.abort();
  }, [fetchData, controller]);

  return { data, loading, error, refetch: fetchData };
};

// Performance monitoring hook
export const usePerformanceMonitoring = (componentName) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 100) { // Log slow renders
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
      
      // Record performance metric
      if (window.performanceMonitor) {
        window.performanceMonitor.recordUserAction('componentRender', {
          component: componentName,
          renderTime: renderTime
        });
      }
    };
  });
};

// Cache manager
class CacheManager {
  constructor(maxSize = 50, ttl = 5 * 60 * 1000) { // 5 minutes TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest item
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

export const cacheManager = new CacheManager();

// Bundle analyzer (development only)
export const BundleAnalyzer = () => {
  if (process.env.NODE_ENV !== 'development') return null;

  useEffect(() => {
    const checkBundleSize = async () => {
      try {
        const response = await fetch('/static/js/main.*.js');
        const text = await response.text();
        const sizeKB = (text.length / 1024).toFixed(2);
        
        console.log(`📦 Main bundle size: ${sizeKB} KB`);
        
        if (sizeKB > 300) {
          console.warn('⚠️ Large bundle detected. Consider code splitting.');
        }
      } catch (error) {
        console.log('Bundle size check failed:', error);
      }
    };

    checkBundleSize();
  }, []);

  return null;
};

export default {
  LazyContractManager,
  LazyContractCreator,
  LazyUserManagement,
  LazyPerformanceDashboard,
  LazyCustomerFormTabs,
  LazyDocuments,
  OptimizedImage,
  useDebouncedValue,
  VirtualizedTable,
  MemoizedTableRow,
  useOptimizedFetch,
  usePerformanceMonitoring,
  cacheManager,
  BundleAnalyzer
};