import { useState } from 'react';
import { login, logout } from '../../services/auth';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(nombre, contrasena);
      onLoginSuccess(result);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Iniciar Sesión</h2>
        
        {error && <div className="login-error">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            type="text"
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            placeholder="Ingresa tu nombre"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="contrasena">Contraseña</label>
          <input
            type="password"
            id="contrasena"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
            placeholder="Ingresa tu contraseña"
          />
        </div>
        
        <button type="submit" disabled={loading} className="login-button">
          {loading ? 'Ingresando...' : 'Iniciar Sesión'}
        </button>
      </form>
    </div>
  );
}

export default Login;