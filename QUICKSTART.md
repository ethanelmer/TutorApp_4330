# TutorApp - Quick Start Guide

## 🚀 Setup (5 minutes)

### 1. Install Backend Dependencies
```bash
cd BackEnd
pip install -r requirements.txt
```

### 2. Configure Environment
Create `BackEnd/.env`:
```env
HF_TOKEN=your_huggingface_token
CHROMA_API_KEY=your_chroma_key
CHROMA_TENANT=your_tenant_id
CHROMA_DATABASE=TutorDatabase
```

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 4. (Optional) Run Frontend Unit Tests
```bash
cd frontend
npm test
```
Tests focus on:
- Chat basics – greeting, chat thread creation, successful/error replies.
- Header menu – toggle + option callbacks.
- Quiz mode – question rendering, answer reveal, retry flow.

---

## ▶️ Run Application

### Terminal 1 - Backend
```bash
cd BackEnd
python main.py
```
Should see: `Uvicorn running on http://127.0.0.1:8000`

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```
Should open browser at `http://localhost:3000`

---

## ✅ Verify Setup

### Test Backend
```bash
curl http://127.0.0.1:8000/api/health
```
Should return: `{"status":"ok","collection_initialized":true,...}`

### Test Frontend
1. Open `http://localhost:3000`
2. Should see chat interface
3. Should see "+ New Chat" button in sidebar

---

## 📝 Basic Usage

### Upload a Document
1. Click "Choose File" at bottom
2. Select a .txt, .md, or .pdf file
3. Click "Upload"
4. Wait for "✅ Successfully uploaded..." message

### Ask Questions
1. Type: "What are the main topics?"
2. Press Enter
3. AI responds using your documents

### Test Chat Memory
1. Ask: "Tell me about topic 1"
2. Then ask: "What about the second one?"
3. AI should remember "topic 1" from previous message

### Create New Chat
1. Click "+ New Chat" in sidebar
2. Previous chat appears in sidebar
3. Click previous chat to reload history

---

## 🔧 Troubleshooting

### Backend Issues

**Import Error**:
```bash
cd BackEnd
pip install -r requirements.txt
```

**Missing Token**:
Add `HF_TOKEN` to `BackEnd/.env`

**Port Already in Use**:
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

### Frontend Issues

**Can't Connect to Backend**:
1. Check backend is running: `curl http://127.0.0.1:8000/api/health`
2. Check CORS is configured for `localhost:3000`

**Build Errors**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 What's New (Chat Memory)

### Before
- No conversation history
- AI didn't remember context
- Couldn't revisit old chats

### After ✅
- ✅ Persistent chat threads
- ✅ AI remembers conversation context
- ✅ Load previous chats from sidebar
- ✅ Multiple conversations simultaneously
- ✅ Cloud storage (Chroma database)

---

## 🎯 Next Steps

1. **Upload Documents**: Add your study materials
2. **Create Threads**: Try multiple conversations
3. **Generate Quiz**: Switch to Quiz Mode
4. **Explore API**: Check `http://127.0.0.1:8000/docs`

---

## 📖 Documentation

- [README.md](README.md) - Full documentation
- [CHAT_MEMORY_IMPLEMENTATION.md](CHAT_MEMORY_IMPLEMENTATION.md) - Technical details
- API Docs: `http://127.0.0.1:8000/docs` (when backend running)

---

## 💡 Pro Tips

1. **Context Matters**: AI uses last 8 messages - ask follow-ups!
2. **Document Quality**: Better documents = better answers
3. **Thread Organization**: Use New Chat for different topics
4. **Quiz Generation**: Upload more docs for better quizzes

---

## ❓ Common Questions

**Q: Where is my data stored?**
A: Documents and chats in Chroma cloud database

**Q: How many threads can I create?**
A: Unlimited! (limited by Chroma quota)

**Q: Does AI remember across threads?**
A: No - each thread is independent

**Q: Can I delete threads?**
A: Not in UI yet - use API: `DELETE /api/chat/thread/{id}`

**Q: Is my data private?**
A: Currently no auth - all threads share same database

---

**Ready to go!** 🎉

If you see errors, check:
1. Backend console
2. Browser console (F12)
3. [README.md](README.md) troubleshooting section
