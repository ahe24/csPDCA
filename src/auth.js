// Authentication module for user management
const bcrypt = require('bcryptjs');
const ElectronStore = require('electron-store');

class Auth {
  constructor(database) {
    this.db = database;
    
    // Initialize electron-store for persistent session storage
    this.store = new ElectronStore({
      name: 'cspdca-session',
      encryptionKey: 'cspdca-secure-key' // Simple encryption key for session data
    });
  }
  
  // Register a new user
  async register(userData) {
    try {
      const { username, password, name, email, securityQuestion, securityAnswer } = userData;
      
      // Check if username already exists
      const existingUser = await this.db.getUserByUsername(username);
      if (existingUser) {
        throw new Error('이미 사용 중인 사용자 이름입니다.');
      }
      
      // Hash password and security answer
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      const security_answer_hash = await bcrypt.hash(securityAnswer.toLowerCase(), salt);
      
      // Create user in database
      const user = await this.db.createUser({
        username,
        password_hash,
        name,
        email,
        security_question: securityQuestion,
        security_answer_hash
      });
      
      // Return user without sensitive data
      const { password_hash: _, security_answer_hash: __, ...safeUser } = user;
      return { success: true, user: safeUser };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }
  
  // Login user
  async login(username, password) {
    try {
      // Get user from database
      const user = await this.db.getUserByUsername(username);
      if (!user) {
        throw new Error('사용자 이름 또는 비밀번호가 올바르지 않습니다.');
      }
      
      // Compare password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        throw new Error('사용자 이름 또는 비밀번호가 올바르지 않습니다.');
      }
      
      // Store user session
      this.storeUserSession(user);
      
      // Return user without sensitive data
      const { password_hash, security_answer_hash, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }
  
  // Logout user
  async logout() {
    try {
      // Clear user session
      this.clearUserSession();
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
  
  // Recover password using security question
  async recoverPassword(username, securityQuestion, securityAnswer, newPassword) {
    try {
      // Get user from database
      const user = await this.db.getUserByUsername(username);
      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }
      
      // Check if security question matches
      if (user.security_question !== securityQuestion) {
        throw new Error('보안 질문이 일치하지 않습니다.');
      }
      
      // Compare security answer
      const isMatch = await bcrypt.compare(securityAnswer.toLowerCase(), user.security_answer_hash);
      if (!isMatch) {
        throw new Error('보안 질문 답변이 올바르지 않습니다.');
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(newPassword, salt);
      
      // Update user password
      await this.db.updateUserPassword(user.id, password_hash);
      
      return { success: true };
    } catch (error) {
      console.error('Password recovery error:', error);
      throw error;
    }
  }
  
  // Get logged in user
  getLoggedInUser() {
    try {
      return this.store.get('user');
    } catch (error) {
      console.error('Get logged in user error:', error);
      return null;
    }
  }
  
  // Store user session
  storeUserSession(user) {
    try {
      // Remove sensitive data before storing
      const { password_hash, security_answer_hash, ...safeUser } = user;
      this.store.set('user', safeUser);
    } catch (error) {
      console.error('Store user session error:', error);
    }
  }
  
  // Clear user session
  clearUserSession() {
    try {
      this.store.delete('user');
    } catch (error) {
      console.error('Clear user session error:', error);
    }
  }
}

module.exports = Auth;
