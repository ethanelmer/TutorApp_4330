import os
from dotenv import load_dotenv
import chromadb

# Load environment variables (safe to call multiple times)
load_dotenv()

_client = None

def get_chroma_client():
    """Lazily create and return a Chroma CloudClient using environment variables.

    Required environment variables:
      - CHROMA_API_KEY
    Optional:
      - CHROMA_TENANT
      - CHROMA_DATABASE (defaults to 'TutorDatabase')
    """
    global _client
    if _client is not None:
        return _client

    api_key = os.getenv("CHROMA_API_KEY")
    # Backwards-compat/fallback: some users may have put the key under AZURE_OPENAI_KEY
    # (or pasted the Chroma key into a different env var). Try that as a fallback.
    if not api_key:
        api_key = os.getenv("AZURE_OPENAI_KEY")
    tenant = os.getenv("CHROMA_TENANT")
    database = os.getenv("CHROMA_DATABASE", "TutorDatabase")

    if not api_key:
        raise RuntimeError("CHROMA_API_KEY (or AZURE_OPENAI_KEY) is not set. Add it to your BackEnd/.env or environment variables.")

    # strip surrounding single/double quotes if the value was added with quotes in the .env file
    if (api_key.startswith("'") and api_key.endswith("'")) or (api_key.startswith('"') and api_key.endswith('"')):
        api_key = api_key[1:-1]

    try:
        _client = chromadb.CloudClient(
            api_key=api_key,
            tenant=tenant,
            database=database
        )
        return _client
    except Exception as e:
        # Wrap and raise a clearer error for debugging at startup
        raise RuntimeError(f"Failed to create Chroma CloudClient: {e}")

def _reset_client_for_tests():
    """Internal helper to reset the client (useful for tests)."""
    global _client
    _client = None