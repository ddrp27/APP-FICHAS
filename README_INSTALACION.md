# Guía de Empaquetado e Instalación - App Fichas Estampación

Este documento detalla los pasos para convertir la aplicación en un ejecutable portable para **Windows (.exe)** y **Mac (.app)**.

## 1. Requisitos Previos
Asegúrate de tener instalado:
- Python 3.9 o superior.
- Node.js y npm (para el frontend).
- PyInstaller: `pip install pyinstaller`.
- Dependencias de Python: `pip install -r backend/requirements.txt`.

## 2. Preparación del Frontend
Antes de empaquetar, debemos generar el build de React:

```bash
cd frontend
npm install
npm run build
cd ..
```
*Esto generará una carpeta `dist/` en la raíz del proyecto.*

## 3. Empaquetado con PyInstaller

### Para Windows (Generar .exe)
Ejecuta el siguiente comando en la terminal (PowerShell o CMD):

```powershell
pyinstaller AppEstampacion.spec --noconfirm
```

### Para Mac (Generar .app)
Ejecuta el siguiente comando en la terminal:

```bash
pyinstaller AppEstampacion.spec --noconfirm
```

### ¿Por qué --onedir? (Recomendado)
Hemos configurado el build como `--onedir` (carpeta `dist/AppEstampacion`).
- **Ventaja**: El inicio es mucho más rápido ya que no tiene que descomprimir archivos temporales.
- **Portabilidad**: Solo debes copiar la carpeta completa `AppEstampacion` resultante de la carpeta `dist`.

## 4. Estructura de la Aplicación Portable
Una vez generado, tu carpeta de aplicación debería verse así:

```text
/AppEstampacion (Carpeta Principal)
├── AppEstampacion.exe (o .app en Mac)
├── templates/          <-- Carpeta para Excels
│   ├── Ficha_Desrollo_Estampacion_V01.xlsm
│   └── Ficha_Continua_V01.xlsm
├── output/             <-- Donde se guardan los archivos por defecto
├── _internal/          <-- Archivos del sistema (no tocar)
```

## 5. Cómo Actualizar las Plantillas
Si necesitas cambiar el formato de los Excel:
1. **NO** necesitas recompilar el programa.
2. Simplemente abre la carpeta `templates/` junto al ejecutable.
3. Reemplaza los archivos `.xlsm` manteniendo exactamente el mismo nombre.
4. Reinicia la aplicación.

## 6. Ejecución
- **Windows**: Doble clic en `AppEstampacion.exe`.
- **Mac**: Doble clic en `AppEstampacion.app`.
- La aplicación abrirá una terminal (servidor) y podrás acceder desde el navegador en `http://127.0.0.1:8000`.
*Nota: Si prefieres que no se vea la terminal, cambia `console=True` a `False` en el archivo .spec y vuelve a empaquetar.*

---
**Ingeniería de DevOps - Automatización Textil**
