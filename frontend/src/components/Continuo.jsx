import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
  Plus, CheckCircle, AlertCircle,
  Loader2, Image as ImageIcon,
  ChevronRight, ChevronLeft, Download,
  Brush, Layout, X, Search, Check, Clock, Layers
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

  const handleNuevaCarga = () => {
    setGlobalData(prev => ({
      ...prev,
      referencia: '',
      imagen_pattern_base64: ''
    }));
    setTelasSeleccionadas(prev => prev.map(t => ({ ...t, pantones: [] })));
    setMessage(null);
    setStep(1);
  };

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

  const steps = [
    { id: 1, title: 'Datos Globales', icon: <Brush className="w-3.5 h-3.5" /> },
    { id: 2, title: 'Telas Base', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 3, title: 'Pattern', icon: <ImageIcon className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="w-full slide-up">
      {/* Editorial Section Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="btn-editorial-secondary"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Volver al Menú</span>
          </button>

          <div>
            <span className="eyebrow-editorial block" style={{ fontSize: '10px' }}>
              EQUIPO AG LAB
            </span>
            <h1 className="title-editorial-section text-2xl">
              Estampado Continuo
            </h1>
          </div>
        </div>

        {/* Stepper Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => step < 4 && setStep(s.id)}
              className={`step-pill ${step === s.id ? 'pill-active' : 'pill-inactive'}`}
            >
              {s.icon}
              <span className="mono-tabular">{s.id}.</span>
              <span>{s.title}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Editorial Card Container */}
      <div
        className="creative-card min-h-[540px] flex flex-col relative overflow-hidden"
        style={{ borderTop: '3px solid #000000' }}
      >
        {submitting && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-14 h-14 border-2 border-[#e2e8f0] border-t-[#4f46e5] rounded-full animate-spin mb-4" />
            <span className="eyebrow-editorial mb-1">PROCESANDO LOTE</span>
            <h3 className="text-lg font-extrabold text-[#0f172a] tracking-[-0.3px]">
              Generando {telasSeleccionadas.length} Fichas...
            </h3>
          </div>
        )}

        {message && step !== 4 && (
          <div className="mb-6 p-4 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-bold text-xs uppercase tracking-wide m-0">{message.text}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 flex-1">
            <div>
              <h2 className="title-editorial-section text-2xl">Datos Globales</h2>
              <p className="text-[#64748b] text-xs font-medium mt-1 m-0">
                Información compartida por todas las telas que llevarán este pattern continuo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { label: 'Referencia', name: 'referencia', type: 'text', mono: true },
                { label: 'Marca', name: 'marca', options: opciones.marca },
                { label: 'Campaña', name: 'campana', options: opciones.campana },
                { label: 'Línea', name: 'linea', options: opciones.linea },
                { label: 'Diseñador Moda', name: 'dis_moda', options: opciones.dis_mod },
                { label: 'Diseñador Gráfico', name: 'dis_grafico', options: opciones.dis_graf },
              ].map(f => (
                <div key={f.name}>
                  <label className="label-creative">{f.label}</label>
                  {f.options ? (
                    <select
                      name={f.name}
                      className="input-creative"
                      value={globalData[f.name]}
                      onChange={handleGlobalChange}
                    >
                      <option value="">Seleccionar...</option>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name={f.name}
                      className={`input-creative ${f.mono ? 'mono-tabular' : ''}`}
                      value={globalData[f.name]}
                      onChange={handleGlobalChange}
                      placeholder="Ej: CONT-104"
                    />
                  )}
                </div>
              ))}

              <div>
                <label className="label-creative">Proceso</label>
                <select
                  name="proceso"
                  className="input-creative"
                  value={globalData.proceso}
                  onChange={handleGlobalChange}
                >
                  <option value="SUBLIMACION">SUBLIMACION</option>
                  <option value="ESTAMPACION">ESTAMPACION</option>
                </select>
              </div>

              {isLocal ? (
                <div className="md:col-span-2 bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0]">
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
                      className="btn-editorial-secondary px-3.5"
                      title="Seleccionar Carpeta"
                    >
                      <Layout className="w-4 h-4 text-[#4f46e5]" />
                      <span>Explorar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="md:col-span-2 p-3.5 bg-[#eef2ff] border border-[#c7d2fe] rounded-xl text-[#4338ca] text-xs font-bold flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#4f46e5] shrink-0" />
                  <span>Modo Web: Los archivos se descargarán de forma directa (comprimidos en ZIP) al finalizar.</span>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="label-creative">Observaciones</label>
                <textarea
                  name="observaciones"
                  className="input-creative h-20 resize-none"
                  value={globalData.observaciones}
                  onChange={handleGlobalChange}
                  placeholder="Indicaciones de rapport, rotación o acabados..."
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="title-editorial-section text-2xl">Selección de Telas</h2>
                {telasSeleccionadas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTelasSeleccionadas([])}
                    className="text-[11px] font-bold text-[#dc2626] hover:bg-[#fef2f2] bg-[#ffffff] border border-[#fecaca] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Limpiar telas ({telasSeleccionadas.length})
                  </button>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTelaSearch(!showTelaSearch)}
                  className="btn-editorial-black"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Añadir Tela</span>
                </button>

                {showTelaSearch && (
                  <div className="absolute right-0 mt-2 w-76 bg-[#ffffff] border border-[#cbd5e1] shadow-2xl rounded-xl z-50 p-3 max-h-68 flex flex-col">
                    <div className="relative mb-2.5">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" />
                      <input
                        type="text"
                        autoFocus
                        className="input-creative py-1.5 pl-8 text-xs"
                        placeholder="Escribe para buscar tela..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 overflow-y-auto pr-1">
                      {filteredTelas.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => addTela(t)}
                          className="w-full text-left px-3 py-2 hover:bg-[#eef2ff] hover:text-[#4f46e5] rounded-lg text-[11px] font-bold text-[#0f172a] transition-colors uppercase truncate cursor-pointer bg-transparent border-0"
                        >
                          {t}
                        </button>
                      ))}
                      {filteredTelas.length === 0 && (
                        <p className="text-center py-4 text-xs text-[#64748b] font-medium m-0">
                          No se encontraron telas
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {telasSeleccionadas.map((tela, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-[#f8fafc] border border-[#e2e8f0] border-l-4 border-l-[#000000] rounded-xl space-y-4 slide-up relative"
                >
                  <button
                    type="button"
                    onClick={() => setTelasSeleccionadas(telasSeleccionadas.filter((_, i) => i !== idx))}
                    className="absolute top-4 right-4 text-[#64748b] hover:text-[#dc2626] transition-colors p-1 cursor-pointer bg-transparent border-0"
                    title="Eliminar tela"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex flex-col gap-1.5">
                    <span className="label-creative mb-0 text-[10px] text-[#64748b]">Tela Seleccionada</span>
                    <p className="text-lg font-extrabold text-[#000000] tracking-[-0.3px] m-0">
                      {tela.nombre_tela}
                    </p>
                    <span className="badge-hashtag badge-hashtag-emerald w-fit mt-1">
                      <Check className="w-3 h-3" /> COMPOSICIÓN AUTOMÁTICA
                    </span>
                  </div>

                  {globalData.proceso === 'ESTAMPACION' && (
                    <div className="space-y-3 pt-3 border-t border-[#e2e8f0]">
                      <div className="flex items-center justify-between">
                        <label className="label-creative mb-0 text-[#4f46e5]">
                          Pantones para esta tela
                        </label>
                        <button
                          type="button"
                          onClick={() => addPantone(idx)}
                          className="badge-hashtag cursor-pointer hover:bg-[#e0e7ff]"
                        >
                          + AÑADIR COLOR
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {tela.pantones.map((p, pIdx) => (
                          <div
                            key={pIdx}
                            className="flex items-center gap-2 bg-[#ffffff] px-3 py-1.5 rounded-lg border border-[#cbd5e1]"
                          >
                            <input
                              type="text"
                              className="w-24 outline-none text-xs font-bold text-[#0f172a] mono-tabular"
                              value={p}
                              onChange={(e) => updatePantone(idx, pIdx, e.target.value)}
                              placeholder="PMS..."
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newTelas = [...telasSeleccionadas];
                                newTelas[idx].pantones.splice(pIdx, 1);
                                setTelasSeleccionadas(newTelas);
                              }}
                              className="text-[#94a3b8] hover:text-[#dc2626] cursor-pointer bg-transparent border-0 p-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {telasSeleccionadas.length === 0 && (
                <div className="py-16 text-center border-2 border-dashed border-[#cbd5e1] bg-[#f8fafc] rounded-xl">
                  <p className="text-[#64748b] font-bold uppercase tracking-wider text-xs m-0">
                    Añade telas usando el botón &ldquo;+ Añadir Tela&rdquo; arriba
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 flex-1">
            <div>
              <h2 className="title-editorial-section text-2xl">Imagen del Pattern</h2>
              <p className="text-[#64748b] text-xs font-medium mt-1 m-0">
                Haz clic para subir el archivo del módulo o pégalo directamente desde el portapapeles.
              </p>
            </div>

            <div
              className={`upload-area h-80 outline-none ${
                activeField ? 'border-[#4f46e5] bg-[#eef2ff]/60 ring-3 ring-[#eef2ff]' : ''
              }`}
              onPaste={handlePaste}
              onFocus={() => setActiveField(true)}
              onBlur={() => setActiveField(false)}
              onClick={() => fileInputPattern.current.click()}
              tabIndex="0"
            >
              {globalData.imagen_pattern_base64 ? (
                <img src={globalData.imagen_pattern_base64} alt="Pattern" className="w-full h-full object-contain p-6" />
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-[#ffffff] border border-[#e2e8f0] shadow-xs rounded-2xl flex items-center justify-center mb-4">
                    <ImageIcon className="w-7 h-7 text-[#4f46e5]" />
                  </div>
                  <p className="text-[#0f172a] font-extrabold text-xs uppercase tracking-wider mb-1.5 m-0">
                    Haz clic para subir o pega el pattern aquí (Ctrl + V)
                  </p>
                </div>
              )}
              <input
                type="file"
                ref={fileInputPattern}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setGlobalData(prev => ({ ...prev, imagen_pattern_base64: reader.result }));
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
            <div className="w-16 h-16 bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] rounded-full flex items-center justify-center mb-5">
              <CheckCircle className="w-8 h-8" />
            </div>
            <span className="eyebrow-editorial mb-1.5">EQUIPO AG LAB</span>
            <h2 className="title-editorial-hero text-3xl mb-2">¡Fichas Generadas!</h2>
            <p className="text-[#475569] max-w-md mb-8 text-sm">{message?.text}</p>
            <button onClick={handleNuevaCarga} className="btn-creative btn-next px-8">
              + Nueva Ficha
            </button>
          </div>
        )}

        {step < 4 && (
          <div className="mt-8 pt-5 border-t border-[#f1f5f9] flex gap-3">
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="btn-creative btn-back flex-1 disabled:opacity-0 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" /> Atrás
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="btn-creative btn-next flex-1"
              >
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-creative flex-[2] bg-[#000000] text-white hover:bg-[#1e293b]"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="mono-tabular">Generar {telasSeleccionadas.length} Fichas</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Official Logos Showcase at Bottom Center */}
      <footer className="mt-8 flex justify-center">
        <div className="inline-flex items-center justify-center gap-6 px-7 py-3.5 rounded-2xl bg-[#ffffff] border border-[#e2e8f0] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <img src="/ag-b.png" alt="AG LAB" className="official-logo official-logo-ag" />
          <span className="brand-logos-divider" style={{ height: '24px' }} />
          <img src="/AZZORTI.png" alt="AZZORTI" className="official-logo official-logo-azzorti" />
          <span className="brand-logos-divider" style={{ height: '24px' }} />
          <img src="/LIVVA.png" alt="LIVVA" className="official-logo official-logo-livva" />
        </div>
      </footer>
    </div>
  );
}
