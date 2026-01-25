#!/bin/bash

# Setup script for OpenCowork development environment

set -e

echo "🚀 Setting up OpenCowork development environment..."

# Check Python version
python_version=$(python3 --version | cut -d' ' -f2)
echo "✓ Python version: $python_version"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install Poetry
echo "📚 Installing Poetry..."
curl -sSL https://install.python-poetry.org | python3 -

# Add Poetry to PATH
export PATH="$HOME/.local/bin:$PATH"

# Install dependencies
echo "📥 Installing dependencies..."
poetry install

# Setup pre-commit hooks
echo "🔍 Setting up pre-commit hooks..."
poetry run pre-commit install

# Run tests to verify setup
echo "🧪 Running tests..."
poetry run pytest tests/ -v --tb=short

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Activate environment: source venv/bin/activate"
echo "  2. Run CLI: poetry run opencowork task 'your goal'"
echo "  3. Start API: poetry run python -m opencowork.api"
echo ""
