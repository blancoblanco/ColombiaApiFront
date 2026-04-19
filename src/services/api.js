import axios from 'axios';
import { API_BASE_URL } from '../constants/enums';

// Configurar axios con la base URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Departamentos
export const getDepartamentos = () => apiClient.get('/departamentos');
export const getDepartamentoById = (id) => apiClient.get(`/departamentos/${id}`);
export const searchDepartamentosByNombre = (nombre) => apiClient.get(`/departamentos/nombre/${nombre}`);
export const createDepartamento = (departamento) => apiClient.post('/departamentos', departamento);
export const updateDepartamento = (id, departamento) => apiClient.put(`/departamentos/${id}`, departamento);
export const deleteDepartamento = (id) => apiClient.delete(`/departamentos/${id}`);

// Municipios
export const getMunicipios = () => apiClient.get('/municipios');
export const getMunicipioById = (id) => apiClient.get(`/municipios/${id}`);
export const searchMunicipiosByNombre = (nombre) => apiClient.get(`/municipios/nombre/${nombre}`);
export const searchMunicipiosByCodigoDane = (codigoDane) => apiClient.get(`/municipios/dane/${codigoDane}`);
export const searchMunicipiosByAmenaza = (amenaza) => apiClient.get(`/municipios/amenaza/${amenaza}`);
export const createMunicipio = (municipio) => apiClient.post('/municipios', municipio);
export const updateMunicipio = (id, municipio) => apiClient.put(`/municipios/${id}`, municipio);
export const deleteMunicipio = (id) => apiClient.delete(`/municipios/${id}`);

export default apiClient;