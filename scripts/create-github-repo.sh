#!/bin/bash

# Script para crear el repositorio en GitHub después de autenticación

echo "🚀 Creando repositorio en GitHub..."

# Crear el repositorio
gh repo create kit-ia-emprendedor-extension \
  --private \
  --description "Chrome Extension lite para gestionar GPTs oficiales del Kit IA Emprendedor" \
  --disable-wiki \
  --disable-issues=false

# Verificar si se creó exitosamente
if [ $? -eq 0 ]; then
    echo "✅ Repositorio creado exitosamente"
    
    # Configurar remote origin
    echo "🔗 Configurando remote origin..."
    git remote add origin https://github.com/carlosrodera/kit-ia-emprendedor-extension.git
    
    # Verificar remote
    echo "📍 Verificando configuración del remote..."
    git remote -v
    
    # Push inicial
    echo "📤 Haciendo push inicial..."
    git push -u origin main
    
    echo "✅ ¡Todo listo! El repositorio está configurado y sincronizado."
else
    echo "❌ Error al crear el repositorio. Verifica tu autenticación con 'gh auth login'"
fi