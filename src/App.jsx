import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import TablaColombia from './components/TablaColombia/TablaColombia';
import Login from './components/Login/Login';
import { isAuthenticated, getUserName, logout } from './services/auth';
import './App.css';

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      const auth = isAuthenticated();
      setIsLoggedIn(auth);
      if (auth) {
        setUserName(getUserName() || '');
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    setIsLoggedIn(true);
    setUserName(userData.nombre);
    setShowLoginModal(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
    setIsLoggedIn(false);
    setUserName('');
  };

  return (
    <div className="app-container">
      {/* Botón de Login/Logout en la esquina */}
      <div className="auth-corner">
        {isLoggedIn ? (
          <div className="user-menu">
            <span className="user-name">👤 {userName}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <button className="login-btn" onClick={() => setShowLoginModal(true)}>
            🔐 Login
          </button>
        )}
      </div>

      {/* Las tablas siempre visibles */}
      <TablaColombia isAdmin={isLoggedIn} pathname={location.pathname} />

      {/* Modal de Login */}
      {showLoginModal && (
        <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal-content" onClick={e => e.stopPropagation()}>
            <button className="login-modal-close" onClick={() => setShowLoginModal(false)}>
              ✕
            </button>
            <Login onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/departamentos" element={<AppContent />} />
        <Route path="/municipios" element={<AppContent />} />
        <Route path="/microzonificaciones" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;