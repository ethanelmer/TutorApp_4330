# TutorApp - AI-Powered Study Assistant

An intelligent tutoring application with RAG (Retrieval-Augmented Generation), persistent chat memory, and quiz generation capabilities.

## Features

✅ **Document Upload** - Upload study materials (.txt, .md, .pdf)
✅ **RAG-based Q&A** - Ask questions about your documents with AI-powered answers
✅ **Chat Memory** - Persistent conversation history across sessions
✅ **Multiple Threads** - Create and manage separate conversations
✅ **Context-Aware AI** - AI remembers previous messages in each thread
✅ **Quiz Generation** - Auto-generate study quizzes from your materials
✅ **Cloud Storage** - Documents and chats stored in Chroma cloud database

---

## Architecture

- **Frontend**: React.js with modern UI/UX
- **Backend**: FastAPI (Python)
- **AI Model**: HuggingFace Router API (moonshotai/Kimi-K2-Thinking)
- **Vector Database**: ChromaDB Cloud
- **Document Processing**: PyPDF2 for PDF extraction

---

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- Chroma Cloud account (free tier available)
- HuggingFace API token

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd TutorApp_4330
```

### 2. Backend Setup

```bash
cd BackEnd

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOL
# HuggingFace API Token
HF_TOKEN=your_huggingface_token_here

# Chroma Cloud Configuration
CHROMA_API_KEY=your_chroma_api_key_here
CHROMA_TENANT=your_tenant_id
CHROMA_DATABASE=TutorDatabase

# Optional Configuration
CHUNK_SIZE_CHARS=800
MAX_CHUNKS_PER_FILE=200
CHROMA_MAX_RECORDS=300
DEBUG=false
EOL

# Start backend
python main.py
```

Backend will run on `http://127.0.0.1:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start frontend
npm start
```

Frontend will run on `http://localhost:3000`

### 4. Frontend Unit Tests

```bash
cd frontend
npm test
```

The Jest suite covers:
- **Chat** – greeting render, thread creation, happy/error message flow.
- **Header** – menu toggle wiring and option callbacks.
- **Quiz** – parsed questions, answer toggles, and retry path.

---

## Project Structure

```
TutorApp_4330/
├── BackEnd/
│   ├── main.py                 # FastAPI app & endpoints
│   ├── chat_memory.py          # Chat memory manager (NEW)
│   ├── chromaConnection.py     # Chroma client singleton
│   ├── model_service.py        # AI model interface
│   ├── requirements.txt        # Python dependencies (NEW)
│   └── .env                    # Environment variables
├── AICalls/
│   └── modelCall.py            # HuggingFace API integration
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.js         # Main chat component
│   │   │   ├── Chat.css        # Chat styling
│   │   │   ├── Quiz.js         # Quiz mode component
│   │   │   ├── Quiz.css        # Quiz styling
│   │   │   ├── Header.js       # Navigation header
│   │   │   └── FileUpload.css  # Upload styling
│   │   ├── App.js              # Root component
│   │   └── index.css           # Global styles
│   └── package.json            # Node dependencies
├── README.md                   # This file
└── CHAT_MEMORY_IMPLEMENTATION.md  # Implementation details
```
