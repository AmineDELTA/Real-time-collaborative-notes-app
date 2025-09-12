import React, { useState, useEffect } from 'react';
import Login from './Login';
import Register from './Register';
import { apiUtils } from '../services/api';

const AuthContainer = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    if (apiUtils.isAuthenticated()) {
      onAuthSuccess();
    } else {
      setIsLoading(false);
    }
  }, [onAuthSuccess]);

  const handleAuthSuccess = () => {
    onAuthSuccess();
  };

  const switchToRegister = () => {
    setIsLogin(false);
  };

  const switchToLogin = () => {
    setIsLogin(true);
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      {isLogin ? (
        <Login 
          onLoginSuccess={handleAuthSuccess}
          onSwitchToRegister={switchToRegister}
        />
      ) : (
        <Register 
          onRegisterSuccess={handleAuthSuccess}
          onSwitchToLogin={switchToLogin}
        />
      )}
    </>
  );
};

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '1rem'
  }
};

export default AuthContainer;
