#!/bin/bash

# Build script for OpenCowork

set -e

echo "🔨 Building OpenCowork..."

# Build Python package
echo "📦 Building Python package..."
poetry build

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t opencowork:latest .

echo "✅ Build complete!"
echo ""
echo "Docker image: opencowork:latest"
echo "Python package: dist/"
