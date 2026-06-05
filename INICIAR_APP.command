#!/bin/bash
# Lanzador para StudioFabric Pro - AG LAB
# Autor: Antigravity AI

# Obtener la ruta del script
BASEDIR=$(dirname "$0")
cd "$BASEDIR"

echo "--------------------------------------------------"
echo "🚀 INICIANDO ESTUDIO CREATIVO AG LAB..."
echo "--------------------------------------------------"

# 1. Iniciar Backend en segundo plano
echo "📦 Arrancando Servidor de Datos..."
cd "backend"
python3 main.py &
BACKEND_PID=$!
cd ..

# 2. Iniciar Frontend
echo "🎨 Preparando Interfaz Creativa..."
cd "frontend"
# Abrir el navegador después de 3 segundos
(sleep 3 && open http://localhost:5173) &
npm run dev

# Al cerrar, matar el proceso del backend
kill $BACKEND_PID
