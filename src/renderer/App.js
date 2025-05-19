// Main App component
import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import CalendarPage from './pages/CalendarPage';
import ReportPage from './pages/ReportPage';

function App() {
  const { user, logout } = useAuth();
  const [activePage, setActivePage] = useState('calendar');
  
  // Redirect to login page if not authenticated
  useEffect(() => {
    if (!user) {
      console.log('User not authenticated, should be redirected to login page');
    }
  }, [user]);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  return (
    <div className="app">
      <header className="app-header">
        <div className="container">
          <div className="app-title-container">
            <img 
              src="images/favicon.ico" 
              alt="csPDCA Icon" 
              className="app-icon" 
              style={{ width: '24px', height: '24px', marginRight: '10px' }}
            />
            <h1 className="app-title">csPDCA</h1>
          </div>
          
          {user && (
            <div className="user-info">
              <span className="welcome-message">환영합니다, <strong>{user.name || user.username}</strong>님!</span>
            </div>
          )}
          
          <nav className="app-nav">
            <div 
              className={`app-nav-item ${activePage === 'calendar' ? 'active' : ''}`}
              onClick={() => setActivePage('calendar')}
            >
              캘린더 보기
            </div>
            
            <div 
              className={`app-nav-item ${activePage === 'report' ? 'active' : ''}`}
              onClick={() => setActivePage('report')}
            >
              보고서 보기
            </div>
            
            <div className="app-nav-item" onClick={handleLogout}>
              로그아웃
            </div>
          </nav>
        </div>
      </header>
      
      <main className="app-main">
        <div className="container">
          {activePage === 'calendar' ? (
            <CalendarPage />
          ) : (
            <ReportPage />
          )}
        </div>
      </main>
      
      <footer className="app-footer">
        <div className="container">
          <p>csPDCA &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
