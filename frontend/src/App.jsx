import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Brush, Layout, Image as ImageIcon,
  ChevronRight, Sparkles, Box, Grid3X3,
  ListTodo, ChevronDown, ChevronUp, Loader2,
  Check, AlertCircle, Download, Clock, X, Printer, FolderKanban, Layers
} from 'lucide-react';
import Localizado from './components/Localizado';
import Continuo from './components/Continuo';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000/api' : '/api';

const EXTRA_THEMES = [
  '#10b981', // emerald
  '#f59e0b', // amber
  '#6366f1', // indigo
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#a855f7', // purple
  '#0284c7', // sky
  '#ea580c', // orange
];

export default function App() {
  const [mode, setMode] = useState(null); // 'LOCALIZADO' | 'CONTINUO' | null
  const [opciones, setOpciones] = useState({});
  const [loading, setLoading] = useState(true);

  // Context filters & pre-selections synced with hybrid bar
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedDesigner, setSelectedDesigner] = useState(null); // { name, role: 'GRAFICO' | 'MODA' }
  const [drawerFilter, setDrawerFilter] = useState('ALL'); // 'ALL' | 'LOCALIZADO' | 'CONTINUO' | 'COMPLETED'
  const [expandedGroups, setExpandedGroups] = useState({ LOCALIZADO: true, CONTINUO: true });

  // Task queue state
  const [tasks, setTasks] = useState([]);
  const [activeTaskIds, setActiveTaskIds] = useState([]);
  const [queuePanelOpen, setQueuePanelOpen] = useState(false);
  const [isLocal, setIsLocal] = useState(true);

  useEffect(() => {
    fetchOptions();
    fetchConfig();
  }, []);

  // Polling tasks from backend every 3 seconds
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get(`${API_BASE}/tasks`);
        setTasks(res.data);
      } catch (err) {
        console.error("Error al obtener tareas:", err);
      }
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  // Automatic download logic when background task is completed
  useEffect(() => {
    activeTaskIds.forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        if (task.estado === 'completed') {
          setActiveTaskIds(prev => prev.filter(tid => tid !== id));
          descargarFicha(task.id, task.referencia, task.tipo);
        } else if (task.estado === 'failed') {
          setActiveTaskIds(prev => prev.filter(tid => tid !== id));
        }
      }
    });
  }, [tasks, activeTaskIds]);

  const fetchOptions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/opciones`);
      setOpciones(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await axios.get(`${API_BASE}/config`);
      setIsLocal(res.data.is_local);
    } catch (err) {
      console.error("Error al obtener config:", err);
    }
  };

  const addActiveTask = (id) => {
    setActiveTaskIds(prev => [...prev, id]);
    setQueuePanelOpen(true);
  };

  const descargarFicha = (taskId, referencia, tipo) => {
    const link = document.createElement('a');
    link.href = `${API_BASE}/tasks/${taskId}/download`;
    const ext = tipo === 'CONTINUO' ? 'zip' : 'xlsm';
    link.setAttribute('download', `${referencia || 'Ficha'}.${ext}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc]">
        <div className="w-12 h-12 border-3 border-[#e2e8f0] border-t-[#4f46e5] rounded-full animate-spin mb-4" />
        <p className="text-[#0f172a] font-extrabold tracking-[2.2px] uppercase text-xs">
          EQUIPO AG LAB • CARGANDO ESTUDIO...
        </p>
      </div>
    );
  }

  const pendingCount = tasks.filter(t => t.estado === 'queued' || t.estado === 'processing').length;
  const completedCount = tasks.filter(t => t.estado === 'completed').length;

  const fechaHoy = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  // Build team profiles list from opciones
  const teamProfiles = [
    ...(opciones.dis_graf || []).map((name, i) => ({
      name,
      role: 'Diseño Gráfico',
      type: 'GRAFICO',
      initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      color: EXTRA_THEMES[i % EXTRA_THEMES.length]
    })),
    ...(opciones.dis_mod || []).map((name, i) => ({
      name,
      role: 'Diseño de Moda',
      type: 'MODA',
      initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      color: EXTRA_THEMES[(i + 3) % EXTRA_THEMES.length]
    }))
  ];

  const filteredTasks = tasks.filter(t => {
    if (drawerFilter === 'LOCALIZADO') return t.tipo === 'LOCALIZADO';
    if (drawerFilter === 'CONTINUO') return t.tipo === 'CONTINUO';
    if (drawerFilter === 'COMPLETED') return t.estado === 'completed';
    return true;
  });

  const tasksByType = {
    LOCALIZADO: filteredTasks.filter(t => t.tipo === 'LOCALIZADO'),
    CONTINUO: filteredTasks.filter(t => t.tipo === 'CONTINUO')
  };

  return (
    <div className="app-shell">
      {/* ====================================================================
          1. TOP HEADER (.top-header)
         ==================================================================== */}
      <header className="top-header">
        <div className="brand-title">
          <div
            className="brand-logo-wrap"
            onClick={() => setMode(null)}
            title="Volver al inicio — AG LAB"
          >
            <img src="/ag-b.png" alt="AG LAB" className="brand-logo-img" />
          </div>
          <div>
            <div className="brand-header-row">
              <h1 onClick={() => setMode(null)}>DISEÑO TEXTIL AGLAB</h1>
              <span className="badge-version" title="Versión activa del sistema">
                📄 StudioFabric v2.0
              </span>
              <span className="badge-cloud">
                {isLocal ? '💻 Guardado Local Activo' : '☁️ Descarga Directa Web'}
              </span>
              <span className="today-pill-badge" title="Fecha actual de generación">
                ● Hoy: {fechaHoy}
              </span>
            </div>
            <div className="brand-slogan">
              Sistema editorial de fichas técnicas de estampación localizada y continua • Investigar•Crear &amp; Trascender
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            onClick={() => setMode('LOCALIZADO')}
            className={mode === 'LOCALIZADO' ? 'btn-editorial-dark' : 'btn-editorial-outline'}
          >
            <Box className="w-3.5 h-3.5" />
            <span>+ Ficha Localizada</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('CONTINUO')}
            className={mode === 'CONTINUO' ? 'btn-editorial-dark' : 'btn-editorial-outline'}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>+ Ficha Continua</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn-editorial-outline"
            title="Exportar vista actual en formato horizontal PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF Horizontal</span>
          </button>

          <button
            type="button"
            onClick={() => setQueuePanelOpen(true)}
            className="btn-filter-main"
            title="Abrir Drawer Lateral de Cola de Generación"
          >
            <ListTodo className="w-3.5 h-3.5 text-indigo-300" />
            <span>Cola de Fichas</span>
            <span className="unified-filter-badge">
              {pendingCount > 0 ? `${pendingCount} activas` : tasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode(null)}
            className="user-chip-btn"
            title="Selector de flujo y perfiles AG LAB"
          >
            <span className="user-avatar-xs">
              {selectedDesigner ? selectedDesigner.initials : 'AG'}
            </span>
            <span>{selectedDesigner ? selectedDesigner.name.split(' ')[0] : 'EQUIPO AG LAB'}</span>
            <span style={{ fontSize: '10px', opacity: 0.7 }}>▾</span>
          </button>
        </div>
      </header>

      {/* ====================================================================
          2. HYBRID FILTER & CONTEXT BAR (.controls-panel -> .quick-controls-bar)
         ==================================================================== */}
      <section className="controls-panel">
        <div className="quick-controls-bar">
          {/* Píldoras de contexto monoespaciadas */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="camp-pill">
              #{mode ? mode : 'ESTUDIO_CENTRAL'}
            </span>
            <span className="camp-pill camp-pill-neutral">
              #Telas:{opciones.tela_base?.length || 0}
            </span>
            <span className="camp-pill camp-pill-neutral">
              #Campañas:{opciones.campana?.length || 0}
            </span>
          </div>

          <div className="controls-divider" />

          {/* Selector segmentado de Marca (Todas | Livva | Azzorti | Azz Livv) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider hidden sm:inline">
              Marca:
            </span>
            <div className="brand-pills">
              {[
                { id: 'ALL', label: 'Todas' },
                { id: 'LIVVA', label: 'Livva' },
                { id: 'AZZORTI', label: 'Azzorti' },
                { id: 'AZZ LIVV', label: 'Azz Livv' }
              ].map(b => (
                <button
                  key={b.id}
                  type="button"
                  data-brand={b.id}
                  onClick={() => setSelectedBrand(b.id)}
                  className={`brand-pill ${selectedBrand === b.id ? 'active' : ''}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="controls-divider hidden md:block" />

          {/* Avatares desplazables del equipo */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full flex-1">
            {teamProfiles.slice(0, 8).map((prof) => {
              const isSelected = selectedDesigner?.name === prof.name;
              return (
                <button
                  key={`${prof.type}-${prof.name}`}
                  type="button"
                  style={{ '--user-color': prof.color }}
                  onClick={() => setSelectedDesigner(isSelected ? null : prof)}
                  className={`team-avatar-pill shrink-0 ${isSelected ? 'selected' : ''}`}
                  title={`${prof.name} (${prof.role}) — Clic para preseleccionar en fichas`}
                >
                  <span className="avatar-circle">{prof.initials}</span>
                  <span>{prof.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Mini Brand Logos in Bar */}
          <div className="hidden lg:flex items-center gap-4 ml-auto pl-2">
            <img src="/AZZORTI.png" alt="Azzorti" className="brand-foot-logo logo-azzorti" style={{ maxHeight: '14px' }} />
            <span className="brand-foot-divider" style={{ height: '14px' }} />
            <img src="/LIVVA.png" alt="Livva" className="brand-foot-logo logo-livva" style={{ maxHeight: '13px' }} />
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. MAIN WORKSPACE (.editorial-workspace)
         ==================================================================== */}
      <main className="editorial-workspace">
        {mode === 'LOCALIZADO' ? (
          <div className="w-full max-w-5xl slide-up">
            <Localizado
              opciones={opciones}
              onBack={() => setMode(null)}
              onQueueTask={addActiveTask}
              isLocal={isLocal}
              selectedBrand={selectedBrand}
              onSelectBrand={setSelectedBrand}
              selectedDesigner={selectedDesigner}
            />
          </div>
        ) : mode === 'CONTINUO' ? (
          <div className="w-full max-w-5xl slide-up">
            <Continuo
              opciones={opciones}
              onBack={() => setMode(null)}
              onQueueTask={addActiveTask}
              isLocal={isLocal}
              selectedBrand={selectedBrand}
              onSelectBrand={setSelectedBrand}
              selectedDesigner={selectedDesigner}
            />
          </div>
        ) : (
          /* Minimalist Crew & Editorial Selector Card (.login-card) */
          <div className="login-card">
            <div className="login-header-hero">
              <div className="login-eyebrow">EQUIPO AG LAB</div>
              <h2 className="login-hero-title">DISEÑO TEXTIL AGLAB</h2>
              <p className="login-hero-sub">
                Selecciona el flujo de trabajo para construir tu nueva ficha técnica de estampación o elige tu perfil de diseñador para preconfigurar tus datos.
              </p>
            </div>

            {/* Primary Workflow Modules (2 Editorial Cards with 4px Brand Left Border) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {/* Module 1: Estampado Localizado */}
              <button
                type="button"
                onClick={() => setMode('LOCALIZADO')}
                className="editorial-module-card group"
                style={{ '--card-accent': '#4f46e5' }}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5">
                      <span className="login-user-avatar">EL</span>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-[#4f46e5] block">
                          FLUJO POSICIONAL • 4 PASOS
                        </span>
                        <h3 className="text-xl font-extrabold text-black tracking-tight">
                          Estampado Localizado
                        </h3>
                      </div>
                    </div>
                    <span className="camp-pill">#XLSM</span>
                  </div>
                  <p className="text-[#475569] text-[13px] leading-relaxed mb-5">
                    Ideal para camisetas, buzos y piezas únicas con artes específicos en posiciones fijas, cálculo inteligente de % de cubrimiento y armonía de color Pantone.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#f1f5f9]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="camp-pill camp-pill-neutral">#RoperoCAD</span>
                    <span className="camp-pill camp-pill-neutral">#Molde</span>
                    <span className="camp-pill camp-pill-neutral">#Cubrimiento</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-black group-hover:translate-x-1 transition-transform">
                    Crear Ficha <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </button>

              {/* Module 2: Estampado Continuo */}
              <button
                type="button"
                onClick={() => setMode('CONTINUO')}
                className="editorial-module-card group"
                style={{ '--card-accent': '#e11d48' }}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5">
                      <span className="login-user-avatar">EC</span>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-[#e11d48] block">
                          FLUJO MULTITELA • 3 PASOS
                        </span>
                        <h3 className="text-xl font-extrabold text-black tracking-tight">
                          Estampado Continuo
                        </h3>
                      </div>
                    </div>
                    <span className="camp-pill" style={{ background: '#ffe4e6', color: '#e11d48', borderColor: '#fb7185' }}>
                      #LOTE_ZIP
                    </span>
                  </div>
                  <p className="text-[#475569] text-[13px] leading-relaxed mb-5">
                    Perfecto para patterns repetitivos, sublimación o estampación por rollo y textiles continuos generados simultáneamente sobre múltiples bases textiles.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#f1f5f9]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="camp-pill camp-pill-neutral">#Sublimación</span>
                    <span className="camp-pill camp-pill-neutral">#Estampación</span>
                    <span className="camp-pill camp-pill-neutral">#MultiTela</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-black group-hover:translate-x-1 transition-transform">
                    Crear Ficha <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </button>
            </div>

            {/* Crew Profiles Grid (Minimalist Crew Layout - 3 Columns) */}
            {teamProfiles.length > 0 && (
              <div className="pt-5 border-t border-[#f1f5f9]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-[1.8px] text-[#64748b]">
                    PERFILES DE DISEÑO (PRECONFIGURACIÓN RÁPIDA)
                  </span>
                  {selectedDesigner && (
                    <button
                      type="button"
                      onClick={() => setSelectedDesigner(null)}
                      className="text-[11px] font-bold text-[#e11d48] hover:underline"
                    >
                      Limpiar perfil activo ({selectedDesigner.name})
                    </button>
                  )}
                </div>

                <div className="login-users-grid">
                  {teamProfiles.slice(0, 6).map((prof) => {
                    const isSelected = selectedDesigner?.name === prof.name;
                    return (
                      <button
                        key={`${prof.type}-${prof.name}`}
                        type="button"
                        onClick={() => setSelectedDesigner(isSelected ? null : prof)}
                        className="login-user-card"
                        style={isSelected ? { borderColor: '#000000', background: '#f8fafc' } : {}}
                      >
                        <span className="login-user-avatar">{prof.initials}</span>
                        <div className="login-user-meta">
                          <div className="login-user-name">
                            <span>{prof.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#10b981]" />}
                          </div>
                          <div className="login-user-role">{prof.role}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Official Brand Logos Footer (ag-b.png, AZZORTI.png, LIVVA.png) */}
            <footer className="login-footer-brands">
              <div className="login-brands-track">
                <img src="/ag-b.png" alt="AG LAB" className="brand-foot-logo logo-agb" title="AG LAB — Laboratorio de Moda" />
                <span className="brand-foot-divider" />
                <img src="/AZZORTI.png" alt="AZZORTI" className="brand-foot-logo logo-azzorti" title="Azzorti" />
                <span className="brand-foot-divider" />
                <img src="/LIVVA.png" alt="LIVVA" className="brand-foot-logo logo-livva" title="Livva" />
              </div>
            </footer>
          </div>
        )}
      </main>

      {/* ====================================================================
          4. HIERARCHICAL RIGHT DRAWER (.drawer-backdrop -> .unified-drawer)
         ==================================================================== */}
      {queuePanelOpen && (
        <div
          className="drawer-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQueuePanelOpen(false);
          }}
        >
          <aside className="unified-drawer">
            {/* Soft Lavender Header (#faf5ff) */}
            <div className="drawer-header">
              <div>
                <div className="drawer-title-row">
                  <FolderKanban className="w-4 h-4 text-[#6d28d9]" />
                  <h3>COLA DE GENERACIÓN &amp; HISTORIAL DE FICHAS</h3>
                </div>
                <p className="drawer-subtitle">
                  Árbol jerárquico Área ➔ Proceso ➔ Fichas técnicas generadas en esta sesión.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQueuePanelOpen(false)}
                className="drawer-close-btn"
                title="Cerrar panel"
              >
                ✕
              </button>
            </div>

            {/* Color Presets Bar (.drawer-presets-bar) */}
            <div className="drawer-presets-bar">
              <span className="drawer-presets-label">FILTROS RÁPIDOS POR ÁREA / PROCESO</span>
              <div className="drawer-presets-btns">
                <button
                  type="button"
                  onClick={() => setDrawerFilter('ALL')}
                  className={`preset-pill-btn preset-all ${drawerFilter === 'ALL' ? 'ring-2 ring-emerald-500' : ''}`}
                >
                  ✓ Todas ({tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerFilter('LOCALIZADO')}
                  className={`preset-pill-btn preset-aglab ${drawerFilter === 'LOCALIZADO' ? 'ring-2 ring-violet-500' : ''}`}
                >
                  AG LAB • Localizado ({tasks.filter(t => t.tipo === 'LOCALIZADO').length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerFilter('CONTINUO')}
                  className={`preset-pill-btn preset-disgraf ${drawerFilter === 'CONTINUO' ? 'ring-2 ring-amber-500' : ''}`}
                >
                  DisGraf • Continuo ({tasks.filter(t => t.tipo === 'CONTINUO').length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerFilter('COMPLETED')}
                  className={`preset-pill-btn preset-ingenieria ${drawerFilter === 'COMPLETED' ? 'ring-2 ring-sky-500' : ''}`}
                >
                  Ingeniería • Listas ({completedCount})
                </button>
              </div>
            </div>

            {/* Hierarchical Collapsible Tree Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#f8fafc]">
              {filteredTasks.length === 0 ? (
                <div className="bg-white border border-[#e2e8f0] rounded-xl p-10 text-center">
                  <Clock className="w-8 h-8 text-[#94a3b8] mx-auto mb-2" />
                  <p className="text-[#0f172a] font-bold text-sm">No hay fichas en esta vista</p>
                  <p className="text-[#64748b] text-xs mt-1">
                    Las fichas localizadas y continuas que generes aparecerán aquí con descarga automática.
                  </p>
                </div>
              ) : (
                ['LOCALIZADO', 'CONTINUO'].map((groupType) => {
                  const groupTasks = tasksByType[groupType] || [];
                  if (groupTasks.length === 0) return null;
                  const isExpanded = expandedGroups[groupType];
                  const isLoc = groupType === 'LOCALIZADO';

                  return (
                    <div
                      key={groupType}
                      className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-xs"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedGroups(prev => ({ ...prev, [groupType]: !prev[groupType] }))
                        }
                        className="w-full flex items-center justify-between px-4 py-3 bg-[#f1f5f9] hover:bg-[#e2e8f0]/60 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: isLoc ? '#8b5cf6' : '#f59e0b' }}
                          />
                          <span className="font-extrabold text-xs uppercase tracking-wider text-[#0f172a]">
                            {isLoc ? 'ÁREA DISEÑO ➔ ESTAMPADO LOCALIZADO' : 'ÁREA TEXTIL ➔ ESTAMPADO CONTINUO'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="camp-pill">
                            {groupTasks.length} DH/Fichas
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="divide-y divide-[#f1f5f9] p-3 space-y-2.5">
                          {groupTasks.map((task) => {
                            const isPending = task.estado === 'queued' || task.estado === 'processing';
                            const isCompleted = task.estado === 'completed';
                            const isFailed = task.estado === 'failed';
                            const isActive = activeTaskIds.includes(task.id);

                            const borderLeftColor = isFailed
                              ? '#ef4444'
                              : isCompleted
                              ? '#10b981'
                              : '#eab308';

                            const statusBg = isFailed
                              ? '#fef2f2'
                              : isCompleted
                              ? '#f0fdf4'
                              : '#fefce8';

                            return (
                              <div
                                key={task.id}
                                className="p-3.5 rounded-lg border border-[#e2e8f0] transition-all"
                                style={{
                                  borderLeftWidth: '4px',
                                  borderLeftColor,
                                  background: statusBg
                                }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full"
                                        style={
                                          task.tipo === 'LOCALIZADO'
                                            ? { background: '#ede9fe', color: '#6d28d9' }
                                            : { background: '#fef3c7', color: '#b45309' }
                                        }
                                      >
                                        {task.tipo}
                                      </span>
                                      <span
                                        className="text-xs font-extrabold text-[#0f172a]"
                                        style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
                                      >
                                        #REF: {task.referencia || 'SIN-REF'}
                                      </span>
                                    </div>

                                    <p className="text-xs text-[#475569] font-medium mt-1.5">
                                      {isCompleted && task.tipo === 'LOCALIZADO' && 'Ficha técnica XLSM generada y lista para descarga.'}
                                      {isCompleted && task.tipo === 'CONTINUO' && (task.message ? `${task.message} Lista para descarga.` : 'Lote de fichas generado y listo para descarga.')}
                                      {task.estado === 'queued' && 'En cola de procesamiento...'}
                                      {task.estado === 'processing' && 'Construyendo archivo Excel e insertando imágenes...'}
                                      {isFailed && `Error: ${task.error || 'Generación fallida'}`}
                                    </p>

                                    {isCompleted && isActive && (
                                      <div className="text-[10px] font-extrabold text-[#059669] uppercase tracking-wider mt-1 animate-pulse">
                                        📥 Descarga automática iniciada...
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {isPending && (
                                      <Loader2 className="w-4 h-4 text-[#eab308] animate-spin" />
                                    )}
                                    {isCompleted && (
                                      <button
                                        type="button"
                                        onClick={() => descargarFicha(task.id, task.referencia, task.tipo)}
                                        className="btn-editorial-dark py-1.5 px-3 text-[11px]"
                                        title={task.tipo === 'LOCALIZADO' ? 'Descargar Ficha .xlsm' : 'Descargar Lote .zip'}
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Descargar</span>
                                      </button>
                                    )}
                                    {isFailed && (
                                      <AlertCircle className="w-4 h-4 text-[#ef4444]" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer with Official Logos */}
            <div className="p-4 border-t border-[#e2e8f0] bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/ag-b.png" alt="AG LAB" className="brand-foot-logo logo-agb" style={{ maxHeight: '24px' }} />
                <span className="brand-foot-divider" style={{ height: '14px' }} />
                <img src="/AZZORTI.png" alt="AZZORTI" className="brand-foot-logo logo-azzorti" style={{ maxHeight: '13px' }} />
                <span className="brand-foot-divider" style={{ height: '14px' }} />
                <img src="/LIVVA.png" alt="LIVVA" className="brand-foot-logo logo-livva" style={{ maxHeight: '12px' }} />
              </div>
              <button
                type="button"
                onClick={() => setQueuePanelOpen(false)}
                className="btn-editorial-outline text-xs py-1 px-3"
              >
                Cerrar
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Compact Floating Trigger Pill (bottom-right) when Drawer is closed */}
      {!queuePanelOpen && (
        <div className="fixed bottom-5 right-5 z-40 no-print">
          <button
            type="button"
            onClick={() => setQueuePanelOpen(true)}
            className="btn-filter-main rounded-full px-5 py-3 shadow-lg flex items-center gap-3"
          >
            <ListTodo className="w-4 h-4 text-indigo-400" />
            <span className="tracking-wide">COLA DE GENERACIÓN</span>
            <span
              className={`unified-filter-badge ${
                pendingCount > 0 ? 'bg-[#ea580c] border-[#fdba74] animate-pulse' : ''
              }`}
            >
              {pendingCount > 0 ? `${pendingCount} en curso` : tasks.length}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
