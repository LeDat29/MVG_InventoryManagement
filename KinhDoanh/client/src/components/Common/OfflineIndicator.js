/**
 * Offline Indicator Component - KHO MVG
 * Hiển thị trạng thái kết nối mạng
 */

import React, { useState, useEffect } from 'react';
import { Alert } from 'react-bootstrap';

function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineAlert(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auto hide alert after 5 seconds when coming back online
    if (isOnline && showOfflineAlert) {
      const timer = setTimeout(() => {
        setShowOfflineAlert(false);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline, showOfflineAlert]);

  if (!showOfflineAlert && isOnline) {
    return null;
  }

  return (
    <div className={`offline-indicator ${showOfflineAlert ? 'show' : ''}`}>
      <Alert 
        variant={isOnline ? 'success' : 'warning'} 
        className="mb-0 text-center py-2"
        dismissible={isOnline}
        onClose={() => setShowOfflineAlert(false)}
      >
        <i className={`fas ${isOnline ? 'fa-wifi' : 'fa-wifi-slash'} me-2`}></i>
        {isOnline ? 
          'Đã khôi phục kết nối internet' : 
          'Mất kết nối internet. Một số tính năng có thể bị hạn chế.'
        }
      </Alert>

      <style jsx>{`
        .offline-indicator {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          transform: translateY(-100%);
          transition: transform 0.3s ease-in-out;
        }

        .offline-indicator.show {
          transform: translateY(0);
        }

        .offline-indicator + .App {
          margin-top: 60px;
          transition: margin-top 0.3s ease-in-out;
        }

        @media (max-width: 768px) {
          .offline-indicator .alert {
            font-size: 0.9rem;
            padding: 0.5rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default OfflineIndicator;