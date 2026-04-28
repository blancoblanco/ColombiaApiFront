import axios from 'axios';

const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8080/auth';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const login = async (nombre, contrasena) => {
  const response = await axios.post(`${AUTH_URL}/login`, {
    nombre: nombre,
    contrasena: contrasena
  });
  
  const { token } = response.data;
  
  if (!token) {
    throw new Error('No se recibió token del backend');
  }
  
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, nombre);
  return { token, nombre };
};

export const logout = async () => {
  const token = getToken();
  if (token) {
    try {
      await axios.post(`${AUTH_URL}/logout`, { token });
    } catch (error) {
      console.error('Error en logout:', error);
    }
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getUserName = () => localStorage.getItem(USER_KEY);
export const isAuthenticated = () => !!getToken();