import os
import sys
import uuid
import base64
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openpyxl
import traceback
from openpyxl.drawing.image import Image
from PIL import Image as PILImage
import io
import math
import numpy as np
import queue
import threading
import gc
import shutil
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

HAS_TKINTER = True
try:
    import tkinter as tk
    from tkinter import filedialog
except (ImportError, ModuleNotFoundError):
    HAS_TKINTER = False

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

def get_resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)

def get_external_path(relative_path):
    """ Get path to resource outside the executable bundle (portable) """
    if getattr(sys, 'frozen', False):
        # The application is frozen (running as an .exe)
        base_path = os.path.dirname(sys.executable)
    else:
        # The application is running in a normal Python environment
        script_dir = os.path.dirname(os.path.abspath(__file__))
        if os.path.basename(script_dir) == "backend":
            base_path = os.path.dirname(script_dir)
        else:
            base_path = script_dir
    
    return os.path.join(base_path, relative_path)

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"Validation Error: {exc.errors()}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration for persistence and resources
# We use get_external_path for things that should be editable/visible by the user (templates, output)
# We use get_resource_path for things bundled inside (frontend dist)
BASE_DIR = os.path.abspath(".")
UPLOADS_DIR = get_external_path("uploads")
OUTPUT_DIR = get_external_path("output")
TEMPLATES_DIR = get_external_path("templates")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

class ColorRow(BaseModel):
    material: str
    pantone: str
    color: str
    pasada: Optional[str] = ""
    maquina: Optional[str] = ""
    temp: Optional[str] = ""
    t_expo: Optional[str] = ""

class FichaData(BaseModel):
    # AZUL
    marca: str
    dis_grafico: str
    dis_moda: str
    campana: str
    anio: str
    linea: str
    proceso: str
    tipo_logo: str
    pieza: str
    foil: str
    # ROJO
    referencia: str
    tela_base: str
    num_piezas: str
    porc_cubrimiento: str
    alta_densi: str
    fecha_ficha: str
    ancho_cm: str
    alto_cm: str
    num_estampados: str
    observaciones: str
    output_folder: Optional[str] = ""
    # IMAGES (base64)
    img_ropero_cad: str
    img_pantallazo_molde: str
    # COLORS
    colores: List[ColorRow]

# CONTINUO MODELS
class ContinuoGlobal(BaseModel):
    referencia: str
    marca: str
    campana: str
    linea: str
    dis_moda: str
    dis_grafico: str
    proceso: str
    observaciones: str
    imagen_pattern_base64: str
    output_folder: Optional[str] = ""

class TelaContinuo(BaseModel):
    nombre_tela: str
    composicion: str
    pantones: Optional[List[str]] = []

class ContinuoRequest(BaseModel):
    datos_globales: ContinuoGlobal
    telas_seleccionadas: List[TelaContinuo]

class CubrimientoRequest(BaseModel):
    imagen_base64: str

ALPHA_UMBRAL = 10
DELTA_E_UMBRAL = 23.0
BORDE_FRACCION = 0.05

def redondear_5_superior(pct: float) -> int:
    return int(math.ceil(pct / 5.0) * 5)

def rgb_a_lab(rgb: np.ndarray) -> np.ndarray:
    """Convierte array (..., 3) en RGB [0,255] a CIELAB (D65)."""
    arr = rgb.astype(np.float64) / 255.0
    mascara = arr > 0.04045
    arr = np.where(mascara, ((arr + 0.055) / 1.055) ** 2.4, arr / 12.92)
    matriz = np.array([
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.0721750],
        [0.0193339, 0.1191920, 0.9503041],
    ])
    xyz = arr @ matriz.T
    xyz /= np.array([0.95047, 1.0, 1.08883])
    delta = 6.0 / 29.0
    mascara = xyz > delta ** 3
    f = np.where(mascara, np.cbrt(xyz), xyz / (3 * delta ** 2) + 4.0 / 29.0)
    L = 116.0 * f[..., 1] - 16.0
    a = 500.0 * (f[..., 0] - f[..., 1])
    b = 200.0 * (f[..., 1] - f[..., 2])
    return np.stack([L, a, b], axis=-1)

def marco_bordes(arr: np.ndarray) -> np.ndarray:
    h, w = arr.shape[:2]
    grosor = max(2, int(min(h, w) * BORDE_FRACCION))
    partes = [
        arr[:grosor, :].reshape(-1, arr.shape[2]),
        arr[-grosor:, :].reshape(-1, arr.shape[2]),
        arr[:, :grosor].reshape(-1, arr.shape[2]),
        arr[:, -grosor:].reshape(-1, arr.shape[2]),
    ]
    return np.concatenate(partes, axis=0)

def moda_color(pixeles: np.ndarray) -> np.ndarray:
    valores, conteos = np.unique(pixeles, axis=0, return_counts=True)
    return valores[np.argmax(conteos)]

