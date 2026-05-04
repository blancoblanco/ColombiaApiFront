import React, { useState, useEffect } from 'react';
import {
  getDepartamentos,
  getMunicipios,
  searchDepartamentosByNombre,
  searchMunicipiosByNombre,
  searchMunicipiosByCodigoDane,
  searchMunicipiosByAmenaza,
  createDepartamento,
  updateDepartamento,
  deleteDepartamento,
  createMunicipio,
  updateMunicipio,
  deleteMunicipio,
  getMicrozonificaciones,
  getMicrozonificacionesByMunicipio,
  createMicrozonificacion,
  updateMicrozonificacion,
  deleteMicrozonificacion,
  getZonas,
  createZona,
  updateZona,
  deleteZona
} from '../../services/api';
import {
  AMENAZA_SISMICA_OPTIONS,
  ZONA_RESPUESTA_SISMICA_OPTIONS,
  COEFICIENTE_ZONA
} from '../../constants/enums';
import './TablaColombia.css';

function TablaColombia({ isAdmin = false }) {
  const [departamentos, setDepartamentos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroDepto, setFiltroDepto] = useState('');
  const [filtroMunNombre, setFiltroMunNombre] = useState('');
  const [filtroMunDane, setFiltroMunDane] = useState('');
  const [filtroMunAmenaza, setFiltroMunAmenaza] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    codigoDane: '',
    amenazaSismica: 'BAJA',
    aa: 0.05,
    av: 0.05,
    ae: 0.02,
    ad: 0.02,
    departamento: null
  });

  // Estados para pestañas
  const [pestañaActiva, setPestañaActiva] = useState('municipios');

  // Estados para Microzonificaciones
  const [microzonificaciones, setMicrozonificaciones] = useState([]);
  const [todosLosMunicipios, setTodosLosMunicipios] = useState([]); // Todos los municipios
  const [municipiosConMicro, setMunicipiosConMicro] = useState([]); // Solo municipios con microzonificación
  const [municipioSeleccionado, setMunicipioSeleccionado] = useState(null);
  const [microExpandida, setMicroExpandida] = useState(null);
  const [zonasDeMicro, setZonasDeMicro] = useState({}); // { microId: [zonas] }

  // Estados para modales de microzonificación y zonas
  const [showMicroModal, setShowMicroModal] = useState(false);
  const [showZonaModal, setShowZonaModal] = useState(false);
  const [editingMicro, setEditingMicro] = useState(null);
  const [editingZona, setEditingZona] = useState(null);
  const [microParentId, setMicroParentId] = useState(null); // Para saber a qué micro pertenece la zona
  const [formDataMicro, setFormDataMicro] = useState({
    nombre: '',
    municipio: null
  });
  const [formDataZona, setFormDataZona] = useState({
    zonaRespuestaSismica: 'CERROS',
    fa: 1.0,
    fv: 1.5,
    tc: 0.6,
    tl: 2.0,
    a0: 0.5,
    microzonificacion: null
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [depResponse, munResponse] = await Promise.all([
        getDepartamentos(),
        getMunicipios()
      ]);
      setDepartamentos(Array.isArray(depResponse.data) ? depResponse.data : []);
      const munData = Array.isArray(munResponse.data) ? munResponse.data : [];
      setMunicipios(munData);
      setTodosLosMunicipios(munData); // Guardar todos los municipios
      setError(null);
    } catch (err) {
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchDepartamento = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = filtroDepto.trim() === '' 
        ? await getDepartamentos() 
        : await searchDepartamentosByNombre(filtroDepto);
      setDepartamentos(Array.isArray(response.data) ? response.data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSearchMunicipio = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (filtroMunDane.trim() !== '') {
        const r = await searchMunicipiosByCodigoDane(filtroMunDane);
        setMunicipios(r.data ? [r.data] : []);
      } else if (filtroMunAmenaza !== '') {
        const r = await searchMunicipiosByAmenaza(filtroMunAmenaza);
        setMunicipios(Array.isArray(r.data) ? r.data : []);
      } else if (filtroMunNombre.trim() !== '') {
        const r = await searchMunicipiosByNombre(filtroMunNombre);
        setMunicipios(Array.isArray(r.data) ? r.data : []);
      } else {
        const r = await getMunicipios();
        setMunicipios(Array.isArray(r.data) ? r.data : []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleLimpiarFiltros = async () => {
    setFiltroDepto('');
    setFiltroMunNombre('');
    setFiltroMunDane('');
    setFiltroMunAmenaza('');
    await loadData();
  };

  // ============ FUNCIONES DE MICROZONIFICACIONES ============

  const loadMicrozonificaciones = async (idMunicipio = null) => {
    try {
      setLoading(true);
      let response;
      let microData = [];
      
      if (idMunicipio) {
        response = await getMicrozonificacionesByMunicipio(idMunicipio);
        const data = Array.isArray(response?.data) ? response.data : [];
        microData = data.filter(m => m && m.idMicrozonificacion);
        setMicrozonificaciones(microData);
      } else {
        response = await getMicrozonificaciones();
        const allMicro = Array.isArray(response?.data) ? response.data : [];
        microData = allMicro.filter(m => m && m.idMicrozonificacion);
        setMicrozonificaciones(microData);
        
        // Extraer municipios únicos con microzonificación
        const munIds = [...new Set(microData.map(m => m.municipio?.idMunicipio).filter(Boolean))];
        const munConMicro = todosLosMunicipios.filter(m => munIds.includes(m.idMunicipio));
        setMunicipiosConMicro(munConMicro);
      }
      setError(null);
    } catch (err) {
      console.error('Error al cargar microzonificaciones:', err);
      setMicrozonificaciones([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMunicipioSelect = async (e) => {
    const munId = e.target.value ? parseInt(e.target.value) : null;
    if (munId) {
      const selected = municipios.find(m => m.idMunicipio === munId);
      setMunicipioSeleccionado(selected);
      await loadMicrozonificaciones(munId);
    } else {
      setMunicipioSeleccionado(null);
      setMicrozonificaciones([]);
    }
  };

  const toggleMicroExpandida = async (microId) => {
    if (microExpandida === microId) {
      setMicroExpandida(null);
    } else {
      setMicroExpandida(microId);
      // Cargar todas las zonas y filtrar por micro
      try {
        const response = await getZonas();
        const todasZonas = Array.isArray(response.data) ? response.data : [];
        const zonasDeEstaMicro = todasZonas.filter(z => 
          z.microzonificacion && z.microzonificacion.idMicrozonificacion === microId
        );
        setZonasDeMicro(prev => ({ ...prev, [microId]: zonasDeEstaMicro }));
      } catch (err) {
        console.error('Error al cargar zonas:', err);
      }
    }
  };

  // Modal Nueva/Editar Microzonificación
  const openCreateMicroModal = () => {
    setEditingMicro(null);
    setFormDataMicro({ nombre: '', municipio: null });
    setShowMicroModal(true);
  };

  const openEditMicroModal = (micro) => {
    setEditingMicro(micro);
    setFormDataMicro({
      nombre: micro.nombre || '',
      municipio: micro.municipio || null
    });
    setShowMicroModal(true);
  };

  const handleInputChangeMicro = (e) => {
    const { name, value } = e.target;
    if (name === 'municipio') {
      const selected = municipios.find(m => m.idMunicipio === parseInt(value));
      setFormDataMicro(prev => ({ ...prev, municipio: selected || null }));
    } else {
      setFormDataMicro(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmitMicro = async (e) => {
    e.preventDefault();
    try {
      const data = {
        nombre: formDataMicro.nombre,
        municipio: formDataMicro.municipio
      };
      
      if (editingMicro) {
        await updateMicrozonificacion(editingMicro.idMicrozonificacion, data);
      } else {
        await createMicrozonificacion(data);
      }
      
      setShowMicroModal(false);
      if (municipioSeleccionado) {
        await loadMicrozonificaciones(municipioSeleccionado.idMunicipio);
      } else {
        await loadMicrozonificaciones();
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteMicro = async (micro) => {
    // Verificar si tiene zonas asociadas
    try {
      const response = await getZonas();
      const todasZonas = Array.isArray(response.data) ? response.data : [];
      const zonasAsociadas = todasZonas.filter(z => 
        z.microzonificacion && z.microzonificacion.idMicrozonificacion === micro.idMicrozonificacion
      );
      
      if (zonasAsociadas.length > 0) {
        alert(`No se puede eliminar. Esta microzonificación tiene ${zonasAsociadas.length} zona(s) asociada(s). Elimine primero las zonas.`);
        return;
      }
    } catch (err) {
      console.error('Error al verificar zonas:', err);
    }

    if (!confirm(`¿Eliminar la microzonificación "${micro.nombre}"?`)) return;
    try {
      await deleteMicrozonificacion(micro.idMicrozonificacion);
      if (municipioSeleccionado) {
        await loadMicrozonificaciones(municipioSeleccionado.idMunicipio);
      } else {
        await loadMicrozonificaciones();
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  // Modal Nueva/Editar Zona
  const openCreateZonaModal = (microId) => {
    setMicroParentId(microId);
    setEditingZona(null);
    setFormDataZona({
      zonaRespuestaSismica: 'CERROS',
      fa: 1.0,
      fv: 1.5,
      tc: 0.6,
      tl: 2.0,
      a0: 0.5,
      microzonificacion: null
    });
    setShowZonaModal(true);
  };

  const openEditZonaModal = (zona, microId) => {
    setMicroParentId(microId);
    setEditingZona(zona);
    setFormDataZona({
      zonaRespuestaSismica: zona.zonaRespuestaSismica || 'CERROS',
      fa: zona.fa ?? 1.0,
      fv: zona.fv ?? 1.5,
      tc: zona.tc ?? 0.6,
      tl: zona.tl ?? 2.0,
      a0: zona.a0 ?? 0.5,
      microzonificacion: zona.microzonificacion || null
    });
    setShowZonaModal(true);
  };

  const handleInputChangeZona = (e) => {
    const { name, value } = e.target;
    if (['fa', 'fv', 'tc', 'tl', 'a0'].includes(name)) {
      setFormDataZona(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormDataZona(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmitZona = async (e) => {
    e.preventDefault();
    try {
      const data = {
        zonaRespuestaSismica: formDataZona.zonaRespuestaSismica,
        fa: formDataZona.fa,
        fv: formDataZona.fv,
        tc: formDataZona.tc,
        tl: formDataZona.tl,
        a0: formDataZona.a0,
        microzonificacion: microParentId ? { idMicrozonificacion: microParentId } : null
      };
      
      if (editingZona) {
        await updateZona(editingZona.idZona, data);
      } else {
        await createZona(data);
      }
      
      setShowZonaModal(false);
      // Recargar las zonas de la micro expandida
      if (microExpandida) {
        const response = await getZonas();
        const todasZonas = Array.isArray(response.data) ? response.data : [];
        const zonasActualizadas = todasZonas.filter(z => 
          z.microzonificacion && z.microzonificacion.idMicrozonificacion === microExpandida
        );
        setZonasDeMicro(prev => ({ ...prev, [microExpandida]: zonasActualizadas }));
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteZona = async (zona, microId) => {
    if (!confirm(`¿Eliminar la zona "${zona.zonaRespuestaSismica}"?`)) return;
    try {
      await deleteZona(zona.idZona);
      // Recargar las zonas
      const response = await getZonas();
      const todasZonas = Array.isArray(response.data) ? response.data : [];
      const zonasActualizadas = todasZonas.filter(z => 
        z.microzonificacion && z.microzonificacion.idMicrozonificacion === microId
      );
      setZonasDeMicro(prev => ({ ...prev, [microId]: zonasActualizadas }));
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Convertir coeficientes a número
    if (['aa', 'av', 'ae', 'ad'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDepartamentoSelect = (e) => {
    const deptId = parseInt(e.target.value);
    const selected = departamentos.find(d => d.idDepartamento === deptId);
    setFormData(prev => ({ ...prev, departamento: selected || null }));
  };

  const openCreateModal = (type) => {
    setModalType(type);
    setEditingItem(null);
    setFormData({
      nombre: '',
      codigoDane: '',
      amenazaSismica: 'BAJA',
      aa: 0.05,
      av: 0.05,
      ae: 0.02,
      ad: 0.02,
      departamento: null
    });
    setShowModal(true);
  };

  const openEditModal = (type, item) => {
    setModalType(type);
    setEditingItem(item);
    if (type === 'departamento') {
      setFormData({ nombre: item.nombre || '', codigoDane: '', amenazaSismica: 'BAJA', aa: 0.05, av: 0.05, ae: 0.02, ad: 0.02, departamento: null });
    } else {
      setFormData({ nombre: item.nombre || '', codigoDane: item.codigoDane || '', amenazaSismica: item.amenazaSismica || 'BAJA', aa: item.aa ?? 0.05, av: item.av ?? 0.05, ae: item.ae ?? 0.02, ad: item.ad ?? 0.02, departamento: item.departamento || null });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'departamento') {
        if (editingItem) await updateDepartamento(editingItem.idDepartamento, { nombre: formData.nombre });
        else await createDepartamento({ nombre: formData.nombre });
      } else {
        const data = { nombre: formData.nombre, codigoDane: formData.codigoDane, amenazaSismica: formData.amenazaSismica, aa: formData.aa, av: formData.av, ae: formData.ae, ad: formData.ad, departamento: formData.departamento };
        if (editingItem) await updateMunicipio(editingItem.idMunicipio, data);
        else await createMunicipio(data);
      }
      setShowModal(false);
      loadData();
    } catch (err) { alert('Error: ' + (err.response?.data?.message || err.message)); }
  };

  const handleDelete = async (type, item) => {
    if (!confirm('¿Eliminar ' + (type === 'departamento' ? 'el departamento' : 'el municipio') + ' "' + item.nombre + '"?')) return;
    try {
      if (type === 'departamento') await deleteDepartamento(item.idDepartamento);
      else await deleteMunicipio(item.idMunicipio);
      loadData();
    } catch (err) { alert('Error: ' + (err.response?.data?.message || err.message)); }
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Cargando datos...</p>
    </div>
  );

  return (
    <div className="tabla-colombia-container">
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠</span>
          <span>{error}</span>
          <button onClick={loadData}>Reintentar</button>
        </div>
      )}

      <div className="header">
        <div className="header-title">
          <h1>Appendice A-4 - Codigo NSR-10</h1>
          <h2>Departamentos y Municipios</h2>
          <p className="header-subtitle">Parametros de diseno sismico para municipios de Colombia</p>
        </div>
        <div className="header-buttons">
          {isAdmin && pestañaActiva === 'departamentos' && (
            <button className="btn btn-primary" onClick={() => openCreateModal('departamento')}>+ Nuevo Departamento</button>
          )}
          {isAdmin && pestañaActiva === 'municipios' && (
            <button className="btn btn-success" onClick={() => openCreateModal('municipio')}>+ Nuevo Municipio</button>
          )}
          {isAdmin && pestañaActiva === 'microzonificaciones' && (
            <button className="btn btn-success" onClick={openCreateMicroModal}>+ Nueva Microzonificación</button>
          )}
        </div>
      </div>

      {/* Sistema de Pestañas */}
      <div className="tabs-container">
        <button 
          className={`tab-button ${pestañaActiva === 'departamentos' ? 'active' : ''}`}
          onClick={() => setPestañaActiva('departamentos')}
        >
          Departamentos
        </button>
        <button 
          className={`tab-button ${pestañaActiva === 'municipios' ? 'active' : ''}`}
          onClick={() => setPestañaActiva('municipios')}
        >
          Municipios
        </button>
        <button 
          className={`tab-button ${pestañaActiva === 'microzonificaciones' ? 'active' : ''}`}
          onClick={() => {
            setPestañaActiva('microzonificaciones');
            loadMicrozonificaciones();
          }}
        >
          Microzonificaciones
        </button>
      </div>

      {/* Pestaña Departamentos */}
      {pestañaActiva === 'departamentos' && (
      <section className="section">
        <h2>Departamentos ({departamentos.length})</h2>
        <form className="search-bar" onSubmit={handleSearchDepartamento}>
          <input type="text" placeholder="Buscar departamento..." value={filtroDepto} onChange={(e) => setFiltroDepto(e.target.value)} />
          <button type="submit" className="btn btn-primary">Buscar</button>
          <button type="button" className="btn btn-cancel" onClick={handleLimpiarFiltros}>Limpiar</button>
        </form>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Municipios</th><th>Acciones</th></tr></thead>
            <tbody>
              {(!departamentos || departamentos.length === 0) ? <tr><td colSpan="4" className="empty-message">No hay departamentos</td></tr> :
                departamentos.map(dept => (
                  <tr key={dept.idDepartamento}>
                    <td>{dept.idDepartamento}</td>
                    <td>{dept.nombre}</td>
                    <td>{(municipios || []).filter(m => m.departamento && m.departamento.idDepartamento === dept.idDepartamento).length}</td>
                    <td className="actions">
                      {isAdmin && (
                        <>
                          <button className="btn btn-edit" onClick={() => openEditModal('departamento', dept)}>Editar</button>
                          <button className="btn btn-delete" onClick={() => handleDelete('departamento', dept)}>Eliminar</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* Pestaña Municipios */}
      {pestañaActiva === 'municipios' && (
      <section className="section">
        <h2>Municipios ({municipios.length})</h2>
        <form className="search-bar search-bar-mun" onSubmit={handleSearchMunicipio}>
          <input type="text" placeholder="Buscar por nombre..." value={filtroMunNombre} onChange={(e) => setFiltroMunNombre(e.target.value)} />
          <input type="text" placeholder="Buscar por codigo Dane..." value={filtroMunDane} onChange={(e) => setFiltroMunDane(e.target.value)} />
          <select value={filtroMunAmenaza} onChange={(e) => setFiltroMunAmenaza(e.target.value)}>
            <option value="">Amenaza</option>
            {AMENAZA_SISMICA_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">Buscar</button>
          <button type="button" className="btn btn-cancel" onClick={handleLimpiarFiltros}>Limpiar</button>
        </form>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Codigo Dane</th><th>Departamento</th><th>Amenaza</th><th>Aa</th><th>Av</th><th>Ae</th><th>Ad</th><th>Acciones</th></tr></thead>
            <tbody>
              {(!municipios || municipios.length === 0) ? <tr><td colSpan="10" className="empty-message">No hay municipios</td></tr> :
                municipios.map(mun => (
                  <tr key={mun.idMunicipio}>
                    <td>{mun.idMunicipio}</td>
                    <td>{mun.nombre}</td>
                    <td>{mun.codigoDane}</td>
                    <td>{mun.departamento ? mun.departamento.nombre : 'Sin asignar'}</td>
                    <td><span className={'badge badge-' + (mun.amenazaSismica ? mun.amenazaSismica.toLowerCase() : 'baja')}>{mun.amenazaSismica}</span></td>
                    <td>{mun.aa != null ? mun.aa : '-'}</td>
                    <td>{mun.av != null ? mun.av : '-'}</td>
                    <td>{mun.ae != null ? mun.ae : '-'}</td>
                    <td>{mun.ad != null ? mun.ad : '-'}</td>
                    <td className="actions">
                      {isAdmin && (
                        <>
                          <button className="btn btn-edit" onClick={() => openEditModal('municipio', mun)}>Editar</button>
                          <button className="btn btn-delete" onClick={() => handleDelete('municipio', mun)}>Eliminar</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* Pestaña Microzonificaciones */}
      {pestañaActiva === 'microzonificaciones' && (
      <section className="section">
        <h2>Microzonificaciones</h2>
        
        {/* Selector de Municipio */}
        <div className="micro-selector">
          <label htmlFor="municipio-select">Seleccionar Municipio:</label>
          <select 
            id="municipio-select" 
            value={municipioSeleccionado ? municipioSeleccionado.idMunicipio : ''}
            onChange={handleMunicipioSelect}
          >
            <option value="">-- Seleccione un municipio --</option>
            {municipiosConMicro.map(mun => (
              <option key={mun.idMunicipio} value={mun.idMunicipio}>
                {mun.nombre} ({mun.codigoDane})
              </option>
            ))}
          </select>
        </div>

        {/* Tabla de Microzonificaciones */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Municipio</th>
                <th>Codigo Dane</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(!microzonificaciones || microzonificaciones.length === 0) ? (
                <tr>
                  <td colSpan="5" className="empty-message">
                    {municipioSeleccionado 
                      ? 'No hay microzonificaciones para este municipio' 
                      : 'Seleccione un municipio para ver sus microzonificaciones'}
                  </td>
                </tr>
              ) : (
                microzonificaciones.map(micro => (
                  <React.Fragment key={micro.idMicrozonificacion}>
                    <tr className="micro-row">
                      <td>{micro.idMicrozonificacion}</td>
                      <td>
                        <button 
                          className="btn-expand"
                          onClick={() => toggleMicroExpandida(micro.idMicrozonificacion)}
                        >
                          {microExpandida === micro.idMicrozonificacion ? '▼' : '▶'}
                        </button>
                        {micro.nombre}
                      </td>
                      <td>{micro.municipio ? micro.municipio.nombre : '-'}</td>
                      <td>{micro.municipio ? micro.municipio.codigoDane : '-'}</td>
                      <td className="actions">
                        {isAdmin && (
                          <>
                            <button className="btn btn-edit" onClick={() => openEditMicroModal(micro)}>Editar</button>
                            <button className="btn btn-delete" onClick={() => handleDeleteMicro(micro)}>Eliminar</button>
                          </>
                        )}
                      </td>
                    </tr>
                    {/* Filas expandibles de Zonas */}
                    {microExpandida === micro.idMicrozonificacion && (
                      <tr className="zonas-row">
                        <td colSpan="5">
                          <div className="zonas-container">
                            <div className="zonas-header">
                              <h4>Zonas de Respuesta Sísmica</h4>
                              {isAdmin && (
                                <button className="btn btn-small btn-success" onClick={() => openCreateZonaModal(micro.idMicrozonificacion)}>
                                  + Agregar Zona
                                </button>
                              )}
                            </div>
                            <table className="data-table zonas-table">
                              <thead>
                                <tr>
                                  <th>Zona</th>
                                  <th>Fa</th>
                                  <th>Fv</th>
                                  <th>Tc</th>
                                  <th>Tl</th>
                                  <th>A0</th>
                                  <th>Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(!zonasDeMicro[micro.idMicrozonificacion] || zonasDeMicro[micro.idMicrozonificacion].length === 0) ? (
                                  <tr>
                                    <td colSpan="7" className="empty-message">No hay zonas definidas</td>
                                  </tr>
                                ) : (
                                  zonasDeMicro[micro.idMicrozonificacion].map(zona => (
                                    <tr key={zona.idZona}>
                                      <td>{ZONA_RESPUESTA_SISMICA_OPTIONS.find(o => o.value === zona.zonaRespuestaSismica)?.label || zona.zonaRespuestaSismica}</td>
                                      <td>{zona.fa != null ? zona.fa : '-'}</td>
                                      <td>{zona.fv != null ? zona.fv : '-'}</td>
                                      <td>{zona.tc != null ? zona.tc : '-'}</td>
                                      <td>{zona.tl != null ? zona.tl : '-'}</td>
                                      <td>{zona.a0 != null ? zona.a0 : '-'}</td>
                                      <td className="actions">
                                        {isAdmin && (
                                          <>
                                            <button className="btn btn-edit btn-small" onClick={() => openEditZonaModal(zona, micro.idMicrozonificacion)}>Editar</button>
                                            <button className="btn btn-delete btn-small" onClick={() => handleDeleteZona(zona, micro.idMicrozonificacion)}>Eliminar</button>
                                          </>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{(editingItem ? 'Editar' : 'Nuevo') + ' ' + (modalType === 'departamento' ? 'Departamento' : 'Municipio')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>x</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Nombre *</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required placeholder="Ingrese el nombre" />
              </div>
              {modalType === 'municipio' && (
                <>
                  <div className="form-group">
                    <label>Codigo Dane</label>
                    <input type="text" name="codigoDane" value={formData.codigoDane} onChange={handleInputChange} placeholder="Ingrese el codigo Dane" />
                  </div>
                  <div className="form-group">
                    <label>Departamento *</label>
                    <select name="departamento" value={formData.departamento ? formData.departamento.idDepartamento : ''} onChange={handleDepartamentoSelect} required>
                      <option value="">Seleccione un departamento</option>
                      {departamentos.map(d => <option key={d.idDepartamento} value={d.idDepartamento}>{d.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amenaza Sisimica</label>
                    <select name="amenazaSismica" value={formData.amenazaSismica} onChange={handleInputChange}>
                      {AMENAZA_SISMICA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Coeficiente Aa</label>
                      <input type="number" name="aa" value={String(formData.aa)} onChange={handleInputChange} min="0" max="1" step="0.01" />
                    </div>
                    <div className="form-group">
                      <label>Coeficiente Av</label>
                      <input type="number" name="av" value={String(formData.av)} onChange={handleInputChange} min="0" max="1" step="0.01" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Coeficiente Ae</label>
                      <input type="number" name="ae" value={String(formData.ae)} onChange={handleInputChange} min="0" max="1" step="0.01" />
                    </div>
                    <div className="form-group">
                      <label>Coeficiente Ad</label>
                      <input type="number" name="ad" value={String(formData.ad)} onChange={handleInputChange} min="0" max="1" step="0.01" />
                    </div>
                  </div>
                </>
              )}
              <div className="form-actions">
                <button type="button" className="btn btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-submit">{editingItem ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
)}

      {/* Modal de Microzonificación */}
      {showMicroModal && (
        <div className="modal-overlay" onClick={() => setShowMicroModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingMicro ? 'Editar' : 'Nueva'} Microzonificación</h2>
              <button className="modal-close" onClick={() => setShowMicroModal(false)}>x</button>
            </div>
            <form onSubmit={handleSubmitMicro} className="modal-form">
              <div className="form-group">
                <label>Nombre *</label>
                <input 
                  type="text" 
                  name="nombre" 
                  value={formDataMicro.nombre} 
                  onChange={handleInputChangeMicro} 
                  required 
                  placeholder="Ej: Coeficientes de umbral de daño" 
                />
              </div>
              <div className="form-group">
                <label>Municipio *</label>
                <select 
                  name="municipio" 
                  value={formDataMicro.municipio ? formDataMicro.municipio.idMunicipio : ''} 
                  onChange={handleInputChangeMicro}
                  required
                >
                  <option value="">Seleccione un municipio</option>
                  {municipios.map(mun => (
                    <option key={mun.idMunicipio} value={mun.idMunicipio}>
                      {mun.nombre} ({mun.codigoDane})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-cancel" onClick={() => setShowMicroModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-submit">{editingMicro ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Zona */}
      {showZonaModal && (
        <div className="modal-overlay" onClick={() => setShowZonaModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingZona ? 'Editar' : 'Nueva'} Zona de Respuesta Sísmica</h2>
              <button className="modal-close" onClick={() => setShowZonaModal(false)}>x</button>
            </div>
            <form onSubmit={handleSubmitZona} className="modal-form">
              <div className="form-group">
                <label>Zona de Respuesta Sísmica *</label>
                <select 
                  name="zonaRespuestaSismica" 
                  value={formDataZona.zonaRespuestaSismica} 
                  onChange={handleInputChangeZona}
                  required
                >
                  {ZONA_RESPUESTA_SISMICA_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Fa</label>
                  <input 
                    type="number" 
                    name="fa" 
                    value={String(formDataZona.fa)} 
                    onChange={handleInputChangeZona} 
                    min={COEFICIENTE_ZONA.MIN} 
                    max={COEFICIENTE_ZONA.MAX} 
                    step={COEFICIENTE_ZONA.STEP} 
                  />
                </div>
                <div className="form-group">
                  <label>Fv</label>
                  <input 
                    type="number" 
                    name="fv" 
                    value={String(formDataZona.fv)} 
                    onChange={handleInputChangeZona} 
                    min={COEFICIENTE_ZONA.MIN} 
                    max={COEFICIENTE_ZONA.MAX} 
                    step={COEFICIENTE_ZONA.STEP} 
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tc</label>
                  <input 
                    type="number" 
                    name="tc" 
                    value={String(formDataZona.tc)} 
                    onChange={handleInputChangeZona} 
                    min={COEFICIENTE_ZONA.MIN} 
                    max={COEFICIENTE_ZONA.MAX} 
                    step={COEFICIENTE_ZONA.STEP} 
                  />
                </div>
                <div className="form-group">
                  <label>Tl</label>
                  <input 
                    type="number" 
                    name="tl" 
                    value={String(formDataZona.tl)} 
                    onChange={handleInputChangeZona} 
                    min={COEFICIENTE_ZONA.MIN} 
                    max={COEFICIENTE_ZONA.MAX} 
                    step={COEFICIENTE_ZONA.STEP} 
                  />
                </div>
              </div>
              <div className="form-group">
                <label>A0</label>
                <input 
                  type="number" 
                  name="a0" 
                  value={String(formDataZona.a0)} 
                  onChange={handleInputChangeZona} 
                  min={COEFICIENTE_ZONA.MIN} 
                  max={COEFICIENTE_ZONA.MAX} 
                  step={COEFICIENTE_ZONA.STEP} 
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-cancel" onClick={() => setShowZonaModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-submit">{editingZona ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Copyright © Juan Miguel Tarazona 2026</p>
      </footer>
    </div>
  );
}

export default TablaColombia;