import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Trash2, CheckCircle,
  AlertCircle, Loader2, Image as ImageIcon,
  Palette, ChevronRight, ChevronLeft,
  Download, MousePointer2,
  Brush, Zap, Layout, Clock, Check,
  Sparkles, X, Upload
} from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000/api' : '/api';
export default function Localizado({ opciones, onBack, onQueueTask, isLocal }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [message, setMessage] = useState(null);
  const [activeField, setActiveField] = useState(null);

  // Cubrimiento calculation state
  const [showCubrimientoModal, setShowCubrimientoModal] = useState(false);
  const [analizandoCubrimiento, setAnalizandoCubrimiento] = useState(false);
  const [cubrimientoInfo, setCubrimientoInfo] = useState(null);
  const fileInputCubrimiento = useRef(null);

  const fileInputRopero = useRef(null);
  const fileInputMolde = useRef(null);
  const [formData, setFormData] = useState({
    marca: '', dis_grafico: '', dis_moda: '', campana: '',
    anio: '', linea: '', proceso: '', tipo_logo: '',
    pieza: '', foil: '', referencia: '', tela_base: '',
    num_piezas: '', porc_cubrimiento: '', alta_densi: '',
    fecha_ficha: new Date().toISOString().split('T')[0],
    ancho_cm: '', alto_cm: '', num_estampados: '', observaciones: '',
    output_folder: ''
  });

  const [colores, setColores] = useState([{ material: '', pantone: '', color: '' }]);
  const [images, setImages] = useState({ img_ropero_cad: null, img_pantallazo_molde: null });



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaste = (e, field) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setImages(prev => ({ ...prev, [field]: reader.result }));
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const procesarImagenCubrimiento = async (fileOrBlob) => {
    setAnalizandoCubrimiento(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result;
        const res = await axios.post(`${API_BASE}/calcular-cubrimiento`, {
          imagen_base64: base64
        });
        if (res.data && res.data.porcentaje_texto) {
          setFormData(prev => ({ ...prev, porc_cubrimiento: res.data.porcentaje_texto }));
          setCubrimientoInfo(res.data);
          setShowCubrimientoModal(false);
        }
      } catch (err) {
        console.error("Error calculando cubrimiento:", err);
        alert("No se pudo calcular el cubrimiento. Verifica que la imagen sea válida.");
      } finally {
        setAnalizandoCubrimiento(false);
      }
    };
    reader.readAsDataURL(fileOrBlob);
  };

  const handleSubmit = async () => {
    if (!images.img_ropero_cad || !images.img_pantallazo_molde) {
      setMessage({ type: 'error', text: 'Sube ambas imágenes para continuar.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setStatusMsg('Encolando generación de ficha...');

    try {
      const payload = { ...formData, ...images, colores };
      const res = await axios.post(`${API_BASE}/generar-ficha-async`, payload);

      if (res.data.task_id) {
        if (onQueueTask) {
          onQueueTask(res.data.task_id);
        }
        setMessage({ 
          type: 'success', 
          text: `Ficha de referencia ${formData.referencia || ''} agregada a la cola. Se guardará localmente y se descargará automáticamente al finalizar.` 
        });
        setStep(5);
      } else {
        throw new Error("No se recibió task_id de la API.");
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error al iniciar proceso en segundo plano.' });
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'Diseño', icon: <Brush className="w-4 h-4" /> },
    { id: 2, title: 'Técnico', icon: <Layout className="w-4 h-4" /> },
    { id: 3, title: 'Visual', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 4, title: 'Color', icon: <Palette className="w-4 h-4" /> }
  ];

  return (
    <div className="w-full max-w-3xl slide-up">
      <header className="mb-12 text-center">
        <button onClick={onBack} className="mb-4 text-xs font-bold text-white/60 hover:text-white flex items-center gap-2 mx-auto bg-white/10 px-4 py-2 rounded-full transition-all">
          <ChevronLeft className="w-3 h-3" /> VOLVER AL MENÚ
        </button>
        <div className="inline-flex items-center gap-3 bg-white/30 backdrop-blur-md px-6 py-3 rounded-full border border-white/50 shadow-sm mb-6">
          <h1 className="font-outfit text-2xl font-black text-white tracking-tight">Estampado <span className="text-indigo-400">Localizado</span></h1>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {steps.map((s) => (
            <div key={s.id} className={`step-pill flex items-center gap-2 ${step === s.id ? 'pill-active' : 'pill-inactive'}`}>
              {s.icon} <span>{s.title}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="creative-card min-h-[600px] flex flex-col relative overflow-hidden">
        {submitting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6" />
            <h3 className="text-2xl font-black text-slate-900">{statusMsg}</h3>
          </div>
        )}

        {message && step !== 5 && (
          <div className="mb-8 p-6 rounded-[24px] bg-rose-50 border-2 border-rose-100 text-rose-600 flex items-center gap-4">
            <AlertCircle className="w-6 h-6" />
            <p className="font-bold text-sm uppercase">{message.text}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-10 flex-1">
            <div>
              <h2 className="font-outfit text-4xl font-black text-slate-900 mb-3">Esencia del Diseño</h2>
              <p className="text-slate-400 font-medium">Define el ADN creativo de esta ficha.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {isLocal ? (
                <div className="md:col-span-2">
                  <label className="label-creative">Carpeta de Destino</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      name="output_folder" 
                      className="input-creative flex-1" 
                      value={formData.output_folder} 
                      onChange={handleInputChange} 
                      placeholder="Dejar vacío para usar carpeta /output" 
                    />
                    <button 
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await axios.get(`${API_BASE}/select-folder`);
                          if (res.data.path) {
                            setFormData(prev => ({ ...prev, output_folder: res.data.path }));
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
                  <span>Modo Web: Los archivos se descargarán de forma directa en tu computadora al finalizar.</span>
                </div>
              )}
              {[
                { label: 'Marca', name: 'marca', options: opciones.marca },
                { label: 'Línea', name: 'linea', options: opciones.linea },
                { label: 'Diseñador Gráfico', name: 'dis_grafico', options: opciones.dis_graf },
                { label: 'Diseñador Moda', name: 'dis_moda', options: opciones.dis_mod },
                { label: 'Campaña', name: 'campana', options: opciones.campana },
                { label: 'Año', name: 'anio', options: opciones.anio },
                { label: 'Proceso', name: 'proceso', options: opciones.proceso },
                { label: 'Tipo Logo', name: 'tipo_logo', options: opciones.tipo_logo },
                { label: 'Pieza', name: 'pieza', options: opciones.pieza },
                { label: 'Foil', name: 'foil', options: opciones.foil },
              ].map((f) => (
                <div key={f.name}>
                  <label className="label-creative">{f.label}</label>
                  <select name={f.name} className="input-creative appearance-none" value={formData[f.name]} onChange={handleInputChange}>
                    <option value="">Seleccionar...</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10 flex-1">
            <h2 className="font-outfit text-4xl font-black text-slate-900 mb-3">Construcción Técnica</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className="label-creative">Tela Base</label>
                <input list="telas" name="tela_base" className="input-creative" value={formData.tela_base} onChange={handleInputChange} placeholder="Busca la tela..." />
                <datalist id="telas">{opciones.tela_base?.map(t => <option key={t} value={t} />)}</datalist>
              </div>
              <div><label className="label-creative">Referencia</label><input type="text" name="referencia" className="input-creative" value={formData.referencia} onChange={handleInputChange} /></div>
              <div><label className="label-creative"># Piezas</label><input type="text" name="num_piezas" className="input-creative" value={formData.num_piezas} onChange={handleInputChange} /></div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label-creative mb-0">% Cubrimiento</label>
                  <button
                    type="button"
                    onClick={() => setShowCubrimientoModal(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-sm"
                    title="Calcular % automáticamente a partir del arte del estampado"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Calcular con Arte</span>
                  </button>
                </div>
                <input
                  type="text"
                  name="porc_cubrimiento"
                  className="input-creative w-full"
                  value={formData.porc_cubrimiento}
                  onChange={handleInputChange}
                  placeholder="Ej: 25%"
                  onPaste={(e) => {
                    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.indexOf("image") !== -1) {
                        const blob = items[i].getAsFile();
                        if (blob) {
                          e.preventDefault();
                          procesarImagenCubrimiento(blob);
                        }
                      }
                    }
                  }}
                />
                {cubrimientoInfo && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      Calculado: {cubrimientoInfo.porcentaje_texto} (Real: {cubrimientoInfo.porcentaje_real}% • Fondo: {cubrimientoInfo.tiene_transparencia ? "Transparente" : cubrimientoInfo.color_fondo_hex})
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label className="label-creative"># Estampados</label>
                <select name="num_estampados" className="input-creative appearance-none" value={formData.num_estampados} onChange={handleInputChange}>
                  <option value="">-</option>
                  {opciones.num_estampado?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div><label className="label-creative">Ancho (CM)</label><input type="text" name="ancho_cm" className="input-creative" value={formData.ancho_cm} onChange={handleInputChange} /></div>
              <div><label className="label-creative">Alto (CM)</label><input type="text" name="alto_cm" className="input-creative" value={formData.alto_cm} onChange={handleInputChange} /></div>
              <div className="md:col-span-2"><label className="label-creative">Notas</label><textarea name="observaciones" className="input-creative h-20 resize-none" value={formData.observaciones} onChange={handleInputChange} /></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-10 flex-1">
            <h2 className="font-outfit text-4xl font-black text-slate-900 mb-3">Moodboard Visual</h2>
            <div className="grid grid-cols-1 gap-8">
              {[
                { label: 'Ropero CAD 2D', field: 'img_ropero_cad', ref: fileInputRopero, icon: <ImageIcon /> },
                { label: 'Pantallazo Molde', field: 'img_pantallazo_molde', ref: fileInputMolde, icon: <MousePointer2 /> }
              ].map((box) => (
                <div key={box.field} className="space-y-4">
                  <label className="label-creative">{box.label}</label>
                  <div
                    className={`upload-area h-64 outline-none ${activeField === box.field ? 'ring-4 ring-indigo-400 border-indigo-500' : ''}`}
                    onPaste={(e) => handlePaste(e, box.field)}
                    onFocus={() => setActiveField(box.field)}
                    onBlur={() => setActiveField(null)}
                    onClick={() => box.ref.current.click()}
                    tabIndex="0"
                  >
                    {images[box.field] ? (
                      <img src={images[box.field]} className="w-full h-full object-contain p-4" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-white shadow-xl rounded-2xl flex items-center justify-center mb-4">
                          {React.cloneElement(box.icon, { className: "w-6 h-6 text-indigo-400" })}
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">Haz clic o Pega aquí</p>
                      </div>
                    )}
                    <input type="file" ref={box.ref} className="hidden" onChange={(e) => handleFileChange(e, box.field)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-10 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="font-outfit text-4xl font-black text-slate-900">Armonía de Color</h2>
              <button onClick={() => setColores([...colores, { material: '', pantone: '', color: '' }])} className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg"><Plus /></button>
            </div>
            <div className="space-y-4">
              {colores.map((c, i) => (
                <div key={i} className="flex gap-4 p-4 bg-slate-50/50 rounded-2xl border-2 border-slate-100">
                  <select className="input-creative flex-1" value={c.material} onChange={(e) => { const n = [...colores]; n[i].material = e.target.value; setColores(n); }}><option value="">Material...</option>{opciones.material?.map(o => <option key={o} value={o}>{o}</option>)}</select>
                  <input type="text" className="input-creative flex-1" value={c.pantone} onChange={(e) => { const n = [...colores]; n[i].pantone = e.target.value; setColores(n); }} placeholder="Pantone" />
                  <input type="text" className="input-creative flex-1" value={c.color} onChange={(e) => { const n = [...colores]; n[i].color = e.target.value; setColores(n); }} placeholder="Color" />
                  <button onClick={() => setColores(colores.filter((_, idx) => idx !== i))} className="text-rose-500"><Trash2 className="w-5 h-5" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col items-center justify-center py-20 text-center flex-1">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6"><CheckCircle className="w-10 h-10" /></div>
            <h2 className="text-4xl font-black text-slate-900 mb-2">¡Éxito!</h2>
            <p className="text-slate-400 mb-10">{message?.text}</p>
            <button onClick={() => setStep(1)} className="btn-creative btn-next px-10">Nueva Ficha</button>
          </div>
        )}

        {step < 5 && (
          <div className="mt-12 flex gap-4">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 1} className="btn-creative btn-back flex-1 justify-center disabled:opacity-0"><ChevronLeft /> Atrás</button>
            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)} className="btn-creative btn-next flex-1 justify-center">Continuar <ChevronRight /></button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="btn-creative btn-next flex-[2] justify-center bg-emerald-600">
                {submitting ? <Loader2 className="animate-spin" /> : <Download />} Finalizar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal para calcular cubrimiento */}
      {showCubrimientoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 relative slide-up">
            <button
              type="button"
              onClick={() => setShowCubrimientoModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                <Sparkles className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-outfit text-xl font-black text-slate-900 tracking-tight">Calcular % Cubrimiento</h3>
                <p className="text-xs text-slate-400 font-medium">Detecta fondo transparente o sólido (CMYK/RGB)</p>
              </div>
            </div>

            <div
              className="upload-area h-56 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-3xl p-6 transition-all bg-indigo-50/20 outline-none"
              onClick={() => fileInputCubrimiento.current?.click()}
              onPaste={(e) => {
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) procesarImagenCubrimiento(blob);
                  }
                }
              }}
              tabIndex="0"
            >
              {analizandoCubrimiento ? (
                <div className="flex flex-col items-center text-center">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                  <p className="font-bold text-sm text-slate-800">Analizando cobertura de color...</p>
                  <p className="text-xs text-slate-400 mt-1">Calculando píxeles de tinta y descartando fondo</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-white shadow-md rounded-2xl flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6 text-indigo-500" />
                  </div>
                  <p className="text-slate-800 font-black text-xs uppercase tracking-wider mb-1">
                    Haz clic para subir imagen
                  </p>
                  <p className="text-indigo-600 font-extrabold text-[11px] bg-indigo-100/70 px-3 py-1 rounded-full mb-2">
                    o pega aquí con Ctrl + V
                  </p>
                  <p className="text-slate-400 text-[10px]">Acepta PNG (transparente), JPG, CMYK y RGB</p>
                </div>
              )}
              <input
                type="file"
                ref={fileInputCubrimiento}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) procesarImagenCubrimiento(file);
                }}
              />
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowCubrimientoModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