def calcular_cubrimiento_core(im: PILImage.Image) -> dict:
    max_dim = 1200
    w, h = im.size
    if max(w, h) > max_dim:
        scale = max_dim / max(w, h)
        new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
        im = im.resize((new_w, new_h), PILImage.Resampling.LANCZOS)

    # 1. Detección por canal alfa si existe transparencia
    if im.mode in ("RGBA", "LA", "PA"):
        rgba = im.convert("RGBA")
        alfa = np.array(rgba)[:, :, 3]
        total = alfa.size
        transparentes = int(np.sum(alfa < ALPHA_UMBRAL))
        if transparentes > (total * 0.005):
            tinta = int(np.sum(alfa >= ALPHA_UMBRAL))
            pct = (tinta / total) * 100.0
            pct_rep = redondear_5_superior(pct)
            return {
                "porcentaje_reportado": pct_rep,
                "porcentaje_texto": f"{pct_rep}%",
                "porcentaje_real": round(pct, 2),
                "tiene_transparencia": True,
                "color_fondo_hex": None,
                "modo_origen": im.mode
            }

    # 2. Fondo sólido (RGB, CMYK, etc.)
    rgb = np.array(im.convert("RGB"))
    fondo_rgb = moda_color(marco_bordes(rgb))
    lab = rgb_a_lab(rgb)
    lab_fondo = rgb_a_lab(fondo_rgb.reshape(1, 1, 3)).ravel()
    delta_e = np.sqrt(((lab - lab_fondo) ** 2).sum(axis=-1))
    
    es_fondo = delta_e < DELTA_E_UMBRAL
    total = es_fondo.size
    tinta = int((~es_fondo).sum())
    pct = (tinta / total) * 100.0
    pct_rep = redondear_5_superior(pct)
    fondo_hex = "#{:02x}{:02x}{:02x}".format(int(fondo_rgb[0]), int(fondo_rgb[1]), int(fondo_rgb[2])).upper()

    return {
        "porcentaje_reportado": pct_rep,
        "porcentaje_texto": f"{pct_rep}%",
        "porcentaje_real": round(pct, 2),
        "tiene_transparencia": False,
        "color_fondo_hex": fondo_hex,
        "modo_origen": im.mode
    }


def resolve_template(primary, fallback):
    p = os.path.join(TEMPLATES_DIR, primary)
    if os.path.exists(p):
        return p
    return os.path.join(TEMPLATES_DIR, fallback)

TEMPLATE_LOCALIZADO = resolve_template("FORMATO FICHA LOCALIZADO 2026.xlsm", "Ficha_Desrollo_Estampacion_V01.xlsm")
TEMPLATE_CONTINUA = resolve_template("FORMATO FICHA CONTINUA 2026.xlsm", "Ficha_Continua_V01.xlsm")

CACHED_OPCIONES = None

@app.get("/api/select-folder")
def select_folder():
    """ Opens a native folder selection dialog """
    if not HAS_TKINTER:
        return {"error": "Folder selection is not available on this server environment."}
    try:
        root = tk.Tk()
        root.withdraw()  # Hide the main window
        root.attributes('-topmost', True) # Bring to front
        folder_selected = filedialog.askdirectory()
        root.destroy()
        return {"path": folder_selected}
    except Exception as e:
        return {"error": f"Folder selection not available: {str(e)}"}

@app.get("/api/config")
def get_config():
    is_render = os.environ.get("RENDER") is not None
    return {
        "is_local": not is_render and HAS_TKINTER
    }

@app.get("/api/opciones")
def get_opciones():
    global CACHED_OPCIONES
    if CACHED_OPCIONES is not None:
        return CACHED_OPCIONES
    try:
        if not os.path.exists(TEMPLATE_LOCALIZADO):
            raise HTTPException(status_code=500, detail=f"Template not found at {TEMPLATE_LOCALIZADO}")
            
        wb = openpyxl.load_workbook(TEMPLATE_LOCALIZADO, read_only=True, data_only=True)
        if "DATOS" not in wb.sheetnames:
            wb.close()
            raise HTTPException(status_code=500, detail="Sheet 'DATOS' not found in template")
        
        ws = wb["DATOS"]
        headers = []
        for row in ws.iter_rows(min_row=1, max_row=1, values_only=True):
            headers = list(row)
            break
        if not headers:
            wb.close()
            return {}

        def get_col_index(name):
            try: return headers.index(name)
            except ValueError: return -1

        mapping = {
            "marca": get_col_index("MARCA"),
            "linea": get_col_index("LINEA"),
            "dis_graf": get_col_index("DIS. GRAF"),
            "dis_mod": get_col_index("DIS.MOD"),
            "campana": get_col_index("CAMPAÑA"),
            "anio": get_col_index("AÑO"),
            "proceso": get_col_index("PROCESO"),
            "tipo_logo": get_col_index("TIPO LOGO"),
            "pieza": get_col_index("PIEZA"),
            "foil": get_col_index("FOIL"),
            "material": get_col_index("MATERIAL"),
            "tela_base": 1,        # Column B
            "num_estampado": 8     # Column I
        }

        opciones = {k: set() for k in mapping.keys()}
        empty_count = 0
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not any(row):
                empty_count += 1
                if empty_count > 10: break
                continue
            empty_count = 0
            for key, idx in mapping.items():
                if idx != -1 and idx < len(row) and row[idx] is not None:
                    opciones[key].add(str(row[idx]))

        wb.close()

        # Also merge any additional fabrics from TEMPLATE_CONTINUA into tela_base
        if os.path.exists(TEMPLATE_CONTINUA):
            try:
                wb_c = openpyxl.load_workbook(TEMPLATE_CONTINUA, read_only=True, data_only=True)
                sheet_c = '  ' if '  ' in wb_c.sheetnames else wb_c.sheetnames[0]
                ws_c = wb_c[sheet_c]
                for row in ws_c.iter_rows(min_row=2, values_only=True):
                    if len(row) >= 2 and row[1]:
                        opciones["tela_base"].add(str(row[1]).strip())
                wb_c.close()
            except Exception as e_c:
                print(f"Warning reading extra fabrics from Continua template: {e_c}")

        result = {k: sorted(list(v)) for k, v in opciones.items()}
        CACHED_OPCIONES = result
        gc.collect()
        return result
    except Exception as e:
        print(f"Error reading options: {e}")
        raise HTTPException(status_code=500, detail=str(e))

