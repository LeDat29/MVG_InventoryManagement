import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Ensure axios has the Authorization header synchronously when a token
// is present in localStorage. This ensures components that mount immediately
// after the app starts will have authenticated requests available.
try {
  const __initial_token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (__initial_token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${__initial_token}`;
  }
} catch (e) {
  // ignore in non-browser environments
}

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  // Initialize token from localStorage on mount
  const [token, setToken] = useState(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    } catch (e) {
      return null;
    }
  });

  // Initialize user from localStorage on mount if token exists
  const [user, setUser] = useState(() => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (storedToken) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          return JSON.parse(storedUser);
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    // If we have a token on mount, we need to reload the profile, so loading = true
    // If no token, we're not loading anything, so loading = false
    try {
      const hasToken = typeof window !== 'undefined' ? !!localStorage.getItem('token') : false;
      return hasToken;
    } catch (e) {
      return false;
    }
  });

  // Simple login function
  const login = async (credentials) => {
    try {
      console.log('🔍 Attempting login with:', { username: credentials.username, hasPassword: !!credentials.password });
      const response = await axios.post('/api/auth/login', credentials);
      console.log('✅ Login response:', response.data);
      const { token: newToken, user: userData } = response.data.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('❌ Login error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config
      });
      return { 
        success: false, 
        message: error.response?.data?.message || `Login failed: ${error.response?.status} ${error.response?.statusText}` 
      };
    }
  };

  // Simple logout function (memoized so effects depending on it stay stable)
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (e) {
      // ignore in non-browser or storage-error cases
    }
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  // Load user profile from API
  const loadUserProfile = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await axios.get('/api/auth/profile');
      console.log('✅ Profile loaded:', response.data.data);
      // API returns { success: true, data: { user } }
      // Ensure we set the inner user object, not the wrapper
      setUser(response.data.data.user || response.data.data);
      // Update localStorage with fresh user data
      localStorage.setItem('user', JSON.stringify(response.data.data.user || response.data.data));
    } catch (error) {
      console.warn('Profile load failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  // Check permissions
  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions?.includes(permission) || false;
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  // On mount: if we have a token, reload the profile to ensure fresh data
  // This handles both fresh login and page refresh
  useEffect(() => {
    if (token) {
      // Ensure axios header is set
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Reload profile to ensure data is current
      loadUserProfile();
      console.log('✅ Session restored - reloading profile from API');
    } else {
      // No token, done loading
      setLoading(false);
    }
  }, [token, loadUserProfile]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    hasPermission,
    isAdmin,
    loadUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
