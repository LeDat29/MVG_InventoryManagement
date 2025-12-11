/**
 * Loading Spinner Component - KHO MVG
 * Reusable loading spinner với các variants
 */

import React from 'react';
import { Spinner } from 'react-bootstrap';

function LoadingSpinner({ 
  size = 'medium', 
  variant = 'primary', 
  text = 'Đang tải...', 
  overlay = false,
  fullScreen = false 
}) {
  const spinnerSizes = {
    small: { width: '1rem', height: '1rem' },
    medium: { width: '2rem', height: '2rem' },
    large: { width: '3rem', height: '3rem' }
  };

  const spinnerStyle = spinnerSizes[size] || spinnerSizes.medium;

  const SpinnerElement = (
    <div className="text-center">
      <Spinner 
        animation="border" 
        variant={variant}
        style={spinnerStyle}
        role="status"
        aria-hidden="true"
      />
      {text && (
        <div className="mt-2 text-muted">
          {text}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loading-fullscreen">
        <div className="loading-container">
          <div className="loading-content">
            <div className="loading-logo mb-3">
              <i className="fas fa-warehouse fa-3x text-primary"></i>
            </div>
            {SpinnerElement}
          </div>
        </div>
        <style jsx>{`
          .loading-fullscreen {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
          }

          .loading-container {
            text-align: center;
            color: white;
          }

          .loading-content {
            animation: fadeIn 0.5s ease-in-out;
          }

          .loading-logo {
            animation: pulse 2s infinite;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner">
          {SpinnerElement}
        </div>
        <style jsx>{`
          .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            border-radius: 8px;
          }

          .loading-spinner {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="loading-spinner-container">
      {SpinnerElement}
      <style jsx>{`
        .loading-spinner-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
        }
      `}</style>
    </div>
  );
}

export default LoadingSpinner;