CACHED_COMPOSITION = None

def get_composition_mapping():
    global CACHED_COMPOSITION
    if CACHED_COMPOSITION is not None:
        return CACHED_COMPOSITION
    try:
        if not os.path.exists(TEMPLATE_CONTINUA):
            return {}
        wb = openpyxl.load_workbook(TEMPLATE_CONTINUA, read_only=True, data_only=True)
        sheet_name = '  '
        if sheet_name not in wb.sheetnames:
            sheet_name = wb.sheetnames[1] if len(wb.sheetnames) > 1 else wb.sheetnames[0]
            
        ws = wb[sheet_name]
        mapping = {}
        for row in ws.iter_rows(min_row=2, values_only=True):
            if len(row) >= 3 and row[1] and row[2]:
                mapping[str(row[1]).strip()] = str(row[2]).strip()
        wb.close()
        CACHED_COMPOSITION = mapping
        gc.collect()
        return mapping
    except Exception as e:
        print(f"Error reading composition mapping: {e}")
        return {}

def save_base64_image(base64_str: str, folder: str, filename: str, max_dim: int = 1200) -> str:
    """ Decodes, downsamples and optimizes base64 image to prevent high RAM spikes """
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    raw_data = base64.b64decode(base64_str)
    filepath = os.path.join(folder, filename)
    
    try:
        with PILImage.open(io.BytesIO(raw_data)) as img:
            w, h = img.size
            if max(w, h) > max_dim:
                scale = max_dim / max(w, h)
                new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
                img = img.resize((new_w, new_h), PILImage.Resampling.LANCZOS)
            
            if img.mode in ("RGBA", "LA", "P"):
                img.save(filepath, format="PNG", optimize=True)
            else:
                if img.mode != "RGB":
                    img = img.convert("RGB")
                img.save(filepath, format="JPEG", quality=85, optimize=True)
    except Exception as e:
        print(f"Image optimization fallback: {e}")
        with open(filepath, "wb") as f:
            f.write(raw_data)
            
    return filepath

def generar_ficha_core(data: FichaData) -> tuple[str, str]:
    ficha_id = str(uuid.uuid4())
    ficha_folder = os.path.join(UPLOADS_DIR, ficha_id)
    os.makedirs(ficha_folder, exist_ok=True)

    try:
        path_ropero = save_base64_image(data.img_ropero_cad, ficha_folder, "ropero.png")
        path_molde = save_base64_image(data.img_pantallazo_molde, ficha_folder, "molde.png")

        wb = openpyxl.load_workbook(TEMPLATE_LOCALIZADO, keep_vba=True)
        ws = wb["FICHA"]

        MAPEO_FICHA = {
            "marca": "B5", "dis_grafico": "D5", "dis_moda": "H5", "campana": "E3",
            "anio": "G3", "linea": "I3", "proceso": "I4", "tipo_logo": "K5",
            "pieza": "B7", "foil": "K7",
            "referencia": "C3", "tela_base": "B6", "num_piezas": "F7",
            "porc_cubrimiento": "I7", "alta_densi": "B8", "fecha_ficha": "K8",
            "ancho_cm": "B21", "alto_cm": "B22", "num_estampados": "B23", 
            "observaciones": "H31"
        }

        from openpyxl.cell.cell import MergedCell
        def write_to_cell(sheet, coord, value):
            cell = sheet[coord]
            if isinstance(cell, MergedCell):
                for m_range in sheet.merged_cells.ranges:
                    if coord in m_range:
                        sheet.cell(row=m_range.min_row, column=m_range.min_col).value = value
                        return
            cell.value = value

        for key, cell in MAPEO_FICHA.items():
            if hasattr(data, key):
                val = getattr(data, key)
                write_to_cell(ws, cell, val)

        def add_image(ws, path, cell, size=(300, 300)):
            img = Image(path)
            with PILImage.open(path) as pil_img:
                width, height = pil_img.size
                ratio = min(size[0]/width, size[1]/height)
                img.width = width * ratio
                img.height = height * ratio
            img.anchor = cell
            ws.add_image(img)

        add_image(ws, path_ropero, "B12", size=(280, 350))
        add_image(ws, path_molde, "H12", size=(550, 450))

        start_row = 30
        for i, color in enumerate(data.colores[:12]):
            row_idx = start_row + i
            write_to_cell(ws, f"A{row_idx}", color.material)
            write_to_cell(ws, f"B{row_idx}", color.pantone)
            write_to_cell(ws, f"C{row_idx}", color.color)

        clean_ref = "".join(x for x in data.referencia if x.isalnum())
        filename = f"{clean_ref}.xlsm" if clean_ref else "Ficha.xlsm"
        out_dir = data.output_folder if data.output_folder and os.path.isdir(data.output_folder) else OUTPUT_DIR
        out_path = os.path.join(out_dir, filename)
        
        os.makedirs(out_dir, exist_ok=True)
        wb.save(out_path)
        wb.close()
        del wb
        del ws

        return out_path, filename
    finally:
        shutil.rmtree(ficha_folder, ignore_errors=True)
        gc.collect()


