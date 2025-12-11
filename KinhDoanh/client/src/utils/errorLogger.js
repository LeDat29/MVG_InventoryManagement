/**
 * Error Logger Utility - KHO MVG Client
 * Centralized error logging and reporting service
 */

class ErrorLogger {
    static isProduction = process.env.NODE_ENV === 'production';
    static apiEndpoint = '/api/client-errors';

    /**
     * Log error to console (development) and send to server (production)
     */
    static async logError(error, context = {}) {
        const errorData = {
            message: error.message || 'Unknown error',
            stack: error.stack,
            context: {
                ...context,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }
        };

        // Always log to console in development
        if (!this.isProduction) {
            console.error('[ErrorLogger]', errorData);
        }

        // Send to server for tracking
        try {
            await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(errorData)
            });
        } catch (sendError) {
            // Silently fail if error reporting fails
            if (!this.isProduction) {
                console.warn('Failed to send error to server:', sendError);
            }
        }

        return errorData;
    }

    /**
     * Log warning
     */
    static logWarning(message, context = {}) {
        const warningData = {
            level: 'warning',
            message,
            context,
            timestamp: new Date().toISOString()
        };

        if (!this.isProduction) {
            console.warn('[Warning]', warningData);
        }

        return warningData;
    }

    /**
     * Log info (development only)
     */
    static logInfo(message, data = {}) {
        if (!this.isProduction) {
            console.log('[Info]', message, data);
        }
    }

    /**
     * Track user action for analytics
     */
    static async trackAction(action, data = {}) {
        if (!this.isProduction) {
            console.log('[Track]', action, data);
        }

        try {
            await fetch('/api/client-analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    action,
                    data,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            // Silently fail
        }
    }

    /**
     * Create error boundary handler
     */
    static createErrorBoundaryHandler(componentName) {
        return (error, errorInfo) => {
            this.logError(error, {
                component: componentName,
                errorInfo: errorInfo?.componentStack
            });
        };
    }
}

export default ErrorLogger;
