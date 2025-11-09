import os
import sys
from pathlib import Path

def init_python_path():
    """Add the project root directory to Python path to enable imports"""
    project_root = Path(__file__).parents[1]  # Go up two levels to project root
    if str(project_root) not in sys.path:
        sys.path.append(str(project_root))