def generar_continuo_core(req: ContinuoRequest) -> tuple[str, int]:
    data = req.datos_globales
    telas = req.telas_seleccionadas
    MAPEO_CELDAS = {
        "marca": "F1", "campana": "F2", "linea": "F3",
        "dis_moda": "C4", "dis_grafico": "F4",
        "proceso": "C5", "referencia": "D7",
        "observaciones": "A20"
    }
    
    out_root = data.output_folder if data.output_folder and os.path.isdir(data.output_folder) else OUTPUT_DIR
    folder_name = f"Continuo_{data.referencia}"
    folder_path = os.path.join(out_root, folder_name)
    os.makedirs(folder_path, exist_ok=True)
    
    path_pattern = save_base64_image(data.imagen_pattern_base64, folder_path, "pattern_base.png")

    try:
        from openpyxl.cell.cell import MergedCell
        def write_cell(sheet, coord, val):
            cell = sheet[coord]
            if isinstance(cell, MergedCell):
                for m_range in sheet.merged_cells.ranges:
                    if coord in m_range:
                        sheet.cell(row=m_range.min_row, column=m_range.min_col).value = val
                        return
            cell.value = val

        for tela in telas:
            wb = openpyxl.load_workbook(TEMPLATE_CONTINUA, keep_vba=True)
            ws = wb["FICHA"] if "FICHA" in wb.sheetnames else wb.active
            
            for key, cell in MAPEO_CELDAS.items():
                val = getattr(data, key)
                write_cell(ws, cell, val)
            
            write_cell(ws, "H3", tela.nombre_tela)
            
            try:
                img = Image(path_pattern)
                with PILImage.open(path_pattern) as pil_img:
                    w, h = pil_img.size
                    target_w, target_h = 380, 280 
                    ratio = min(target_w/w, target_h/h)
                    img.width = w * ratio
                    img.height = h * ratio
                ws.add_image(img, "B11")
            except Exception as img_e:
                print(f"Error insertando imagen: {img_e}")
            
            if data.proceso == "SUBLIMACION":
                for row in range(11, 21): write_cell(ws, f"H{row}", None)
            else: # ESTAMPACION
                if tela.pantones:
                    for i, p in enumerate(tela.pantones):
                        if i < 10: write_cell(ws, f"H{11+i}", p)
            
            safe_tela = "".join(x for x in tela.nombre_tela if x.isalnum())[:30]
            safe_ref = "".join(x for x in data.referencia if x.isalnum())[:20]
            filename = f"F_{safe_ref}_{safe_tela}.xlsm"
            
            save_path = os.path.join(folder_path, filename)
            wb.save(save_path)
            wb.close()
            del wb
            del ws
            gc.collect()
            
        return folder_path, len(telas)
    finally:
        if os.path.exists(path_pattern):
            os.remove(path_pattern)
        gc.collect()


# BACKGROUND TASK QUEUE AND WORKER
TASKS_DB = {}
task_queue = queue.Queue()

def prune_tasks():
    """ Keeps only the last 20 tasks in memory to prevent RAM accumulation """
    global TASKS_DB
    if len(TASKS_DB) > 20:
        sorted_keys = sorted(TASKS_DB.keys(), key=lambda k: TASKS_DB[k].get("timestamp", ""), reverse=True)
        keys_to_remove = sorted_keys[20:]
        for k in keys_to_remove:
            TASKS_DB.pop(k, None)

def task_worker():
    while True:
        task_id = task_queue.get()
        if task_id is None:
            break
        
        task = TASKS_DB.get(task_id)
        if not task:
            task_queue.task_done()
            continue
        
        task["estado"] = "processing"
        task["inicio"] = datetime.now().isoformat()
        
        try:
            task_data = task.get("data")
            if task["tipo"] == "LOCALIZADO":
                out_path, filename = generar_ficha_core(task_data)
                task["estado"] = "completed"
                task["out_path"] = out_path
                task["filename"] = filename
            elif task["tipo"] == "CONTINUO":
                folder_path, count = generar_continuo_core(task_data)
                zip_path = shutil.make_archive(folder_path, 'zip', folder_path)
                task["estado"] = "completed"
                task["out_path"] = folder_path
                task["zip_path"] = zip_path
                task["zip_filename"] = f"{os.path.basename(folder_path)}.zip"
                task["message"] = f"Generadas {count} fichas."
        except Exception as e:
            traceback.print_exc()
            task["estado"] = "failed"
            task["error"] = str(e)
        finally:
            task["fin"] = datetime.now().isoformat()
            task["data"] = None  # Crucial: Immediately free heavy base64 payload from RAM!
            task_queue.task_done()
            gc.collect()

# Start background thread
worker_thread = threading.Thread(target=task_worker, daemon=True)
worker_thread.start()


# ORIGINAL SYNCHRONOUS ENDPOINTS (UNMODIFIED BEHAVIOR)
@app.post("/api/generar-ficha")
def generar_ficha(data: FichaData):
    try:
        out_path, filename = generar_ficha_core(data)
        return FileResponse(path=out_path, filename=filename, media_type='application/vnd.ms-excel.sheet.macroEnabled.12')
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generar-continuo")
def generar_continuo(req: ContinuoRequest):
    try:
        folder_path, count = generar_continuo_core(req)
        return {"success": True, "message": f"Generadas {count} fichas.", "folder_path": folder_path}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# NEW ASYNCHRONOUS QUEUE ENDPOINTS
