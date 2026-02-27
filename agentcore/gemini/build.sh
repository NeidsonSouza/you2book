#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/src"
DIST_DIR="$SCRIPT_DIR/dist"
WORK_DIR="$DIST_DIR/package_work"

# Clean previous build
rm -rf "$DIST_DIR"
mkdir -p "$WORK_DIR"

# Install dependencies for ARM64 Lambda
pip install \
  --platform manylinux2014_aarch64 \
  --implementation cp \
  --python-version 3.12 \
  --only-binary=:all: \
  --target="$WORK_DIR" \
  -r "$SRC_DIR/requirements.txt"

# Copy all Python source files
cp "$SRC_DIR"/*.py "$WORK_DIR/"

# Set permissions
find "$WORK_DIR" -type d -exec chmod 755 {} \;
find "$WORK_DIR" -type f -exec chmod 644 {} \;

# Create zip
cd "$WORK_DIR"
zip -r "$DIST_DIR/deployment_package.zip" .

# Cleanup work directory
rm -rf "$WORK_DIR"

echo "Build complete: $DIST_DIR/deployment_package.zip"
