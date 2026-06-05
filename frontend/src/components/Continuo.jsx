import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Trash2, CheckCircle, AlertCircle,
  Loader2, Image as ImageIcon, Palette,
  ChevronRight, ChevronLeft, Download,
  MousePointer2, Brush, Zap, Layout, X, Search, Check, Clock
} from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000/api' : '/api';
export default function Continuo({ opciones, onBack, onQueueTask, isLocal }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeField, setActiveField] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputPattern = useRef(null);

  const [globalData, setGlobalData] = useState({
    referencia: '', marca: '', campana: '', linea: '',
    dis_moda: '', dis_grafico: '', proceso: 'SUBLIMACION',
    observaciones: '', imagen_pattern_base64: '',
    output_folder: ''
  });

  const [telasSeleccionadas, setTelasSeleccionadas] = useState([]);
  const [showTelaSearch, setShowTelaSearch] = useState(false);

  const handleGlobalChange = (e) => {
    const { name, value } = e.target;
    setGlobalData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaste = (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setGlobalData(prev => ({ ...prev, imagen_pattern_base64: reader.result }));
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const addTela = (telaNombre) => {
    if (!telasSeleccionadas.find(t => t.nombre_tela === telaNombre)) {
      setTelasSeleccionadas([...telasSeleccionadas, {
        nombre_tela: telaNombre,
        composicion: 'AUTOMÁTICA',
        pantones: []
      }]);
    }
    setShowTelaSearch(false);
    setSearchTerm('');
  };

  const addPantone = (telaIndex) => {
    const newTelas = [...telasSeleccionadas];
    newTelas[telaIndex].pantones.push('');
    setTelasSeleccionadas(newTelas);
  };

  const updatePantone = (telaIndex, pantoneIndex, value) => {
    const newTelas = [...telasSeleccionadas];
    newTelas[telaIndex].pantones[pantoneIndex] = value;
    setTelasSeleccionadas(newTelas);
  };

  const handleSubmit = async () => {
    if (!globalData.imagen_pattern_base64 || telasSeleccionadas.length === 0) {
      setMessage({ type: 'error', text: 'Sube un pattern y selecciona al menos una tela.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        datos_globales: {
          ...globalData,
          imagen_pattern_base64: globalData.imagen_pattern_base64.split(',')[1] || globalData.imagen_pattern_base64
        },
        telas_seleccionadas: telasSeleccionadas
      };

      const res = await axios.post(`${API_BASE}/generar-continuo-async`, payload);
      if (res.data.task_id) {
        if (onQueueTask) {
          onQueueTask(res.data.task_id);
        }
        setMessage({ 
          type: 'success', 
          text: `Generación de ${telasSeleccionadas.length} fichas agregada a la cola. Se guardarán en la carpeta de destino cuando finalice.` 
        });
        setStep(4);
      } else {
        throw new Error("No se recibió task_id de la API.");
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error al iniciar proceso continuo en segundo plano.' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTelas = opciones.tela_base?.filter(t =>
    t.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="w-full max-w-4xl slide-up">
      <header className="mb-12 text-center">
        <button onClick={onBack} className="mb-4 text-xs font-bold text-white/60 hover:text-white flex items-center gap-2 mx-auto bg-white/10 px-4 py-2 rounded-full transition-all">
          <ChevronLeft className="w-3 h-3" /> VOLVER AL MENÚ
        </button>
        <div className="inline-flex items-center gap-3 bg-white/30 backdrop-blur-md px-6 py-3 rounded-full border border-white/50 shadow-sm mb-6">
          <h1 className="font-outfit text-2xl font-black text-white tracking-tight">Estampado <span className="text-indigo-400">Continuo</span></h1>
        </div>
      </header>

      <div className="creative-card min-h-[600px] flex flex-col relative overflow-hidden">
        {submitting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6" />
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Generando {telasSeleccionadas.length} Fichas...</h3>
          </div>
        )}

        {message && step !== 4 && (
          <div className="mb-8 p-6 rounded-[24px] bg-rose-50 border-2 border-rose-100 text-rose-600 flex items-center gap-4">
            <AlertCircle className="w-6 h-6" />
            <p className="font-bold text-sm uppercase">{message.text}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-10 flex-1">
            <h2 className="font-outfit text-4xl font-black text-slate-900 tracking-tighter">Datos Globales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { label: 'Referencia', name: 'referencia', type: 'text' },
                { label: 'Marca', name: 'marca', options: opciones.marca },
                { label: 'Campaña', name: 'campana', options: opciones.campana },
                { label: 'Línea', name: 'linea', options: opciones.linea },
                { label: 'Diseñador Moda', name: 'dis_moda', options: opciones.dis_mod },
                { label: 'Diseñador Gráfico', name: 'dis_grafico', options: opciones.dis_graf },
              ].map(f => (
                <div key={f.name}>
                  <label className="label-creative">{f.label}</label>
                  {f.options ? (
                    <select name={f.name} className="input-creative appearance-none" value={globalData[f.name]} onChange={handleGlobalChange}>
                      <option value="">Seleccionar...</option>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type="text" name={f.name} className="input-creative" value={globalData[f.name]} onChange={handleGlobalChange} />
                  )}
                </div>
              ))}
              <div>
                <label className="label-creative">Proceso</label>
                <select name="proceso" className="input-creative appearance-none" value={globalData.proceso} onChange={handleGlobalChange}>
                  <option value="SUBLIMACION">SUBLIMACION</option>
                  <option value="ESTAMPACION">ESTAMPACION</option>
                </select>
              </div>
              {isLocal ? (
                <div className="md:col-span-2">
                  <label className="label-creative">Carpeta de Destino</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      name="output_folder" 
                      className="input-creative flex-1" 
                      value={globalData.output_folder} 
                      onChange={handleGlobalChange} 
                      placeholder="Dejar vacío para usar carpeta /output" 
                    />
                    <button 
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await axios.get(`${API_BASE}/select-folder`);
                          if (res.data.path) {
                            setGlobalData(prev => ({ ...prev, output_folder: res.data.path }));
                          }
                        } catch (err) {
                          console.error("Error seleccionando carpeta", err);
                        }
                      }}
                      className="px-4 bg-slate-100 hover:bg-indigo-100 text-indigo-600 rounded-2xl transition-colors border-2 border-slate-200"
                      title="Seleccionar Carpeta"
                    >
                      <Layout className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="md:col-span-2 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-indigo-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <span>Modo Web: Los archivos se descargarán de forma directa (comprimidos en ZIP) al finalizar.</span>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="label-creative">Observaciones</label>
                <textarea name="observaciones" className="input-creative h-20 resize-none" value={globalData.observaciones} onChange={handleGlobalChange} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="font-outfit text-4xl font-black text-slate-900 tracking-tighter">Selección de Telas</h2>
              <div className="relative">
                <button onClick={() => setShowTelaSearch(!showTelaSearch)} className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg"><Plus /></button>
                {showTelaSearch && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-100 shadow-2xl rounded-2xl z-50 p-4 max-h-64 flex flex-col">
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        className="input-creative py-2 pl-8 text-[10px]"
                        placeholder="Escribe para buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 overflow-y-auto pr-2">
                      {filteredTelas.map(t => (
                        <button key={t} onClick={() => addTela(t)} className="w-full text-left p-2.5 hover:bg-indigo-50 rounded-lg text-[10px] font-black text-slate-600 transition-colors uppercase truncate">
                          {t}
                        </button>
                      ))}
                      {filteredTelas.length === 0 && <p className="text-center py-4 text-[10px] text-slate-400 font-bold italic">No se encontraron telas</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {telasSeleccionadas.map((tela, idx) => (
                <div key={idx} className="p-8 bg-slate-50/50 border-2 border-slate-100 rounded-[32px] space-y-6 slide-up relative group">
                  <button onClick={() => setTelasSeleccionadas(telasSeleccionadas.filter((_, i) => i !== idx))} className="absolute top-6 right-6 text-slate-300 hover:text-rose-500 transition-colors"><X /></button>
                  <div className="flex flex-col gap-2">
                    <label className="label-creative text-[10px] uppercase tracking-widest text-slate-400">Tela Seleccionada</label>
                    <p className="text-xl font-black text-slate-900 tracking-tight">{tela.nombre_tela}</p>
                    <div className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit">
                      <Check className="w-3 h-3" /> COMPOSICIÓN AUTOMÁTICA
                    </div>
                  </div>

                  {globalData.proceso === 'ESTAMPACION' && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="label-creative text-[10px] uppercase tracking-widest text-indigo-400">Pantones para esta tela</label>
                        <button onClick={() => addPantone(idx)} className="text-indigo-600 font-black text-xs hover:underline">+ AÑADIR COLOR</button>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {tela.pantones.map((p, pIdx) => (
                          <div key={pIdx} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm">
                            <input type="text" className="w-24 outline-none text-xs font-bold text-slate-900" value={p} onChange={(e) => updatePantone(idx, pIdx, e.target.value)} placeholder="PMS..." />
                            <button onClick={() => {
                              const newTelas = [...telasSeleccionadas];
                              newTelas[idx].pantones.splice(pIdx, 1);
                              setTelasSeleccionadas(newTelas);
                            }} className="text-slate-300 hover:text-rose-500"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {telasSeleccionadas.length === 0 && (
                <div className="py-20 text-center border-4 border-dashed border-slate-100 rounded-[40px]">
                  <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">Añade telas usando el botón + arriba</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-10 flex-1">
            <h2 className="font-outfit text-4xl font-black text-slate-900 tracking-tighter">Imagen del Pattern</h2>
            <div
              className={`upload-area h-96 outline-none ${activeField ? 'ring-4 ring-indigo-400 border-indigo-500' : ''}`}
              onPaste={handlePaste}
              onFocus={() => setActiveField(true)}
              onBlur={() => setActiveField(false)}
              onClick={() => fileInputPattern.current.click()}
              tabIndex="0"
            >
              {globalData.imagen_pattern_base64 ? (
                <img src={globalData.imagen_pattern_base64} className="w-full h-full object-contain p-8" />
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-white shadow-xl rounded-3xl flex items-center justify-center mb-6">
                    <ImageIcon className="w-10 h-10 text-indigo-400" />
                  </div>
                  <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Haz clic para subir o Pega el pattern aquí</p>
                </div>
              )}
              <input type="file" ref={fileInputPattern} className="hidden" onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setGlobalData(prev => ({ ...prev, imagen_pattern_base64: reader.result }));
                  reader.readAsDataURL(file);
                }
              }} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center justify-center py-20 text-center flex-1">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6"><CheckCircle className="w-10 h-10" /></div>
            <h2 className="text-4xl font-black text-slate-900 mb-2">¡Fichas Generadas!</h2>
            <p className="text-slate-400 mb-10">{message?.text}</p>
            <button onClick={() => window.location.reload()} className="btn-creative btn-next px-10">Nueva Carga</button>
          </div>
        )}

        {step < 4 && (
          <div className="mt-12 flex gap-4">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 1} className="btn-creative btn-back flex-1 justify-center disabled:opacity-0"><ChevronLeft /> Atrás</button>
            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} className="btn-creative btn-next flex-1 justify-center">Continuar <ChevronRight /></button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="btn-creative btn-next flex-[2] justify-center bg-emerald-600">
                {submitting ? <Loader2 className="animate-spin" /> : <Download />} Generar {telasSeleccionadas.length} Fichas
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
