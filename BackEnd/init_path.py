import os
import sys

def init_project_path():
    """Add the project root directory to Python path."""
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

init_project_path()