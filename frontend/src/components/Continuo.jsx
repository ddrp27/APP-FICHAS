import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Trash2, CheckCircle, AlertCircle,
  Loader2, Image as ImageIcon, Palette,
  ChevronRight, ChevronLeft, Download,
  Brush, Layout, X, Search, Check, Clock, FolderOpen, Layers
} from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000/api' : '/api';

function getBrandAccent(marca) {
  const m = (marca || '').toUpperCase();
  if (m.includes('LIVVA') && m.includes('AZZ')) return { color: '#0284c7', bg: '#e0f2fe', border: '#38bdf8', label: 'Azz Livv' };
  if (m.includes('LIVVA')) return { color: '#8b5cf6', bg: '#f3e8ff', border: '#c084fc', label: 'Livva' };
  if (m.includes('AZZORTI') || m.includes('DUPREE')) return { color: '#e11d48', bg: '#ffe4e6', border: '#fb7185', label: 'Azzorti' };
  return { color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', label: marca || 'AG LAB' };
}

export default function Continuo({
  opciones,
  onBack,
  onQueueTask,
  isLocal,
  selectedBrand,
  onSelectBrand,
  selectedDesigner
}) {
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

  // Sync top hybrid bar brand filter with globalData.marca
  useEffect(() => {
    if (selectedBrand && selectedBrand !== 'ALL') {
      const match = (opciones.marca || []).find(
        m => m.toUpperCase() === selectedBrand.toUpperCase() || m.toUpperCase().includes(selectedBrand.toUpperCase())
      );
      setGlobalData(prev => ({ ...prev, marca: match || selectedBrand }));
    }
  }, [selectedBrand, opciones.marca]);

  // Sync selected designer from crew bar
  useEffect(() => {
    if (selectedDesigner) {
      if (selectedDesigner.type === 'GRAFICO') {
        setGlobalData(prev => ({ ...prev, dis_grafico: selectedDesigner.name }));
      } else if (selectedDesigner.type === 'MODA') {
        setGlobalData(prev => ({ ...prev, dis_moda: selectedDesigner.name }));
      }
    }
  }, [selectedDesigner]);

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
    if (name === 'marca' && onSelectBrand) {
      onSelectBrand(value || 'ALL');
    }
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
      setMessage({ type: 'error', text: 'Sube un pattern y selecciona al menos una tela base.' });
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
    { id: 1, title: '1. Datos Globales', icon: <Brush className="w-3.5 h-3.5" /> },
    { id: 2, title: '2. Bases Textiles', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 3, title: '3. Pattern / Rapport', icon: <ImageIcon className="w-3.5 h-3.5" /> }
  ];

  const brandTheme = getBrandAccent(globalData.marca);

  return (
    <div className="w-full slide-up">
      {/* Editorial Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="btn-editorial-outline py-1.5 px-3 text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Volver al Estudio
          </button>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#64748b] block">
              MÓDULO MULTITELA • AG LAB
            </span>
            <h1 className="text-xl font-extrabold text-[#0f172a] tracking-tight">
              Ficha Técnica de Estampado Continuo
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
              className={`step-pill flex items-center gap-1.5 ${step === s.id ? 'pill-active' : 'pill-inactive'}`}
            >
              {s.icon} <span>{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Editorial Sheet Card */}
      <div
        className="creative-card min-h-[560px] flex flex-col relative overflow-hidden"
        style={{ borderLeft: `4px solid ${brandTheme.color}` }}
      >
        {/* Top Metadata Strip inside Sheet */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-6 border-b border-[#f1f5f9]">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="camp-pill"
              style={{
                background: brandTheme.bg,
                color: brandTheme.color,
                borderColor: brandTheme.border
              }}
            >
              #{brandTheme.label.toUpperCase()}
            </span>
            <span className="camp-pill camp-pill-neutral">
              #REF:{globalData.referencia || 'PENDIENTE'}
            </span>
            <span className="camp-pill camp-pill-neutral">
              #PROCESO:{globalData.proceso}
            </span>
            <span className="camp-pill" style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}>
              #{telasSeleccionadas.length}_TELAS_SELECCIONADAS
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#64748b]" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            PASO {Math.min(step, 3)} DE 3 • LOTE MULTITELA
          </span>
        </div>

        {submitting && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-14 h-14 border-3 border-[#e2e8f0] border-t-[#000000] rounded-full animate-spin mb-4" />
            <h3 className="text-lg font-extrabold text-[#0f172a]">
              Encolando lote de {telasSeleccionadas.length} fichas continuas...
            </h3>
          </div>
        )}

        {message && step !== 4 && (
          <div className="mb-6 p-4 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#ef4444] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-bold text-xs uppercase tracking-wide">{message.text}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 flex-1">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#64748b]">
                SECCIÓN 01 • CONFIGURACIÓN DEL LOTE
              </span>
              <h2 className="text-2xl font-extrabold text-[#000000] tracking-tight mt-0.5">
                Datos Globales del Pattern Continuo
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {isLocal ? (
                <div className="md:col-span-2 lg:col-span-3 bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0]">
                  <label className="label-creative">Carpeta de Destino Local</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="output_folder"
                      className="input-creative flex-1"
                      value={globalData.output_folder}
                      onChange={handleGlobalChange}
                      placeholder="Por defecto se guardará en la carpeta /output del proyecto"
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
                      className="btn-editorial-outline px-4"
                      title="Seleccionar Carpeta"
                    >
                      <FolderOpen className="w-4 h-4 text-[#4f46e5]" />
                      <span>Explorar...</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="md:col-span-2 lg:col-span-3 p-3.5 bg-[#eef2ff] border border-[#c7d2fe] rounded-xl text-[#4338ca] text-xs font-bold flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#4f46e5] shrink-0" />
                  <span>Modo Web Activo: Los archivos se descargarán de forma directa (comprimidos en ZIP) al finalizar.</span>
                </div>
              )}

              {[
                { label: 'Referencia / Código Pattern', name: 'referencia', type: 'text', mono: true },
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
                      className="input-creative"
                      style={f.mono ? { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' } : {}}
                      value={globalData[f.name]}
                      onChange={handleGlobalChange}
                      placeholder="Ej: CONT-2026-01"
                    />
                  )}
                </div>
              ))}

              <div>
                <label className="label-creative">Proceso Textil</label>
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

              <div className="md:col-span-2">
                <label className="label-creative">Observaciones Globales</label>
                <textarea
                  name="observaciones"
                  className="input-creative h-20 resize-none"
                  value={globalData.observaciones}
                  onChange={handleGlobalChange}
                  placeholder="Indicaciones de rapport, dirección de hilo, encogimiento o acabados..."
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#64748b]">
                  SECCIÓN 02 • MATRIZ DE BASES TEXTILES
                </span>
                <div className="flex items-center gap-3 mt-0.5">
                  <h2 className="text-2xl font-extrabold text-[#000000] tracking-tight">
                    Selección de Telas Base
                  </h2>
                  {telasSeleccionadas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTelasSeleccionadas([])}
                      className="preset-pill-btn preset-clear"
                    >
                      Limpiar telas ({telasSeleccionadas.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTelaSearch(!showTelaSearch)}
                  className="btn-editorial-dark"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Añadir Tela Base</span>
                </button>

                {showTelaSearch && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-[#cbd5e1] shadow-xl rounded-xl z-50 p-3 max-h-72 flex flex-col">
                    <div className="relative mb-2.5">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" />
                      <input
                        type="text"
                        autoFocus
                        className="input-creative py-1.5 pl-8 text-xs"
                        placeholder="Buscar tela por nombre..."
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
                          className="w-full text-left px-3 py-2 hover:bg-[#eef2ff] hover:text-[#4f46e5] rounded-lg text-xs font-bold text-[#0f172a] transition-colors uppercase truncate"
                        >
                          {t}
                        </button>
                      ))}
                      {filteredTelas.length === 0 && (
                        <p className="text-center py-4 text-xs text-[#64748b] font-semibold">
                          No se encontraron telas con ese filtro
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3.5">
              {telasSeleccionadas.map((tela, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl space-y-4 slide-up relative"
                  style={{ borderLeft: '4px solid #000000' }}
                >
                  <button
                    type="button"
                    onClick={() => setTelasSeleccionadas(telasSeleccionadas.filter((_, i) => i !== idx))}
                    className="absolute top-4 right-4 text-[#64748b] hover:text-[#e11d48] p-1 transition-colors"
                    title="Quitar esta tela"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="camp-pill camp-pill-neutral">TELA #{idx + 1}</span>
                    <p className="text-base font-extrabold text-[#000000] tracking-tight">
                      {tela.nombre_tela}
                    </p>
                    <span className="camp-pill" style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}>
                      ✓ COMPOSICIÓN AUTOMÁTICA
                    </span>
                  </div>

                  {globalData.proceso === 'ESTAMPACION' && (
                    <div className="space-y-3 pt-3 border-t border-[#e2e8f0]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#475569]">
                          Pantones asignados a esta tela
                        </span>
                        <button
                          type="button"
                          onClick={() => addPantone(idx)}
                          className="preset-pill-btn preset-aglab"
                        >
                          + Añadir Pantone
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {tela.pantones.map((p, pIdx) => (
                          <div
                            key={pIdx}
                            className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#cbd5e1] shadow-2xs"
                          >
                            <input
                              type="text"
                              className="w-28 outline-none text-xs font-bold text-[#0f172a]"
                              style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
                              value={p}
                              onChange={(e) => updatePantone(idx, pIdx, e.target.value)}
                              placeholder="PMS / TCX..."
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newTelas = [...telasSeleccionadas];
                                newTelas[idx].pantones.splice(pIdx, 1);
                                setTelasSeleccionadas(newTelas);
                              }}
                              className="text-[#94a3b8] hover:text-[#e11d48]"
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
                  <p className="text-[#64748b] font-bold uppercase tracking-wider text-xs">
                    Añade una o más bases textiles usando el botón &ldquo;+ Añadir Tela Base&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#64748b]">
                  SECCIÓN 03 • ARTE DEL RAPPORT
                </span>
                <h2 className="text-2xl font-extrabold text-[#000000] tracking-tight mt-0.5">
                  Imagen del Pattern Continuo
                </h2>
              </div>
              {globalData.imagen_pattern_base64 && (
                <button
                  type="button"
                  onClick={() => setGlobalData(prev => ({ ...prev, imagen_pattern_base64: '' }))}
                  className="text-xs font-bold text-[#e11d48] hover:underline"
                >
                  Cambiar imagen
                </button>
              )}
            </div>

            <div
              className={`upload-area h-80 outline-none ${activeField ? 'ring-3 ring-[#4f46e5]/30 border-[#4f46e5]' : ''}`}
              onPaste={handlePaste}
              onFocus={() => setActiveField(true)}
              onBlur={() => setActiveField(false)}
              onClick={() => fileInputPattern.current.click()}
              tabIndex="0"
            >
              {globalData.imagen_pattern_base64 ? (
                <img src={globalData.imagen_pattern_base64} alt="Pattern" className="w-full h-full object-contain p-4" />
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-white border border-[#e2e8f0] shadow-xs rounded-xl flex items-center justify-center mb-3">
                    <ImageIcon className="w-6 h-6 text-[#0f172a]" />
                  </div>
                  <p className="text-[#0f172a] font-extrabold text-xs uppercase tracking-wider mb-1.5">
                    Haz clic para subir el módulo / pattern
                  </p>
                  <span className="camp-pill">o pega directamente con Ctrl + V</span>
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
          <div className="flex flex-col items-center justify-center py-14 text-center flex-1">
            <div className="w-16 h-16 bg-[#f0fdf4] text-[#22c55e] border border-[#bbf7d0] rounded-full flex items-center justify-center mb-5">
              <CheckCircle className="w-8 h-8" />
            </div>
            <span className="login-eyebrow">LOTE EN COLA</span>
            <h2 className="text-2xl font-extrabold text-[#000000] mb-2">¡Lote de Fichas Continuas Encolado!</h2>
            <p className="text-[#475569] max-w-md mb-8 text-sm">{message?.text}</p>
            <div className="flex items-center gap-3">
              <button onClick={handleNuevaCarga} className="btn-creative btn-next">
                Nueva Carga Continua
              </button>
              <button onClick={onBack} className="btn-creative btn-back">
                Volver al Estudio
              </button>
            </div>
          </div>
        )}

        {step < 4 && (
          <div className="mt-8 pt-5 border-t border-[#f1f5f9] flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="btn-creative btn-back disabled:opacity-0"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="btn-creative btn-next"
              >
                Siguiente Paso <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-creative btn-next bg-[#10b981] hover:bg-[#059669]"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Generar Lote ({telasSeleccionadas.length} Fichas)</span>
              </button>
            )}
          </div>
        )}

        {/* Editorial Card Footer with the 3 Brand Logos */}
        <footer className="login-footer-brands mt-6 pt-4">
          <div className="login-brands-track">
            <img src="/ag-b.png" alt="AG LAB" className="brand-foot-logo logo-agb" style={{ maxHeight: '28px' }} />
            <span className="brand-foot-divider" />
            <img src="/AZZORTI.png" alt="AZZORTI" className="brand-foot-logo logo-azzorti" style={{ maxHeight: '16px' }} />
            <span className="brand-foot-divider" />
            <img src="/LIVVA.png" alt="LIVVA" className="brand-foot-logo logo-livva" style={{ maxHeight: '15px' }} />
          </div>
        </footer>
      </div>
    </div>
  );
}
