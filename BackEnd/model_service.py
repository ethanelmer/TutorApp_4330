import sys
from pathlib import Path
import os

# Add the project root directory to Python path
project_root = str(Path(__file__).parents[1])  # Go up two levels from model_service.py
if project_root not in sys.path:
    sys.path.append(project_root)

import os
import sys
from pathlib import Path

# Get the absolute path to ModelCall.py
current_dir = Path(__file__).parent  # BackEnd directory
project_root = current_dir.parent    # Root directory
model_call_path = project_root / 'AICalls' / 'modelCall.py'

# Import the function directly from ModelCall.py
import importlib.util
spec = importlib.util.spec_from_file_location("ModelCall", model_call_path)
ModelCall = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ModelCall)

get_model_response = ModelCall.get_model_response
from typing import List

def get_ai_response(prompt: str, chunks: List[str]) -> str:
    """
    Get a response from the AI model using the provided prompt and context chunks.
    """
    try:
        response = get_model_response(prompt, chunks)
        return response
    except Exception as e:
        # Log the error and return a user-friendly message
        print(f"Error getting model response: {str(e)}")
        return "I apologize, but I encountered an error while processing your request. Please try again."