import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ChevronRight, Box, Grid3X3,
  ListTodo, ChevronDown, ChevronUp, Loader2,
  Check, AlertCircle, Download, Clock
} from 'lucide-react';
import Localizado from './components/Localizado';
import Continuo from './components/Continuo';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000/api' : '/api';

export default function App() {
  const [mode, setMode] = useState(null); // 'LOCALIZADO' | 'CONTINUO'
  const [opciones, setOpciones] = useState({});
  const [loading, setLoading] = useState(true);

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
        <div className="w-12 h-12 border-2 border-[#e2e8f0] border-t-[#4f46e5] rounded-full animate-spin mb-5" />
        <span className="eyebrow-editorial">EQUIPO AG LAB</span>
        <p className="text-[#475569] font-medium text-xs mt-1.5">Preparando Estudio de Fichas Técnicas...</p>
      </div>
    );
  }

  // Count active/running tasks
  const pendingCount = tasks.filter(t => t.estado === 'queued' || t.estado === 'processing').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#0f172a]">
      {/* Main Content Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-10 md:px-10 md:py-14 pb-28">
        {mode === 'LOCALIZADO' ? (
          <div className="w-full max-w-4xl slide-up">
            <Localizado
              opciones={opciones}
              onBack={() => setMode(null)}
              onQueueTask={addActiveTask}
              isLocal={isLocal}
            />
          </div>
        ) : mode === 'CONTINUO' ? (
          <div className="w-full max-w-4xl slide-up">
            <Continuo
              opciones={opciones}
              onBack={() => setMode(null)}
              onQueueTask={addActiveTask}
              isLocal={isLocal}
            />
          </div>
        ) : (
          <div className="w-full max-w-4xl slide-up">
            {/* Editorial Welcome Hero Card */}
            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-8 md:p-10 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.06)] mb-6 text-center">
              <div className="block mb-2">
                <span className="eyebrow-editorial">EQUIPO AG LAB</span>
              </div>

              <h1 className="title-editorial-hero text-3xl md:text-4xl mb-2.5">
                Bienvenido, Creativo.
              </h1>

              <p className="text-[#475569] text-[13.5px] max-w-lg mx-auto font-normal leading-relaxed m-0">
                Selecciona el flujo de trabajo para construir y exportar tu nueva ficha técnica de estampación.
              </p>
            </div>

            {/* Workflow Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option 1: Estampado Localizado */}
              <button
                type="button"
                onClick={() => setMode('LOCALIZADO')}
                className="workflow-card-editorial group"
                style={{ '--card-accent': '#4f46e5' }}
              >
                <div>
                  <div className="mb-5">
                    <div className="avatar-editorial-black group-hover:bg-[#4f46e5] transition-colors">
                      <Box className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <h2 className="text-2xl font-extrabold text-[#000000] tracking-[-0.4px] mb-2.5">
                    Estampado Localizado
                  </h2>
                  <p className="text-[#475569] text-[13px] leading-relaxed mb-6">
                    Ideal para camisetas, buzos y piezas únicas con artes específicos en posiciones fijas, cálculo inteligente de % cubrimiento y armonía de color.
                  </p>
                </div>

                <div className="pt-4 border-t border-[#f1f5f9] flex items-center justify-end">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#000000] text-white text-xs font-bold group-hover:bg-[#4f46e5] transition-colors">
                    <span>+ Crear Ficha</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>

              {/* Option 2: Estampado Continuo */}
              <button
                type="button"
                onClick={() => setMode('CONTINUO')}
                className="workflow-card-editorial group"
                style={{ '--card-accent': '#000000' }}
              >
                <div>
                  <div className="mb-5">
                    <div className="avatar-editorial-black group-hover:bg-[#4f46e5] transition-colors">
                      <Grid3X3 className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <h2 className="text-2xl font-extrabold text-[#000000] tracking-[-0.4px] mb-2.5">
                    Estampado Continuo
                  </h2>
                  <p className="text-[#475569] text-[13px] leading-relaxed mb-6">
                    Perfecto para patterns repetitivos, sublimación o estampación por rollo y textiles continuos generados en lote sobre múltiples telas base.
                  </p>
                </div>

                <div className="pt-4 border-t border-[#f1f5f9] flex items-center justify-end">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#000000] text-white text-xs font-bold group-hover:bg-[#4f46e5] transition-colors">
                    <span>+ Crear Ficha</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            </div>

            {/* Official Logos Showcase (Moved to Bottom Center) */}
            <footer className="mt-10 flex justify-center">
              <div className="inline-flex items-center justify-center gap-6 px-7 py-3.5 rounded-2xl bg-[#ffffff] border border-[#e2e8f0] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <img
                  src="/ag-b.png"
                  alt="AG LAB — Laboratorio de Moda"
                  className="official-logo official-logo-ag"
                />
                <span className="brand-logos-divider" style={{ height: '24px' }} />
                <img
                  src="/AZZORTI.png"
                  alt="AZZORTI"
                  className="official-logo official-logo-azzorti"
                />
                <span className="brand-logos-divider" style={{ height: '24px' }} />
                <img
                  src="/LIVVA.png"
                  alt="LIVVA"
                  className="official-logo official-logo-livva"
                />
              </div>
            </footer>
          </div>
        )}
      </main>

      {/* Floating Task Queue Component */}
      <div className="fixed bottom-5 right-5 z-50 w-96 max-w-[calc(100vw-2.5rem)]">
        <div className="bg-[#ffffff] border border-[#cbd5e1] shadow-[0_20px_45px_-12px_rgba(15,23,42,0.18)] rounded-2xl overflow-hidden transition-all duration-300">
          {/* Header */}
          <button
            type="button"
            onClick={() => setQueuePanelOpen(!queuePanelOpen)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#000000] text-white font-bold text-xs tracking-wide cursor-pointer border-0"
          >
            <div className="flex items-center gap-2.5">
              <ListTodo className="w-4 h-4 text-[#4f46e5]" />
              <span className="tracking-[1.5px] uppercase font-extrabold text-[11px]">
                COLA DE GENERACIÓN
              </span>
              <span
                className={`mono-tabular px-2 py-0.5 rounded-full text-[10.5px] font-extrabold ${
                  pendingCount > 0
                    ? 'bg-[#4f46e5] text-white animate-pulse'
                    : 'bg-[#1e293b] text-[#cbd5e1]'
                }`}
              >
                {pendingCount > 0 ? `${pendingCount} ACTIVA${pendingCount > 1 ? 'S' : ''}` : tasks.length}
              </span>
            </div>
            {queuePanelOpen ? <ChevronDown className="w-4 h-4 text-[#cbd5e1]" /> : <ChevronUp className="w-4 h-4 text-[#cbd5e1]" />}
          </button>

          {/* Expanded List */}
          {queuePanelOpen && (
            <div className="max-h-80 overflow-y-auto p-3.5 space-y-2.5 bg-[#f8fafc]">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-[#ffffff] rounded-xl border border-[#e2e8f0]">
                  <Clock className="w-7 h-7 text-[#94a3b8] mb-2" />
                  <p className="text-[#64748b] font-bold text-[11px] uppercase tracking-wider m-0">
                    No hay fichas en cola
                  </p>
                </div>
              ) : (
                tasks.map((task) => {
                  const isPending = task.estado === 'queued' || task.estado === 'processing';
                  const isCompleted = task.estado === 'completed';
                  const isFailed = task.estado === 'failed';
                  const isActive = activeTaskIds.includes(task.id);

                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-xl border transition-all bg-[#ffffff] ${
                        isFailed
                          ? 'border-[#fecaca] border-l-4 border-l-[#dc2626]'
                          : isCompleted
                          ? 'border-[#a7f3d0] border-l-4 border-l-[#059669]'
                          : 'border-[#e2e8f0] border-l-4 border-l-[#4f46e5]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`badge-hashtag ${
                                task.tipo === 'LOCALIZADO' ? '' : 'badge-hashtag-amber'
                              }`}
                              style={{ fontSize: '10px', padding: '1.5px 7px' }}
                            >
                              #{task.tipo}
                            </span>
                            <span className="mono-tabular text-[11.5px] font-extrabold text-[#0f172a]">
                              Ref: {task.referencia || 'N/A'}
                            </span>
                          </div>

                          {/* Info Message */}
                          <p className="text-[11px] text-[#475569] font-medium mt-1 m-0">
                            {isCompleted && task.tipo === 'LOCALIZADO' && "Ficha lista para descarga."}
                            {isCompleted && task.tipo === 'CONTINUO' && (task.message ? `${task.message} Lista para descarga.` : "Fichas generadas y listas para descarga.")}
                            {task.estado === 'queued' && "Esperando en cola..."}
                            {task.estado === 'processing' && "Procesando Excel e imágenes..."}
                            {isFailed && `Error: ${task.error || 'Generación fallida'}`}
                          </p>
                        </div>

                        {/* Status Icon / Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isPending && (
                            <Loader2 className="w-4 h-4 text-[#4f46e5] animate-spin" />
                          )}
                          {isCompleted && (
                            <div className="flex items-center gap-1">
                              <Check className="w-4 h-4 text-[#059669]" />
                              <button
                                type="button"
                                onClick={() => descargarFicha(task.id, task.referencia, task.tipo)}
                                className="p-1.5 bg-[#ecfdf5] hover:bg-[#d1fae5] border border-[#a7f3d0] rounded-lg text-[#059669] transition-colors cursor-pointer"
                                title={task.tipo === 'LOCALIZADO' ? "Descargar Ficha" : "Descargar ZIP"}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {isFailed && (
                            <AlertCircle className="w-4 h-4 text-[#dc2626]" />
                          )}
                        </div>
                      </div>

                      {/* Subtitle with download indicator */}
                      {isCompleted && isActive && (
                        <div className="text-[10px] font-extrabold text-[#059669] uppercase tracking-wider mt-1.5 animate-pulse">
                          📥 Descargando...
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
