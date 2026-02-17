#!/bin/bash

# Define directories
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASTRO_DIR="$BASE_DIR/astro"
ELECTRON_DIR="$BASE_DIR/electron"
TEMP_DIR="/tmp/omit-sync-docs"

echo "[$PROJECT_NAME] Starting documentation sync..."

# Ensure external directories exist and are clean
if [ -d "$ASTRO_DIR" ]; then
    echo "[$PROJECT_NAME] Cleaning existing Astro docs..."
    rm -rf "$ASTRO_DIR"/*
else
    mkdir -p "$ASTRO_DIR"
fi
touch "$ASTRO_DIR/.gitkeep"

if [ -d "$ELECTRON_DIR" ]; then
    echo "[$PROJECT_NAME] Cleaning existing Electron docs..."
    rm -rf "$ELECTRON_DIR"/*
else
    mkdir -p "$ELECTRON_DIR"
fi
touch "$ELECTRON_DIR/.gitkeep"
mkdir -p "$TEMP_DIR"

# --- Astro Docs ---
echo "[$PROJECT_NAME] Syncing Astro docs..."
if [ -d "$TEMP_DIR/astro-docs" ]; then
    rm -rf "$TEMP_DIR/astro-docs"
fi

echo "Cloning Astro docs (sparse checkout)..."
mkdir -p "$TEMP_DIR/astro-docs"
pushd "$TEMP_DIR/astro-docs" > /dev/null
git init
git remote add origin https://github.com/withastro/docs
git config core.sparseCheckout true
echo "src/content/docs/en/" >> .git/info/sparse-checkout
git pull --depth 1 origin main
popd > /dev/null

if [ -d "$TEMP_DIR/astro-docs/src/content/docs/en" ]; then
    echo "Copying Astro English docs to $ASTRO_DIR..."
    # Copy contents of 'en' directly to 'docs/external/astro/'
    cp -r "$TEMP_DIR/astro-docs/src/content/docs/en/"* "$ASTRO_DIR/"
    echo "[$PROJECT_NAME] Astro docs synced successfully."
else
    echo "[$PROJECT_NAME] Error: Astro English docs content not found."
fi

# --- Electron Docs ---
echo "[$PROJECT_NAME] Syncing Electron docs..."
if [ -d "$TEMP_DIR/electron" ]; then
    rm -rf "$TEMP_DIR/electron"
fi

echo "Cloning Electron docs (sparse checkout)..."
mkdir -p "$TEMP_DIR/electron"
pushd "$TEMP_DIR/electron" > /dev/null
git init
git remote add origin https://github.com/electron/electron
git config core.sparseCheckout true
echo "docs/" >> .git/info/sparse-checkout
git pull --depth 1 origin main
popd > /dev/null

if [ -d "$TEMP_DIR/electron/docs" ]; then
    echo "Copying Electron docs to $ELECTRON_DIR..."
    cp -r "$TEMP_DIR/electron/docs/"* "$ELECTRON_DIR/"
    echo "[$PROJECT_NAME] Electron docs synced successfully."
else
    echo "[$PROJECT_NAME] Error: Electron docs content not found."
fi

# Cleanup
echo "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo "[$PROJECT_NAME] Documentation sync completed."
