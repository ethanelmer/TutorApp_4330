To Start VENV:
.\.venv\Scripts\Activate.ps1

If `.venv` is missing, create it and install deps:
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r BackEnd/requirements.txt
python -m pip install python-multipart

Required environment variables (set in shell or BackEnd/.env):
$Env:CHROMA_API_KEY = "<your_chroma_api_key>" # Optionally: $Env:AZURE_OPENAI_KEY, $Env:OPENAI_API_KEY

To Start Backend Server:
python -m uvicorn BackEnd.main:app --reload

To Start Frontend:
cd FrontEnd; npm start