@app.post("/api/generar-ficha-async")
def generar_ficha_async(data: FichaData):
    try:
        prune_tasks()
        task_id = str(uuid.uuid4())
        TASKS_DB[task_id] = {
            "id": task_id,
            "tipo": "LOCALIZADO",
            "referencia": data.referencia,
            "estado": "queued",
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        task_queue.put(task_id)
        return {"task_id": task_id, "status": "queued"}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generar-continuo-async")
def generar_continuo_async(req: ContinuoRequest):
    try:
        prune_tasks()
        task_id = str(uuid.uuid4())
        TASKS_DB[task_id] = {
            "id": task_id,
            "tipo": "CONTINUO",
            "referencia": req.datos_globales.referencia,
            "estado": "queued",
            "timestamp": datetime.now().isoformat(),
            "data": req
        }
        task_queue.put(task_id)
        return {"task_id": task_id, "status": "queued"}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tasks")
def get_tasks():
    result = []
    # Sort tasks by creation time descending
    for t_id, t in sorted(TASKS_DB.items(), key=lambda x: x[1]["timestamp"], reverse=True):
        result.append({
            "id": t["id"],
            "tipo": t["tipo"],
            "referencia": t["referencia"],
            "estado": t["estado"],
            "timestamp": t["timestamp"],
            "inicio": t.get("inicio"),
            "fin": t.get("fin"),
            "filename": t.get("filename"),
            "message": t.get("message"),
            "error": t.get("error")
        })
    return result


@app.get("/api/tasks/{task_id}/download")
def download_task_file(task_id: str):
    task = TASKS_DB.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["estado"] != "completed":
        raise HTTPException(status_code=400, detail="Task is not completed yet")
    
    if task["tipo"] == "LOCALIZADO":
        out_path = task.get("out_path")
        filename = task.get("filename", "Ficha.xlsm")
        media_type = 'application/vnd.ms-excel.sheet.macroEnabled.12'
    elif task["tipo"] == "CONTINUO":
        out_path = task.get("zip_path")
        filename = task.get("zip_filename", "Continuo.zip")
        media_type = 'application/zip'
    else:
        raise HTTPException(status_code=400, detail="Invalid task type")
        
    if not out_path or not os.path.exists(out_path):
        raise HTTPException(status_code=404, detail="File not found on server")
        
    return FileResponse(path=out_path, filename=filename, media_type=media_type)


@app.post("/api/calcular-cubrimiento")
def calcular_cubrimiento(req: CubrimientoRequest):
    try:
        raw_b64 = req.imagen_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",")[1]
        img_bytes = base64.b64decode(raw_b64)
        with PILImage.open(io.BytesIO(img_bytes)) as im:
            result = calcular_cubrimiento_core(im)
            return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error calculando cubrimiento: {str(e)}")


# ============================================================================
# LECTURA OPCIONAL DE TECH PACK (.AI / .PDF / .SVG / .JPG / .PNG)
# ============================================================================
import unicodedata
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET


def _normalizar_texto(texto: str) -> str:
    if not texto:
        return ""
    s = unicodedata.normalize("NFD", str(texto))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s).strip().upper()


def match_tela_inteligente(query_raw: str, lista_telas: list) -> tuple[str, list]:
    """
    Recibe un texto corto desde Illustrator (ej. 'OSAKA NEGRO', 'CATALINA NUDE', 'DIANA BLANCO')
    y encuentra la tela correspondiente en la base de datos del Excel
    (ej. 'TELA PTO OSAKA NEGRO 19-4005'), devolviendo (mejor_coincidencia, top_sugerencias).
    """
    if not query_raw or not lista_telas:
        return (query_raw or "", [])

    q_norm = _normalizar_texto(query_raw)
    # Si ya coincide exactamente con alguna opción del Excel
    for t in lista_telas:
        if _normalizar_texto(t) == q_norm:
            return (t, [t])

    stopwords = {"TELA", "PTO", "DE", "LA", "EL", "CON", "PARA", "EN", "BASE"}
    tokens = [tok for tok in re.split(r"[\s/\-,]+", q_norm) if len(tok) >= 2 and tok not in stopwords]
    if not tokens:
        return (query_raw.strip(), [])

    scored = []
    for tela in lista_telas:
        t_norm = _normalizar_texto(tela)
        t_words = [w for w in re.split(r"[\s/\-,]+", t_norm) if w]
        score = 0
        matched_tokens = 0
        for tok in tokens:
            token_hit = False
            for tw in t_words:
                if tok == tw:
                    score += 12
                    token_hit = True
                    break
                elif len(tok) >= 3 and len(tw) >= 3 and (tw.startswith(tok[:4]) or tok.startswith(tw[:4])):
                    score += 8
                    token_hit = True
                    break
                elif len(tok) >= 3 and tok in tw:
                    score += 5
                    token_hit = True
                    break
            if token_hit:
                matched_tokens += 1

        if matched_tokens > 0:
            # Bonus si coincide el primer token (nombre base de la tela, ej. OSAKA, CATALINA, DIANA)
            first_tok = tokens[0]
            if any(first_tok == tw or (len(first_tok) >= 4 and tw.startswith(first_tok[:4])) for tw in t_words):
                score += 25
            # Bonus si coinciden todos los tokens buscados (ej. TELA + COLOR)
            if matched_tokens == len(tokens):
                score += 30
            scored.append((score, tela))

    scored.sort(key=lambda x: (-x[0], x[1]))
    if not scored:
        return (query_raw.strip(), [])

    top_telas = [t for _, t in scored[:6]]
    return (top_telas[0], top_telas)


