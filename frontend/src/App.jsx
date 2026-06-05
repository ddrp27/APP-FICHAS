import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Zap, Brush, Layout, Image as ImageIcon,
  ChevronRight, Sparkles, Box, Grid3X3,
  ListTodo, ChevronDown, ChevronUp, Loader2,
  Check, AlertCircle, Download, Clock, X
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
          // Remove from active tasks to avoid triggering download multiple times
          setActiveTaskIds(prev => prev.filter(tid => tid !== id));
          descargarFicha(task.id, task.referencia, task.tipo);
        } else if (task.estado === 'failed') {
          // Remove from active tasks to stop checking
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
    // Automatically expand the panel to show progress
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
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6" />
        <p className="text-indigo-600 font-bold tracking-widest uppercase text-sm">Preparando Estudio...</p>
      </div>
    );
  }

  // Count active/running tasks
  const pendingCount = tasks.filter(t => t.estado === 'queued' || t.estado === 'processing').length;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12 relative pb-32">
      
      {/* Main Flow Views */}
      {mode === 'LOCALIZADO' ? (
        <div className="w-full max-w-3xl slide-up">
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
        <div className="w-full max-w-4xl slide-up text-center">
          {/* Logo Section */}
          <div className="inline-flex items-center gap-3 bg-white/30 backdrop-blur-xl px-8 py-4 rounded-full border border-white/50 shadow-2xl mb-12">
            <Zap className="text-amber-500 w-8 h-8 fill-amber-500" />
            <h1 className="font-outfit text-4xl font-black text-white tracking-tight">
              DISEÑO TEXTIL <span className="text-indigo-400 font-light">AG LAB</span>
            </h1>
          </div>

          <h2 className="text-white text-5xl font-black mb-4 tracking-tighter">Bienvenido, Creativo.</h2>
          <p className="text-white/70 text-lg mb-16 font-medium">Selecciona el flujo de trabajo para tu nueva ficha técnica.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Option 1: Localizado */}
            <button
              onClick={() => setMode('LOCALIZADO')}
              className="group relative creative-card p-12 text-left hover:scale-[1.02] active:scale-95 transition-all duration-500 bg-white/90"
            >
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-indigo-600 transition-colors duration-500">
                <Box className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Estampado Localizado</h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">Ideal para camisetas, buzos y piezas únicas con artes específicos en posiciones fijas.</p>
              <div className="flex items-center gap-2 text-indigo-600 font-black text-sm uppercase tracking-widest">
                Crear Ficha <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {/* Option 2: Continuo */}
            <button
              onClick={() => setMode('CONTINUO')}
              className="group relative creative-card p-12 text-left hover:scale-[1.02] active:scale-95 transition-all duration-500 bg-white/90"
            >
              <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-amber-500 transition-colors duration-500">
                <Grid3X3 className="w-10 h-10 text-amber-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Estampado Continuo</h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">Perfecto para patterns repetitivos, sublimación por rollo y textiles continuos sobre múltiples telas.</p>
              <div className="flex items-center gap-2 text-amber-600 font-black text-sm uppercase tracking-widest">
                Crear Ficha <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>

          <footer className="mt-20 text-white/40 text-xs font-bold uppercase tracking-[0.2em]">
            StudioFabric Pro v2.0 • Azzorti Creative Studio
          </footer>
        </div>
      )}

      {/* Floating Task Queue Component */}
      <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-3xl overflow-hidden transition-all duration-500">
          
          {/* Header */}
          <button 
            onClick={() => setQueuePanelOpen(!queuePanelOpen)}
            className="w-full flex items-center justify-between px-6 py-4 bg-slate-950 text-white font-bold text-sm tracking-wide rounded-t-3xl"
          >
            <div className="flex items-center gap-3">
              <ListTodo className="w-4 h-4 text-indigo-400" />
              <span>COLA DE GENERACIÓN</span>
              {pendingCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] animate-pulse">
                  {pendingCount}
                </span>
              )}
            </div>
            {queuePanelOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          {/* Expanded List */}
          {queuePanelOpen && (
            <div className="max-h-80 overflow-y-auto p-4 space-y-3 bg-white">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-slate-400 font-bold text-[10px] uppercase">No hay fichas en cola</p>
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
                      className={`p-3 rounded-2xl border transition-all ${
                        isFailed ? 'bg-rose-50/50 border-rose-100 text-rose-800' :
                        isCompleted ? 'bg-emerald-50/30 border-emerald-100 text-emerald-800' :
                        'bg-slate-50/50 border-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                              task.tipo === 'LOCALIZADO' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {task.tipo}
                            </span>
                            <span className="text-[10px] font-black tracking-tight">
                              Ref: {task.referencia || 'N/A'}
                            </span>
                          </div>
                          
                          {/* Info Message */}
                          <p className="text-[10px] text-slate-500 font-semibold mt-1">
                            {isCompleted && task.tipo === 'LOCALIZADO' && "Ficha lista para descarga."}
                            {isCompleted && task.tipo === 'CONTINUO' && (task.message ? `${task.message} Lista para descarga.` : "Fichas generadas y listas para descarga.")}
                            {task.estado === 'queued' && "Esperando en cola..."}
                            {task.estado === 'processing' && "Procesando Excel e imágenes..."}
                            {isFailed && `Error: ${task.error || 'Generación fallida'}`}
                          </p>
                        </div>

                        {/* Status Icon / Actions */}
                        <div className="flex items-center gap-2">
                          {isPending && (
                            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                          )}
                          {isCompleted && (
                            <div className="flex items-center gap-1">
                              <Check className="w-4 h-4 text-emerald-600" />
                              <button
                                onClick={() => descargarFicha(task.id, task.referencia, task.tipo)}
                                className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-700 transition-colors"
                                title={task.tipo === 'LOCALIZADO' ? "Descargar Ficha" : "Descargar ZIP"}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {isFailed && (
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                          )}
                        </div>
                      </div>
                      
                      {/* Subtitle with download indicator */}
                      {isCompleted && isActive && (
                        <div className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1 animate-pulse">
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
