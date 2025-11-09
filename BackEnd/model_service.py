import sys
import os
from pathlib import Path
from typing import List
import importlib.util
import traceback

# Ensure project root is on sys.path (useful for relative imports in some setups)
project_root = str(Path(__file__).parents[1])
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Resolve path to the modelCall file (case-sensitive on some systems)
current_dir = Path(__file__).parent
model_call_path = current_dir.parent / 'AICalls' / 'modelCall.py'

if not model_call_path.exists():
    # Try alternative filename case (ModelCall.py)
    alt = current_dir.parent / 'AICalls' / 'ModelCall.py'
    if alt.exists():
        model_call_path = alt

if not model_call_path.exists():
    raise FileNotFoundError(f"Could not find modelCall.py in {current_dir.parent / 'AICalls'}")

# Dynamically load module from file so imports work regardless of PYTHONPATH
spec = importlib.util.spec_from_file_location("ModelCall", str(model_call_path))
ModelCall = importlib.util.module_from_spec(spec)
try:
    spec.loader.exec_module(ModelCall)
except Exception:
    print("Failed to import ModelCall module:")
    traceback.print_exc()
    raise

if not hasattr(ModelCall, 'get_model_response'):
    raise AttributeError(f"Module {model_call_path} does not define get_model_response(prompt, chunks)")

get_model_response = ModelCall.get_model_response


def get_ai_response(prompt: str, chunks: List[str]) -> str:
    """Get a response from the AI model using the provided prompt and context chunks.

    In development, set environment variable DEBUG=true to include the exception traceback
    text in the returned message. In production the message is kept generic to avoid
    leaking sensitive info.
    """
    try:
        response = get_model_response(prompt, chunks)
        return response
    except Exception as e:
        # Print full traceback to server logs for debugging
        print("Error getting model response:")
        traceback.print_exc()

        # Return a more helpful message when DEBUG=true
        debug = os.getenv('DEBUG', 'false').lower() in ('1', 'true', 'yes')
        if debug:
            tb = traceback.format_exc()
            return f"Error while processing request: {str(e)}\n\nTraceback:\n{tb}"

        return "I apologize, but I encountered an error while processing your request. Please try again."