def match_opcion_excel(raw_val: str, opciones_lista: list, campo: str = "") -> str:
    """
    Empata valores cortos escritos en Illustrator (ej. 'ESTAMPACIÓN', '1', 'GEL', 'SHIMMER')
    con las opciones válidas de la hoja DATOS del Excel.
    """
    if not raw_val:
        return ""
    val_norm = _normalizar_texto(raw_val)
    if not opciones_lista:
        return raw_val.strip()

    # 1. Coincidencia directa normalizada
    for opt in opciones_lista:
        if _normalizar_texto(opt) == val_norm:
            return opt

    # 2. Reglas de alias frecuentes según el campo
    if campo == "proceso":
        for opt in opciones_lista:
            o_norm = _normalizar_texto(opt)
            if "ESTAMP" in val_norm and "ESTAMP" in o_norm:
                return opt
            if "SUBLIM" in val_norm and "SUBLIM" in o_norm:
                return opt

    if campo == "num_estampados":
        if val_norm.isdigit():
            buscado = f"{val_norm} DE {val_norm}"
            for opt in opciones_lista:
                if _normalizar_texto(opt) == buscado:
                    return opt
            for opt in opciones_lista:
                if _normalizar_texto(opt).startswith(f"{val_norm} DE"):
                    return opt

    if campo == "material":
        alias_map = {
            "GEL": "EFEC.GEL",
            "EFECTO GEL": "EFEC.GEL",
            "SHIMMER": "SHIMER",
            "GALAXY": "GALAXI",
            "MIRELLA": "MIRELLA ENCASULADA",
            "VINILO": "VINILO LIV",
            "PUFF": "PUF",
            "ALTA DENSIDAD": "PLASTISOL",
            "BASE AGUA": "TEXTIL",
        }
        for k, target in alias_map.items():
            if k in val_norm:
                for opt in opciones_lista:
                    if target in _normalizar_texto(opt):
                        return opt

    # 3. Coincidencia parcial por prefijo o inclusión
    for opt in opciones_lista:
        o_norm = _normalizar_texto(opt)
        if val_norm in o_norm or o_norm in val_norm:
            return opt

    return raw_val.strip()


def _pil_to_data_url(im: PILImage.Image, max_dim: int = 1200) -> str:
    w, h = im.size
    if max(w, h) > max_dim:
        scale = max_dim / max(w, h)
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), PILImage.Resampling.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"


def _recortar_zonas_techpack(page_img: PILImage.Image) -> dict:
    """
    Dada la imagen completa de la hoja Carta (proporción 612 x 792 pt),
    recorta automáticamente:
      - ZONA_ROPERO_CAD (x=32..320, y=136..342)
      - ZONA_PANTALLAZO_MOLDE (x=32..320, y=396..656)
      - ZONA_ARTE_AISLADO (x=378..534, y=156..324) -> calcula % cubrimiento
    """
    W_ref, H_ref = 612.0, 792.0
    w, h = page_img.size

    def crop_box(x1, y1, x2, y2):
        return page_img.crop((
            int(round(x1 / W_ref * w)),
            int(round(y1 / H_ref * h)),
            int(round(x2 / W_ref * w)),
            int(round(y2 / H_ref * h)),
        ))

    crop_ropero = crop_box(32, 136, 320, 342)
    crop_molde  = crop_box(32, 396, 320, 656)
    crop_arte   = crop_box(378, 156, 534, 324)

    cub_info = None
    try:
        cub_info = calcular_cubrimiento_core(crop_arte)
    except Exception as e:
        print(f"Warning calculando cubrimiento desde ZONA_ARTE_AISLADO: {e}")

    return {
        "img_ropero_cad": _pil_to_data_url(crop_ropero),
        "img_pantallazo_molde": _pil_to_data_url(crop_molde),
        "cubrimiento_arte_info": cub_info
    }


def _extraer_campos_desde_words(words: list) -> dict:
    def text_in_box(xmin, ymin, xmax, ymax, exclude_prefixes=()):
        in_box = [
            w for w in words
            if xmin <= w["cx"] <= xmax and ymin <= w["cy"] <= ymax
        ]
        # Ordenar por línea (y1 redondeado a 4 pt) y luego por x1
        in_box.sort(key=lambda w: (round(w["y1"] / 4.0), w["x1"]))
        joined = " ".join(w["text"] for w in in_box).strip()
        for pref in exclude_prefixes:
            pattern = r"^" + re.escape(pref) + r"\s*:?\s*"
            joined = re.sub(pattern, "", joined, flags=re.IGNORECASE).strip()
        return joined

    campos = {
        "referencia":       text_in_box(226, 20, 360, 44, ("REFERENCIA:", "REFERENCIA")),
        "proceso":          text_in_box(360, 20, 488, 44, ("PROCESO:", "PROCESO")),
        "pieza":            text_in_box(488, 20, 595, 44, ("PIEZA:", "PIEZA")),
        "tela_base":        text_in_box(226, 44, 360, 66, ("TELA BASE:", "TELA BASE")),
        "tipo_logo":        text_in_box(360, 44, 488, 66, ("TIPO LOGO:", "TIPO LOGO")),
        "num_piezas":       text_in_box(488, 44, 595, 66, ("# PIEZAS:", "# PIEZAS", "PIEZAS:")),
        "num_estampados":   text_in_box(226, 66, 360, 92, ("# ESTAMPADOS:", "# ESTAMPADOS", "ESTAMPADOS:")),
        "foil":             text_in_box(360, 66, 488, 92, ("FOIL:", "FOIL")),
        "alta_densi":       text_in_box(488, 66, 595, 92, ("ALTA DENSI.:", "ALTA DENSI:", "ALTA DENSIDAD:")),
        "ancho_cm":         text_in_box(360, 400, 429.3, 434, ("ANCHO (CM):", "ANCHO (CM)", "ANCHO:")),
        "alto_cm":          text_in_box(429.3, 400, 498.6, 434, ("% ALTO (CM):", "ALTO (CM):", "ALTO (CM)", "ALTO:")),
        "porc_cubrimiento": text_in_box(498.6, 400, 568, 434, ("% CUBRIMIENTO:", "CUBRIMIENTO:")),
    }

    # Observaciones (Bloque 4: x=340..588, y=496..664) agrupadas por renglón
    obs_words = [w for w in words if 340 <= w["cx"] <= 588 and 496 <= w["cy"] <= 664]
    obs_words.sort(key=lambda w: (round(w["y1"] / 5.0), w["x1"]))
    lines = []
    cur_line = []
    last_y = None
    for w in obs_words:
        if last_y is None or abs(w["y1"] - last_y) <= 5.5:
            cur_line.append(w["text"])
            if last_y is None:
                last_y = w["y1"]
        else:
            lines.append(" ".join(cur_line))
            cur_line = [w["text"]]
            last_y = w["y1"]
    if cur_line:
        lines.append(" ".join(cur_line))
    campos["observaciones"] = "\n".join(lines).strip()

    # 5 Tarjetas de Color en el Bloque 5 (y=705..775)
    colores_extraidos = []
    for i in range(5):
        cx_min = 34 + i * 110
        cx_max = cx_min + 108
        mat = text_in_box(cx_min + 36, 718, cx_max, 736, ("MATERIAL:", "MAT:"))
        pms = text_in_box(cx_min + 36, 736, cx_max, 751, ("PANTONE:", "PMS:"))
        nom = text_in_box(cx_min + 36, 750, cx_max, 768, ("COLOR:", "COL:"))
        if any(x and x not in ("-", "(VACÍO)", "VACIO") for x in (mat, pms, nom)):
            colores_extraidos.append({
                "material": mat,
                "pantone": pms,
                "color": nom
            })
    campos["colores"] = colores_extraidos
    return campos


