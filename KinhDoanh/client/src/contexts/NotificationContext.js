/**
 * Notification Context - KHO MVG
 * Quản lý thông báo và toast messages
 */

import React, { createContext, useContext, useCallback } from 'react';
import { toast } from 'react-toastify';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  /**
   * Show notification with different types
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info, warning)
   * @param {object} options - Additional options
   */
  const showNotification = useCallback((message, type = 'info', options = {}) => {
    const defaultOptions = {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    };

    switch (type) {
      case 'success':
        toast.success(message, defaultOptions);
        break;
      case 'error':
        toast.error(message, defaultOptions);
        break;
      case 'warning':
        toast.warning(message, defaultOptions);
        break;
      case 'info':
      default:
        toast.info(message, defaultOptions);
        break;
    }
  }, []);

  /**
   * Show success notification
   */
  const showSuccess = useCallback((message, options = {}) => {
    showNotification(message, 'success', options);
  }, [showNotification]);

  /**
   * Show error notification
   */
  const showError = useCallback((message, options = {}) => {
    showNotification(message, 'error', options);
  }, [showNotification]);

  /**
   * Show warning notification
   */
  const showWarning = useCallback((message, options = {}) => {
    showNotification(message, 'warning', options);
  }, [showNotification]);

  /**
   * Show info notification
   */
  const showInfo = useCallback((message, options = {}) => {
    showNotification(message, 'info', options);
  }, [showNotification]);

  /**
   * Show loading notification that can be updated
   */
  const showLoading = useCallback((message = 'Đang xử lý...') => {
    return toast.loading(message);
  }, []);

  /**
   * Update a loading notification
   */
  const updateNotification = useCallback((toastId, message, type = 'success') => {
    const options = {
      render: message,
      type,
      isLoading: false,
      autoClose: 5000
    };

    toast.update(toastId, options);
  }, []);

  /**
   * Dismiss notification by ID
   */
  const dismissNotification = useCallback((toastId) => {
    toast.dismiss(toastId);
  }, []);

  /**
   * Dismiss all notifications
   */
  const dismissAll = useCallback(() => {
    toast.dismiss();
  }, []);

  /**
   * Show confirmation dialog using toast
   */
  const showConfirmation = useCallback((message, onConfirm, onCancel) => {
    const ConfirmationToast = ({ closeToast }) => (
      <div>
        <p>{message}</p>
        <div className="d-flex gap-2 mt-2">
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => {
              onConfirm();
              closeToast();
            }}
          >
            Xác nhận
          </button>
          <button 
            className="btn btn-sm btn-secondary"
            onClick={() => {
              onCancel && onCancel();
              closeToast();
            }}
          >
            Hủy
          </button>
        </div>
      </div>
    );

    toast(<ConfirmationToast />, {
      autoClose: false,
      closeOnClick: false,
      closeButton: false
    });
  }, []);

  const contextValue = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    updateNotification,
    dismissNotification,
    dismissAll,
    showConfirmation
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to use notification context
 */
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;