import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Trash2, CheckCircle,
  AlertCircle, Loader2, Image as ImageIcon,
  Palette, ChevronRight, ChevronLeft,
  Download, MousePointer2,
  Brush, Layout, Clock, Check,
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
    { id: 1, title: 'Diseño', icon: <Brush className="w-3.5 h-3.5" /> },
    { id: 2, title: 'Técnico', icon: <Layout className="w-3.5 h-3.5" /> },
    { id: 3, title: 'Visual', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 4, title: 'Color', icon: <Palette className="w-3.5 h-3.5" /> }
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
              Estampado Localizado
            </h1>
          </div>
        </div>

        {/* Stepper Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => step < 5 && setStep(s.id)}
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
        style={{ borderTop: '3px solid #4f46e5' }}
      >
        {submitting && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-14 h-14 border-2 border-[#e2e8f0] border-t-[#4f46e5] rounded-full animate-spin mb-4" />
            <span className="eyebrow-editorial mb-1">PROCESANDO FICHA</span>
            <h3 className="text-lg font-extrabold text-[#0f172a] tracking-[-0.3px]">{statusMsg}</h3>
          </div>
        )}

        {message && step !== 5 && (
          <div className="mb-6 p-4 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-bold text-xs uppercase tracking-wide m-0">{message.text}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 flex-1">
            <div>
              <h2 className="title-editorial-section text-2xl">Esencia del Diseño</h2>
              <p className="text-[#64748b] text-xs font-medium mt-1 m-0">
                Define el ADN creativo y los datos editoriales de esta ficha técnica.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {isLocal ? (
                <div className="md:col-span-2 bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0]">
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
                  <select
                    name={f.name}
                    className="input-creative"
                    value={formData[f.name]}
                    onChange={handleInputChange}
                  >
                    <option value="">Seleccionar...</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 flex-1">
            <div>
              <h2 className="title-editorial-section text-2xl">Construcción Técnica</h2>
              <p className="text-[#64748b] text-xs font-medium mt-1 m-0">
                Especifica la base textil, dimensiones en centímetros y porcentaje de cubrimiento.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="label-creative">Tela Base</label>
                <input
                  list="telas"
                  name="tela_base"
                  className="input-creative"
                  value={formData.tela_base}
                  onChange={handleInputChange}
                  placeholder="Busca o selecciona la tela base..."
                />
                <datalist id="telas">
                  {opciones.tela_base?.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>

              <div>
                <label className="label-creative">Referencia</label>
                <input
                  type="text"
                  name="referencia"
                  className="input-creative mono-tabular"
                  value={formData.referencia}
                  onChange={handleInputChange}
                  placeholder="Ej: 10452"
                />
              </div>

              <div>
                <label className="label-creative"># Piezas</label>
                <input
                  type="text"
                  name="num_piezas"
                  className="input-creative mono-tabular"
                  value={formData.num_piezas}
                  onChange={handleInputChange}
                  placeholder="Ej: 1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label-creative mb-0">% Cubrimiento</label>
                  <button
                    type="button"
                    onClick={() => setShowCubrimientoModal(true)}
                    className="badge-hashtag cursor-pointer hover:bg-[#e0e7ff] transition-colors"
                    title="Calcular % automáticamente a partir del arte del estampado"
                  >
                    <Sparkles className="w-3 h-3 text-[#4f46e5]" />
                    <span>Calcular con Arte</span>
                  </button>
                </div>
                <input
                  type="text"
                  name="porc_cubrimiento"
                  className="input-creative mono-tabular w-full"
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
                  <p className="text-[11px] text-[#059669] font-bold mt-1.5 flex items-center gap-1 m-0 mono-tabular">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Calculado: {cubrimientoInfo.porcentaje_texto} (Real: {cubrimientoInfo.porcentaje_real}% • Fondo: {cubrimientoInfo.tiene_transparencia ? "Transparente" : cubrimientoInfo.color_fondo_hex})
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="label-creative"># Estampados</label>
                <select
                  name="num_estampados"
                  className="input-creative mono-tabular"
                  value={formData.num_estampados}
                  onChange={handleInputChange}
                >
                  <option value="">-</option>
                  {opciones.num_estampado?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="label-creative">Ancho (CM)</label>
                <input
                  type="text"
                  name="ancho_cm"
                  className="input-creative mono-tabular"
                  value={formData.ancho_cm}
                  onChange={handleInputChange}
                  placeholder="Ej: 22"
                />
              </div>

              <div>
                <label className="label-creative">Alto (CM)</label>
                <input
                  type="text"
                  name="alto_cm"
                  className="input-creative mono-tabular"
                  value={formData.alto_cm}
                  onChange={handleInputChange}
                  placeholder="Ej: 28"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label-creative">Notas / Observaciones</label>
                <textarea
                  name="observaciones"
                  className="input-creative h-20 resize-none"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  placeholder="Indicaciones de ubicación, acabados o técnica..."
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 flex-1">
            <div>
              <h2 className="title-editorial-section text-2xl">Moodboard Visual</h2>
              <p className="text-[#64748b] text-xs font-medium mt-1 m-0">
                Adjunta o pega directamente con Ctrl+V el Ropero CAD 2D y el Pantallazo del Molde.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Ropero CAD 2D', field: 'img_ropero_cad', ref: fileInputRopero, icon: <ImageIcon /> },
                { label: 'Pantallazo Molde', field: 'img_pantallazo_molde', ref: fileInputMolde, icon: <MousePointer2 /> }
              ].map((box) => (
                <div key={box.field} className="space-y-2">
                  <label className="label-creative">{box.label}</label>
                  <div
                    className={`upload-area h-64 outline-none ${
                      activeField === box.field ? 'border-[#4f46e5] bg-[#eef2ff]/60 ring-3 ring-[#eef2ff]' : ''
                    }`}
                    onPaste={(e) => handlePaste(e, box.field)}
                    onFocus={() => setActiveField(box.field)}
                    onBlur={() => setActiveField(null)}
                    onClick={() => box.ref.current.click()}
                    tabIndex="0"
                  >
                    {images[box.field] ? (
                      <img src={images[box.field]} alt={box.label} className="w-full h-full object-contain p-3" />
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <div className="w-11 h-11 bg-[#ffffff] border border-[#e2e8f0] shadow-xs rounded-xl flex items-center justify-center mb-3">
                          {React.cloneElement(box.icon, { className: "w-5 h-5 text-[#4f46e5]" })}
                        </div>
                        <p className="text-[#0f172a] font-bold text-xs mb-1 m-0">
                          Haz clic para subir o pega aquí (Ctrl + V)
                        </p>
                      </div>
                    )}
                    <input type="file" ref={box.ref} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, box.field)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 flex-1">
            <div className="flex items-center justify-between gap-4">
              <h2 className="title-editorial-section text-2xl">Armonía de Color</h2>
              <button
                type="button"
                onClick={() => setColores([...colores, { material: '', pantone: '', color: '' }])}
                className="btn-editorial-black"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agregar Color</span>
              </button>
            </div>

            <div className="space-y-3">
              {colores.map((c, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]"
                >
                  <select
                    className="input-creative flex-1"
                    value={c.material}
                    onChange={(e) => {
                      const n = [...colores];
                      n[i].material = e.target.value;
                      setColores(n);
                    }}
                  >
                    <option value="">Material...</option>
                    {opciones.material?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <input
                    type="text"
                    className="input-creative mono-tabular flex-1"
                    value={c.pantone}
                    onChange={(e) => {
                      const n = [...colores];
                      n[i].pantone = e.target.value;
                      setColores(n);
                    }}
                    placeholder="Código Pantone"
                  />
                  <input
                    type="text"
                    className="input-creative flex-1"
                    value={c.color}
                    onChange={(e) => {
                      const n = [...colores];
                      n[i].color = e.target.value;
                      setColores(n);
                    }}
                    placeholder="Nombre del Color"
                  />
                  <button
                    type="button"
                    onClick={() => setColores(colores.filter((_, idx) => idx !== i))}
                    className="p-2 text-[#64748b] hover:text-[#dc2626] hover:bg-[#fef2f2] rounded-lg transition-colors cursor-pointer bg-transparent border-0"
                    title="Eliminar color"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
            <div className="w-16 h-16 bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] rounded-full flex items-center justify-center mb-5">
              <CheckCircle className="w-8 h-8" />
            </div>
            <span className="eyebrow-editorial mb-1.5">EQUIPO AG LAB</span>
            <h2 className="title-editorial-hero text-3xl mb-2">¡Ficha en Cola!</h2>
            <p className="text-[#475569] max-w-md mb-8 text-sm">{message?.text}</p>
            <button onClick={() => setStep(1)} className="btn-creative btn-next px-8">
              + Nueva Ficha
            </button>
          </div>
        )}

        {step < 5 && (
          <div className="mt-8 pt-5 border-t border-[#f1f5f9] flex gap-3">
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="btn-creative btn-back flex-1 disabled:opacity-0 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" /> Atrás
            </button>
            {step < 4 ? (
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
                <span>Finalizar y Generar Ficha</span>
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

      {/* Modal para calcular cubrimiento */}
      {showCubrimientoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/50 backdrop-blur-xs">
          <div className="bg-[#ffffff] rounded-2xl p-7 max-w-md w-full shadow-2xl border border-[#e2e8f0] relative slide-up">
            <button
              type="button"
              onClick={() => setShowCubrimientoModal(false)}
              className="absolute top-5 right-5 text-[#64748b] hover:text-[#0f172a] transition-colors p-1 cursor-pointer bg-transparent border-0"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="avatar-editorial-black" style={{ width: '42px', height: '42px' }}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="title-editorial-card text-lg text-[#000000]">
                  Calcular % Cubrimiento
                </h3>
                <p className="text-[11px] text-[#64748b] m-0">
                  Detecta fondo transparente o sólido (CMYK/RGB)
                </p>
              </div>
            </div>

            <div
              className="upload-area h-52 outline-none"
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
                  <Loader2 className="w-9 h-9 text-[#4f46e5] animate-spin mb-3" />
                  <p className="font-bold text-xs text-[#0f172a] m-0">Analizando cobertura de color...</p>
                  <p className="text-[11px] text-[#64748b] mt-1 m-0">Calculando píxeles de tinta y descartando fondo</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-11 h-11 bg-[#ffffff] border border-[#e2e8f0] shadow-xs rounded-xl flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5 text-[#4f46e5]" />
                  </div>
                  <p className="text-[#0f172a] font-extrabold text-xs uppercase tracking-wider mb-1.5 m-0">
                    Haz clic para subir imagen o pega con Ctrl + V
                  </p>
                  <p className="text-[#64748b] text-[11px] m-0">Acepta PNG (transparente), JPG, CMYK y RGB</p>
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
                className="text-xs font-bold text-[#64748b] hover:text-[#0f172a] cursor-pointer bg-transparent border-0"
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