def _extraer_textos_pdftotext(filepath: str) -> dict:
    """
    Usa pdftotext -bbox-layout para extraer cada palabra con sus coordenadas
    en la hoja Carta (612 x 792 pt) desde archivos .ai (PDF compatible) o .pdf.
    """
    pdftotext_candidates = ["/usr/local/bin/pdftotext", "/opt/homebrew/bin/pdftotext", "pdftotext"]
    cmd_bin = None
    for c in pdftotext_candidates:
        if os.path.exists(c) or shutil.which(c):
            cmd_bin = c
            break
    if not cmd_bin:
        return {}

    res = subprocess.run([cmd_bin, "-bbox-layout", filepath, "-"], capture_output=True, text=True, timeout=15)
    if res.returncode != 0 or not res.stdout:
        return {}

    xml_str = res.stdout
    page_m = re.search(r'<page\s+width="([\d\.]+)"\s+height="([\d\.]+)"', xml_str)
    pw = float(page_m.group(1)) if page_m else 612.0
    ph = float(page_m.group(2)) if page_m else 792.0

    words = []
    for m in re.finditer(r'<word\s+xMin="([\d\.]+)"\s+yMin="([\d\.]+)"\s+xMax="([\d\.]+)"\s+yMax="([\d\.]+)">(.*?)</word>', xml_str):
        x1 = float(m.group(1)) * 612.0 / pw
        y1 = float(m.group(2)) * 792.0 / ph
        x2 = float(m.group(3)) * 612.0 / pw
        y2 = float(m.group(4)) * 792.0 / ph
        txt = m.group(5).replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").strip()
        if txt:
            words.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2, "cx": (x1 + x2) / 2.0, "cy": (y1 + y2) / 2.0, "text": txt})

    return _extraer_campos_desde_words(words)


def _extraer_textos_vision_ocr(filepath: str) -> dict:
    """
    Usa el binario nativo vision_ocr (macOS Vision Framework) para extraer textos
    y coordenadas desde una imagen .jpg / .png del Tech Pack.
    """
    import json
    ocr_bin = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vision_ocr")
    if not os.path.exists(ocr_bin):
        return {}
    try:
        res = subprocess.run([ocr_bin, filepath], capture_output=True, text=True, timeout=15)
        if res.returncode == 0 and res.stdout:
            words = json.loads(res.stdout)
            if isinstance(words, list) and words:
                return _extraer_campos_desde_words(words)
    except Exception as e:
        print(f"Warning en OCR Vision para imagen: {e}")
    return {}


