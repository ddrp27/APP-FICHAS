import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Trash2, CheckCircle,
  AlertCircle, Loader2, Image as ImageIcon,
  Palette, ChevronRight, ChevronLeft,
  Download, MousePointer2,
  Brush, Layout, Clock, Check,
  Sparkles, X, Upload, FolderOpen
} from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000/api' : '/api';

function getBrandAccent(marca) {
  const m = (marca || '').toUpperCase();
  if (m.includes('LIVVA') && m.includes('AZZ')) return { color: '#0284c7', bg: '#e0f2fe', border: '#38bdf8', label: 'Azz Livv' };
  if (m.includes('LIVVA')) return { color: '#8b5cf6', bg: '#f3e8ff', border: '#c084fc', label: 'Livva' };
  if (m.includes('AZZORTI') || m.includes('DUPREE')) return { color: '#e11d48', bg: '#ffe4e6', border: '#fb7185', label: 'Azzorti' };
  return { color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', label: marca || 'AG LAB' };
}

export default function Localizado({
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

  // Sync top hybrid bar brand filter with formData.marca
  useEffect(() => {
    if (selectedBrand && selectedBrand !== 'ALL') {
      const match = (opciones.marca || []).find(
        m => m.toUpperCase() === selectedBrand.toUpperCase() || m.toUpperCase().includes(selectedBrand.toUpperCase())
      );
      setFormData(prev => ({ ...prev, marca: match || selectedBrand }));
    }
  }, [selectedBrand, opciones.marca]);

  // Sync selected designer from crew bar
  useEffect(() => {
    if (selectedDesigner) {
      if (selectedDesigner.type === 'GRAFICO') {
        setFormData(prev => ({ ...prev, dis_grafico: selectedDesigner.name }));
      } else if (selectedDesigner.type === 'MODA') {
        setFormData(prev => ({ ...prev, dis_moda: selectedDesigner.name }));
      }
    }
  }, [selectedDesigner]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'marca' && onSelectBrand) {
      onSelectBrand(value || 'ALL');
    }
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
      setMessage({ type: 'error', text: 'Sube ambas imágenes (Ropero CAD 2D y Pantallazo Molde) para continuar.' });
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
          text: `Ficha de referencia ${formData.referencia || 'SIN-REF'} agregada a la cola. Se guardará localmente y se descargará automáticamente al finalizar.`
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
    { id: 1, title: '1. Diseño', icon: <Brush className="w-3.5 h-3.5" /> },
    { id: 2, title: '2. Técnico', icon: <Layout className="w-3.5 h-3.5" /> },
    { id: 3, title: '3. Visual', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 4, title: '4. Color', icon: <Palette className="w-3.5 h-3.5" /> }
  ];

  const brandTheme = getBrandAccent(formData.marca);

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
              MÓDULO POSICIONAL • AG LAB
            </span>
            <h1 className="text-xl font-extrabold text-[#0f172a] tracking-tight">
              Ficha Técnica de Estampado Localizado
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
              #REF:{formData.referencia || 'PENDIENTE'}
            </span>
            {formData.campana && (
              <span className="camp-pill camp-pill-neutral">
                #CAMP:{formData.campana}
              </span>
            )}
            {formData.porc_cubrimiento && (
              <span className="camp-pill" style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}>
                #CUBRIMIENTO:{formData.porc_cubrimiento}
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold text-[#64748b]" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            PASO {Math.min(step, 4)} DE 4 • {colores.length} {colores.length === 1 ? 'COLOR' : 'COLORES'}
          </span>
        </div>

        {submitting && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-14 h-14 border-3 border-[#e2e8f0] border-t-[#000000] rounded-full animate-spin mb-4" />
            <h3 className="text-lg font-extrabold text-[#0f172a]">{statusMsg}</h3>
          </div>
        )}

        {message && step !== 5 && (
          <div className="mb-6 p-4 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#ef4444] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-bold text-xs uppercase tracking-wide">{message.text}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 flex-1">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#64748b]">
                SECCIÓN 01 • METADATOS EDITORIALES
              </span>
              <h2 className="text-2xl font-extrabold text-[#000000] tracking-tight mt-0.5">
                Esencia del Diseño &amp; Clasificación
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
                      value={formData.output_folder}
                      onChange={handleInputChange}
                      placeholder="Por defecto se guardará en la carpeta /output del proyecto"
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
                  <span>Modo Web Activo: El archivo .xlsm se descargará automáticamente en tu navegador al finalizar.</span>
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
              <span className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#64748b]">
                SECCIÓN 02 • ESPECIFICACIONES DE INGENIERÍA
              </span>
              <h2 className="text-2xl font-extrabold text-[#000000] tracking-tight mt-0.5">
                Construcción Técnica &amp; Dimensiones
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <label className="label-creative">Tela Base</label>
                <input
                  list="telas"
                  name="tela_base"
                  className="input-creative"
                  value={formData.tela_base}
                  onChange={handleInputChange}
                  placeholder="Escribe o selecciona la tela base..."
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
                  className="input-creative"
                  style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
                  value={formData.referencia}
                  onChange={handleInputChange}
                  placeholder="Ej: REF-2026-01"
                />
              </div>

              <div>
                <label className="label-creative"># Piezas</label>
                <input
                  type="text"
                  name="num_piezas"
                  className="input-creative"
                  style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
                  value={formData.num_piezas}
                  onChange={handleInputChange}
                  placeholder="Ej: 1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label-creative mb-0">% Cubrimiento</label>
                  <button
                    type="button"
                    onClick={() => setShowCubrimientoModal(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-[#eef2ff] text-[#4f46e5] hover:bg-[#e0e7ff] border border-[#c7d2fe] transition-colors cursor-pointer"
                    title="Calcular % automáticamente a partir del arte del estampado"
                  >
                    <Sparkles className="w-3 h-3 text-[#4f46e5]" />
                    <span>Calcular con Arte</span>
                  </button>
                </div>
                <input
                  type="text"
                  name="porc_cubrimiento"
                  className="input-creative w-full"
                  style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
                  value={formData.porc_cubrimiento}
                  onChange={handleInputChange}
                  placeholder="Ej: 25% (o pega imagen Ctrl+V)"
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
                  <p className="text-[10px] text-[#059669] font-bold mt-1 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
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
                  className="input-creative"
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
                  className="input-creative"
                  style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
                  value={formData.ancho_cm}
                  onChange={handleInputChange}
                  placeholder="Ej: 24"
                />
              </div>

              <div>
                <label className="label-creative">Alto (CM)</label>
                <input
                  type="text"
                  name="alto_cm"
                  className="input-creative"
                  style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
                  value={formData.alto_cm}
                  onChange={handleInputChange}
                  placeholder="Ej: 28"
                />
              </div>

              <div>
                <label className="label-creative">Alta Densidad</label>
                <select
                  name="alta_densi"
                  className="input-creative"
                  value={formData.alta_densi}
                  onChange={handleInputChange}
                >
                  <option value="">Seleccionar...</option>
                  {(opciones.alta_densi || ['SI', 'NO']).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="label-creative">Observaciones Técnicas</label>
                <textarea
                  name="observaciones"
                  className="input-creative h-24 resize-none"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  placeholder="Especificaciones de ubicación, tacto, temperatura o detalles especiales..."
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 flex-1">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#64748b]">
                SECCIÓN 03 • REGISTRO GRÁFICO
              </span>
              <h2 className="text-2xl font-extrabold text-[#000000] tracking-tight mt-0.5">
                Ropero CAD 2D &amp; Pantallazo de Molde
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: '1. Ropero CAD 2D', field: 'img_ropero_cad', ref: fileInputRopero, icon: <ImageIcon /> },
                { label: '2. Pantallazo Molde', field: 'img_pantallazo_molde', ref: fileInputMolde, icon: <MousePointer2 /> }
              ].map((box) => (
                <div key={box.field} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="label-creative mb-0">{box.label}</label>
                    {images[box.field] && (
                      <button
                        type="button"
                        onClick={() => setImages(prev => ({ ...prev, [box.field]: null }))}
                        className="text-[11px] font-bold text-[#e11d48] hover:underline"
                      >
                        Quitar imagen
                      </button>
                    )}
                  </div>
                  <div
                    className={`upload-area h-72 outline-none ${activeField === box.field ? 'ring-3 ring-[#4f46e5]/30 border-[#4f46e5]' : ''}`}
                    onPaste={(e) => handlePaste(e, box.field)}
                    onFocus={() => setActiveField(box.field)}
                    onBlur={() => setActiveField(null)}
                    onClick={() => box.ref.current.click()}
                    tabIndex="0"
                  >
                    {images[box.field] ? (
                      <img src={images[box.field]} alt={box.label} className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-white border border-[#e2e8f0] shadow-xs rounded-xl flex items-center justify-center mb-3">
                          {React.cloneElement(box.icon, { className: "w-5 h-5 text-[#0f172a]" })}
                        </div>
                        <p className="text-[#0f172a] font-extrabold text-xs uppercase tracking-wider mb-1">
                          Haz clic para subir archivo
                        </p>
                        <span className="camp-pill">o pega aquí con Ctrl + V</span>
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
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#64748b]">
                  SECCIÓN 04 • ESPECIFICACIÓN CROMÁTICA
                </span>
                <h2 className="text-2xl font-extrabold text-[#000000] tracking-tight mt-0.5">
                  Armonía de Color &amp; Pantones
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setColores([...colores, { material: '', pantone: '', color: '' }])}
                className="btn-editorial-dark"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agregar Color</span>
              </button>
            </div>

            <div className="space-y-3">
              {colores.map((c, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3.5 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]"
                  style={{ borderLeft: '4px solid #0f172a' }}
                >
                  <div className="md:col-span-1">
                    <span className="camp-pill camp-pill-neutral">#{i + 1}</span>
                  </div>
                  <div className="md:col-span-4">
                    <select
                      className="input-creative"
                      value={c.material}
                      onChange={(e) => {
                        const n = [...colores];
                        n[i].material = e.target.value;
                        setColores(n);
                      }}
                    >
                      <option value="">Material / Base...</option>
                      {opciones.material?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      className="input-creative"
                      style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
                      value={c.pantone}
                      onChange={(e) => {
                        const n = [...colores];
                        n[i].pantone = e.target.value;
                        setColores(n);
                      }}
                      placeholder="Código Pantone (TCX/C)"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      className="input-creative"
                      value={c.color}
                      onChange={(e) => {
                        const n = [...colores];
                        n[i].color = e.target.value;
                        setColores(n);
                      }}
                      placeholder="Nombre del Color"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setColores(colores.filter((_, idx) => idx !== i))}
                      className="p-2 text-[#64748b] hover:text-[#e11d48] hover:bg-[#ffe4e6] rounded-lg transition-colors"
                      title="Eliminar fila de color"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col items-center justify-center py-14 text-center flex-1">
            <div className="w-16 h-16 bg-[#f0fdf4] text-[#22c55e] border border-[#bbf7d0] rounded-full flex items-center justify-center mb-5">
              <CheckCircle className="w-8 h-8" />
            </div>
            <span className="login-eyebrow">PROCESO EN COLA</span>
            <h2 className="text-2xl font-extrabold text-[#000000] mb-2">¡Ficha Técnica Encolada con Éxito!</h2>
            <p className="text-[#475569] max-w-md mb-8 text-sm">{message?.text}</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(1)} className="btn-creative btn-next">
                Crear Nueva Ficha Localizada
              </button>
              <button onClick={onBack} className="btn-creative btn-back">
                Volver al Estudio
              </button>
            </div>
          </div>
        )}

        {step < 5 && (
          <div className="mt-8 pt-5 border-t border-[#f1f5f9] flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="btn-creative btn-back disabled:opacity-0"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>

            {step < 4 ? (
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
                <span>Generar y Descargar Ficha (.XLSM)</span>
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

      {/* Modal para calcular cubrimiento */}
      {showCubrimientoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-7 max-w-md w-full shadow-2xl border border-[#e2e8f0] relative slide-up">
            <button
              type="button"
              onClick={() => setShowCubrimientoModal(false)}
              className="absolute top-5 right-5 text-[#64748b] hover:text-[#0f172a] transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-[#000000] text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-[#64748b] block">
                  ANÁLISIS COLORIMÉTRICO CIELAB
                </span>
                <h3 className="text-lg font-extrabold text-[#000000] tracking-tight">
                  Calcular % de Cubrimiento
                </h3>
              </div>
            </div>

            <div
              className="upload-area h-52 flex flex-col items-center justify-center cursor-pointer outline-none"
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
                  <Loader2 className="w-8 h-8 text-[#4f46e5] animate-spin mb-3" />
                  <p className="font-bold text-sm text-[#0f172a]">Analizando cobertura de tinta...</p>
                  <p className="text-xs text-[#64748b] mt-1">Descartando fondo y redondeando al 5% superior</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-11 h-11 bg-white border border-[#e2e8f0] shadow-xs rounded-xl flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5 text-[#4f46e5]" />
                  </div>
                  <p className="text-[#0f172a] font-extrabold text-xs uppercase tracking-wider mb-1.5">
                    Haz clic para subir el arte aislado
                  </p>
                  <span className="camp-pill mb-2">o pega aquí con Ctrl + V</span>
                  <p className="text-[#64748b] text-[11px]">Soporta PNG transparente, JPG, CMYK y RGB</p>
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

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCubrimientoModal(false)}
                className="btn-editorial-outline text-xs py-1.5 px-4"
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
