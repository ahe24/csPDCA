// Authentication context provider
import React, { createContext, useState, useEffect } from 'react';

// Create context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize user on component mount
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Get current user from main process
        const currentUser = await window.api.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error getting current user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeUser();
  }, []);
  
  // Login function
  const login = async (credentials) => {
    try {
      const result = await window.api.login(credentials);
      
      if (result && !result.error) {
        setUser(result);
        return { success: true };
      } else {
        return { success: false, error: result.error || '로그인에 실패했습니다.' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: '로그인 중 오류가 발생했습니다.' };
    }
  };
  
  // Logout function
  const logout = async () => {
    try {
      await window.api.logout();
      setUser(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: '로그아웃 중 오류가 발생했습니다.' };
    }
  };
  
  // Register function
  const register = async (userData) => {
    try {
      const result = await window.api.register(userData);
      
      if (result && !result.error) {
        return { success: true };
      } else {
        return { success: false, error: result.error || '회원가입에 실패했습니다.' };
      }
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: '회원가입 중 오류가 발생했습니다.' };
    }
  };
  
  // Recover password function
  const recoverPassword = async (data) => {
    try {
      const result = await window.api.recoverPassword(data);
      
      if (result && !result.error) {
        return { success: true };
      } else {
        return { success: false, error: result.error || '비밀번호 복구에 실패했습니다.' };
      }
    } catch (error) {
      console.error('Recover password error:', error);
      return { success: false, error: '비밀번호 복구 중 오류가 발생했습니다.' };
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        recoverPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