@app.post("/api/leer-techpack")
async def leer_techpack(file: UploadFile = File(...)):
    """
    Endpoint opcional para leer una ficha técnica en formato .ai, .pdf, .svg, .jpg o .png
    y devolver los campos técnicos autocompletados y empatados con el Excel.
    """
    filename = (file.filename or "").lower()
    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="El archivo subido está vacío.")

    opciones = get_opciones()
    tmp_dir = tempfile.mkdtemp(prefix="techpack_")
    ext = os.path.splitext(filename)[1] or ".pdf"
    tmp_path = os.path.join(tmp_dir, f"upload{ext}")

    try:
        with open(tmp_path, "wb") as f:
            f.write(raw_bytes)

        campos_raw = {}
        visuales = {}

        # Caso 1: Archivo .ai o .pdf (Illustrator guarda encabezado %PDF)
        is_pdf_header = raw_bytes[:1024].find(b"%PDF-") != -1
        if ext in (".ai", ".pdf") or is_pdf_header:
            campos_raw = _extraer_textos_pdftotext(tmp_path)
            # Renderizar página 1 para recortar Ropero CAD, Molde y Arte Aislado
            try:
                from pdf2image import convert_from_path
                # Asegurar que poppler en /usr/local/bin o /opt/homebrew/bin esté disponible
                poppler_dir = "/usr/local/bin" if os.path.exists("/usr/local/bin/pdftoppm") else (
                    "/opt/homebrew/bin" if os.path.exists("/opt/homebrew/bin/pdftoppm") else None
                )
                pages = convert_from_path(tmp_path, dpi=180, first_page=1, last_page=1, poppler_path=poppler_dir)
                if pages:
                    visuales = _recortar_zonas_techpack(pages[0])
            except Exception as e_img:
                print(f"Warning renderizando imagen desde PDF/AI: {e_img}")

        # Caso 2: Archivo .svg
        elif ext == ".svg":
            root = ET.fromstring(raw_bytes.decode("utf-8", errors="ignore"))
            id_map = {el.attrib.get("id"): "".join(el.itertext()).strip() for el in root.iter() if el.attrib.get("id")}
            campos_raw = {
                "referencia":       id_map.get("CAMPO_REFERENCIA", ""),
                "proceso":          id_map.get("CAMPO_PROCESO", ""),
                "pieza":            id_map.get("CAMPO_PIEZA", ""),
                "tela_base":        id_map.get("CAMPO_TELA_BASE", ""),
                "tipo_logo":        id_map.get("CAMPO_TIPO_LOGO", ""),
                "num_piezas":       id_map.get("CAMPO_NUM_PIEZAS", ""),
                "num_estampados":   id_map.get("CAMPO_NUM_ESTAMPADOS", ""),
                "foil":             id_map.get("CAMPO_FOIL", ""),
                "alta_densi":       id_map.get("CAMPO_ALTA_DENSI", ""),
                "ancho_cm":         id_map.get("CAMPO_ANCHO_CM", ""),
                "alto_cm":          id_map.get("CAMPO_ALTO_CM", ""),
                "porc_cubrimiento": id_map.get("CAMPO_PORC_CUBRIMIENTO", ""),
                "observaciones":    id_map.get("CAMPO_OBSERVACIONES", ""),
                "colores": []
            }
            for i in range(1, 6):
                mat = id_map.get(f"COLOR_{i}_MAT", "")
                pms = id_map.get(f"COLOR_{i}_PMS", "")
                nom = id_map.get(f"COLOR_{i}_NOM", "")
                if any([mat, pms, nom]):
                    campos_raw["colores"].append({"material": mat, "pantone": pms, "color": nom})

        # Caso 3: Imagen raster (.jpg, .jpeg, .png)
        else:
            campos_raw = _extraer_textos_vision_ocr(tmp_path)
            with PILImage.open(io.BytesIO(raw_bytes)) as im_page:
                visuales = _recortar_zonas_techpack(im_page)

        # Empatar campos con las listas del Excel (búsqueda inteligente)
        tela_raw = campos_raw.get("tela_base", "")
        mejor_tela, sugerencias_tela = match_tela_inteligente(tela_raw, opciones.get("tela_base", []))

        colores_final = []
        for c in campos_raw.get("colores", []):
            colores_final.append({
                "material": match_opcion_excel(c.get("material", ""), opciones.get("material", []), "material"),
                "pantone": c.get("pantone", ""),
                "color": c.get("color", "")
            })

        porc_cub = campos_raw.get("porc_cubrimiento", "")
        cub_info = visuales.get("cubrimiento_arte_info")
        if not porc_cub and cub_info and cub_info.get("porcentaje_texto"):
            porc_cub = cub_info["porcentaje_texto"]

        resultado = {
            "campos": {
                "referencia":       campos_raw.get("referencia", ""),
                "proceso":          match_opcion_excel(campos_raw.get("proceso", ""), opciones.get("proceso", []), "proceso"),
                "pieza":            match_opcion_excel(campos_raw.get("pieza", ""), opciones.get("pieza", []), "pieza"),
                "tela_base":        mejor_tela,
                "tela_original":    tela_raw,
                "sugerencias_tela": sugerencias_tela,
                "tipo_logo":        match_opcion_excel(campos_raw.get("tipo_logo", ""), opciones.get("tipo_logo", []), "tipo_logo"),
                "num_piezas":       campos_raw.get("num_piezas", ""),
                "num_estampados":   match_opcion_excel(campos_raw.get("num_estampados", ""), opciones.get("num_estampado", []), "num_estampados"),
                "foil":             match_opcion_excel(campos_raw.get("foil", ""), opciones.get("foil", []), "foil"),
                "alta_densi":       campos_raw.get("alta_densi", ""),
                "ancho_cm":         campos_raw.get("ancho_cm", ""),
                "alto_cm":          campos_raw.get("alto_cm", ""),
                "porc_cubrimiento": porc_cub,
                "observaciones":    campos_raw.get("observaciones", ""),
            },
            "colores": colores_final,
            "images": {
                "img_ropero_cad": visuales.get("img_ropero_cad"),
                "img_pantallazo_molde": visuales.get("img_pantallazo_molde")
            },
            "cubrimiento_info": cub_info
        }
        return resultado
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"No se pudo procesar el Tech Pack: {str(e)}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)



DIST_PATH = os.path.join(os.path.abspath("."), "frontend_dist")
if not os.path.exists(DIST_PATH):
    DIST_PATH = get_resource_path("dist")
if not os.path.exists(DIST_PATH):
    DIST_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend_dist")

if os.path.exists(DIST_PATH):
    app.mount("/", StaticFiles(directory=DIST_PATH, html=True), name="static")
else:
    print(f"Warning: Static frontend directory not found. Checked: {DIST_PATH}")

if __name__ == "__main__":
    import uvicorn
    # Use RENDER port or default to 8000
    port = int(os.environ.get("PORT", 8000))
    # Bind to 0.0.0.0 to allow external routing in cloud environments
    uvicorn.run(app, host="0.0.0.0", port=port)
