"""Conftest for tests."""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Import fixtures from fixtures module
pytest_plugins = ["tests.fixtures.conftest"]
