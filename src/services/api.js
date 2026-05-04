import axios from 'axios';
import { API_BASE_URL } from '../constants/enums';
import { getToken } from './auth';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    const isGet = config.method === 'get' || config.method === undefined;
    
    if (token && !isGet) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const getDepartamentos = () => apiClient.get('/departamentos');
export const getDepartamentoById = (id) => apiClient.get(`/departamentos/${id}`);
export const searchDepartamentosByNombre = (nombre) => apiClient.get(`/departamentos/nombre/${nombre}`);
export const createDepartamento = (departamento) => apiClient.post('/departamentos', departamento);
export const updateDepartamento = (id, departamento) => apiClient.put(`/departamentos/${id}`, departamento);
export const deleteDepartamento = (id) => apiClient.delete(`/departamentos/${id}`);

export const getMunicipios = () => apiClient.get('/municipios');
export const getMunicipioById = (id) => apiClient.get(`/municipios/${id}`);
export const searchMunicipiosByNombre = (nombre) => apiClient.get(`/municipios/nombre/${nombre}`);
export const searchMunicipiosByCodigoDane = (codigoDane) => apiClient.get(`/municipios/dane/${codigoDane}`);
export const searchMunicipiosByAmenaza = (amenaza) => apiClient.get(`/municipios/amenaza/${amenaza}`);
export const createMunicipio = (municipio) => apiClient.post('/municipios', municipio);
export const updateMunicipio = (id, municipio) => apiClient.put(`/municipios/${id}`, municipio);
export const deleteMunicipio = (id) => apiClient.delete(`/municipios/${id}`);

// Microzonificaciones
export const getMicrozonificaciones = () => apiClient.get('/Microzonificacion');
export const getMicrozonificacionById = (id) => apiClient.get(`/Microzonificacion/${id}`);
export const getMicrozonificacionesByMunicipio = (idMunicipio) => apiClient.get(`/Microzonificacion/municipio/${idMunicipio}`);
export const createMicrozonificacion = (microzonificacion) => apiClient.post('/Microzonificacion', microzonificacion);
export const updateMicrozonificacion = (id, microzonificacion) => apiClient.put(`/Microzonificacion/${id}`, microzonificacion);
export const deleteMicrozonificacion = (id) => apiClient.delete(`/Microzonificacion/${id}`);

// Zonas
export const getZonas = () => apiClient.get('/zona');
export const getZonaById = (id) => apiClient.get(`/zona/${id}`);
export const createZona = (zona) => apiClient.post('/zona', zona);
export const updateZona = (id, zona) => apiClient.put(`/zona/${id}`, zona);
export const deleteZona = (id) => apiClient.delete(`/zona/${id}`);

export default apiClient;