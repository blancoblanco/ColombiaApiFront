import { useState, useEffect } from 'react';
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
  deleteMunicipio
} from '../../services/api';
import {
  AMENAZA_SISMICA_OPTIONS,
  COEFICIENTE_AA_OPTIONS,
  COEFICIENTE_AV_OPTIONS,
  COEFICIENTE_AE_OPTIONS,
  COEFICIENTE_AD_OPTIONS
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
    aa: 'A_005',
    av: 'AV_005',
    ae: 'AE_002',
    ad: 'AD_002',
    departamento: null
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
      setMunicipios(Array.isArray(munResponse.data) ? munResponse.data : []);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      aa: 'A_005',
      av: 'AV_005',
      ae: 'AE_002',
      ad: 'AD_002',
      departamento: null
    });
    setShowModal(true);
  };

  const openEditModal = (type, item) => {
    setModalType(type);
    setEditingItem(item);
    if (type === 'departamento') {
      setFormData({ nombre: item.nombre || '', codigoDane: '', amenazaSismica: 'BAJA', aa: 'A_005', av: 'AV_005', ae: 'AE_002', ad: 'AD_002', departamento: null });
    } else {
      setFormData({ nombre: item.nombre || '', codigoDane: item.codigoDane || '', amenazaSismica: item.amenazaSismica || 'BAJA', aa: item.aa || 'A_005', av: item.av || 'AV_005', ae: item.ae || 'AE_002', ad: item.ad || 'AD_002', departamento: item.departamento || null });
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
          {isAdmin && (
            <>
              <button className="btn btn-primary" onClick={() => openCreateModal('departamento')}>+ Nuevo Departamento</button>
              <button className="btn btn-success" onClick={() => openCreateModal('municipio')}>+ Nuevo Municipio</button>
            </>
          )}
        </div>
      </div>

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
                    <td>{mun.aa ? mun.aa.replace('A_', '') : '-'}</td>
                    <td>{mun.av ? mun.av.replace('AV_', '') : '-'}</td>
                    <td>{mun.ae ? mun.ae.replace('AE_', '') : '-'}</td>
                    <td>{mun.ad ? mun.ad.replace('AD_', '') : '-'}</td>
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
                      <select name="aa" value={formData.aa} onChange={handleInputChange}>
                        {COEFICIENTE_AA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Coeficiente Av</label>
                      <select name="av" value={formData.av} onChange={handleInputChange}>
                        {COEFICIENTE_AV_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Coeficiente Ae</label>
                      <select name="ae" value={formData.ae} onChange={handleInputChange}>
                        {COEFICIENTE_AE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Coeficiente Ad</label>
                      <select name="ad" value={formData.ad} onChange={handleInputChange}>
                        {COEFICIENTE_AD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
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

      <footer className="footer">
        <p>Copyright © Juan Miguel Tarazona 2026</p>
      </footer>
    </div>
  );
}

export default TablaColombia;