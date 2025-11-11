# TutorApp Troubleshooting Guide

## Common Issues and Solutions

---

## 🔴 Rate Limit Errors (429)

### Symptom
```
Error code: 429 - Rate limit reached for requests
```
or
```
⏱️ The AI service is currently experiencing high demand. Please wait 10-20 seconds and try your question again.
```

### Cause
The HuggingFace API has rate limits on how many requests you can make per minute/hour.

### Solutions

#### Option 1: Wait and Retry (Recommended)
The app now automatically retries with exponential backoff (waits 1s, then 2s, then 4s). If it still fails:
1. **Wait 10-30 seconds** before trying again
2. The rate limit typically resets within 1 minute
3. Try your question again

#### Option 2: Upgrade HuggingFace Plan
- Free tier: ~10-20 requests per minute
- Pro tier: Higher limits
- Visit: https://huggingface.co/pricing

#### Option 3: Switch to Different Model
Edit [AICalls/modelCall.py](AICalls/modelCall.py:71):
```python
# Current model (may have stricter limits)
model="moonshotai/Kimi-K2-Thinking:novita"

# Try alternative models:
# model="meta-llama/Llama-3.2-3B-Instruct"
# model="microsoft/Phi-3-mini-4k-instruct"
# model="mistralai/Mistral-7B-Instruct-v0.3"
```

#### Option 4: Add Rate Limiting to Frontend
Prevent users from sending too many requests quickly.

---

## 🔴 500 Error on `/api/chat/threads`

### Symptom
```
INFO: 127.0.0.1:54730 - "GET /api/chat/threads HTTP/1.1" 500 Internal Server Error
```

### Cause
Chroma `where` clause requires `$and` operator for multiple conditions.

### Solution
✅ **Already Fixed!** The code has been updated to use:
```python
where={
    "$and": [
        {"thread_id": thread_id},
        {"message_type": "message"}
    ]
}
```

**Restart your backend** to apply the fix:
```bash
# Stop backend (Ctrl+C)
cd BackEnd
python main.py
```

---

## 🔴 Chat History Not Loading

### Symptom
- Sidebar shows "New chat" for all threads
- No message preview appears
- Message count shows 0

### Causes & Solutions

#### 1. Thread Created But No Messages Sent
**Symptom**: Empty threads in sidebar
**Solution**: Only threads with actual messages will show meaningful previews. Send at least one message in each thread.

#### 2. Backend Not Storing Messages
**Check**: Look at backend console logs
```bash
# Should see:
[thread:thread_abc123] incoming text length=23
[thread:thread_abc123] sending 5 docs + conversation history
```
**Solution**: If not seeing these logs, restart backend.

#### 3. Chroma Connection Issue
**Check**: Test health endpoint
```bash
curl http://127.0.0.1:8000/api/health
```
**Solution**: Verify `CHROMA_API_KEY` in `.env` is correct.

---

## 🔴 AI Doesn't Remember Context

### Symptom
AI responds as if it's a brand new conversation, ignoring previous messages.

### Causes & Solutions

#### 1. Using Legacy Endpoint
**Check**: Browser console should show:
```
POST http://127.0.0.1:8000/api/chat/thread/thread_abc123/message
```
**Not**: `POST http://127.0.0.1:8000/api/query/`

**Solution**: Make sure frontend is updated and using thread-based endpoints.

#### 2. Thread History Not Retrieved
**Check**: Backend logs should show:
```
[thread:thread_abc123] sending 5 docs + conversation history
```
**Solution**: If missing "conversation history", check `chat_memory.get_recent_context()` is being called.

#### 3. No Previous Messages in Thread
**Cause**: First message in thread, or thread was just created.
**Solution**: This is normal! Context appears from the second message onward.

---

## 🔴 Backend Won't Start

### Symptom
```
ModuleNotFoundError: No module named 'chromadb'
```

### Solution
```bash
cd BackEnd
pip install -r requirements.txt
```

---

### Symptom
```
ValueError: HF_TOKEN not found in environment variables
```

### Solution
Create/update `BackEnd/.env`:
```env
HF_TOKEN=your_huggingface_token_here
CHROMA_API_KEY=your_chroma_key_here
```

---

### Symptom
```
Address already in use (port 8000)
```

### Solution
Kill existing process:
```bash
# macOS/Linux
lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

## 🔴 Frontend Can't Connect to Backend

### Symptom
```
Network Error
Cannot connect to the server
```

### Solutions

#### 1. Backend Not Running
**Check**:
```bash
curl http://127.0.0.1:8000/api/health
```
**Solution**: Start backend with `python main.py`

#### 2. CORS Error
**Check**: Browser console shows:
```
Access to XMLHttpRequest at 'http://127.0.0.1:8000/api/...' from origin 'http://localhost:3000' has been blocked by CORS
```
**Solution**: Backend should allow `localhost:3000` by default. Check `main.py` allowed_origins.

#### 3. Wrong Port
**Check**: Frontend is calling correct backend URL
**Solution**: Verify [Chat.js](frontend/src/components/Chat.js) uses `http://127.0.0.1:8000`

---

## 🔴 Documents Not Uploading

### Symptom
```
❌ Failed to upload document.pdf
```

### Causes & Solutions

#### 1. File Too Large
**Error**: "File size too large"
**Solution**: Files must be < 10MB. Compress or split the file.

#### 2. Unsupported Format
**Error**: "Invalid file type"
**Solution**: Only `.txt`, `.md`, `.pdf` supported. Convert your file.

#### 3. PDF Contains Only Images
**Error**: "Could not extract any text from the PDF"
**Solution**: PDF contains scanned images. Use OCR tool first.

#### 4. Quota Exceeded
**Error**: "Quota exceeded"
**Solution**:
- Reduce `CHROMA_MAX_RECORDS` in `.env` (default: 300)
- Or delete old documents from Chroma
- Or upgrade Chroma plan

---

## 🔴 Quiz Generation Fails

### Symptom
```
No documents available. Please upload study materials first.
```

### Solution
Upload at least one document before generating quiz.

---

### Symptom
Quiz returns empty or malformed JSON

### Solution
- Upload more/better documents (need substantial content)
- Check backend logs for model errors
- Try regenerating (click "Generate Quiz" again)

---

## 🟡 Performance Issues

### Symptom
Slow responses (>10 seconds)

### Causes & Solutions

#### 1. Large Documents
**Solution**: Reduce `CHUNK_SIZE_CHARS` in `.env` for faster processing
```env
CHUNK_SIZE_CHARS=600  # default: 800
```

#### 2. Many Chunks
**Solution**: Limit chunks per file
```env
MAX_CHUNKS_PER_FILE=100  # default: 200
```

#### 3. Slow AI Model
**Solution**: Switch to faster model in `modelCall.py` (see Rate Limit section above)

#### 4. Network Latency
**Check**: Test with:
```bash
curl -w "@-" -o /dev/null -s http://127.0.0.1:8000/api/health << 'EOF'
time_total: %{time_total}
EOF
```
**Solution**: If >1s, check network/VPN

---

## 🟡 Browser Console Warnings

### Symptom
```
'React' is declared but its value is never read
```

### Solution
These are TypeScript linting warnings - safe to ignore. Or remove unused import.

---

### Symptom
```
huggingface/tokenizers: The current process just got forked...
```

### Solution
Harmless warning. To suppress, add to `BackEnd/.env`:
```env
TOKENIZERS_PARALLELISM=false
```

---

## 🔧 Debugging Tools

### 1. Backend Health Check
```bash
curl http://127.0.0.1:8000/api/health
```
Should return:
```json
{
  "status": "ok",
  "collection_initialized": true,
  "document_count": 5,
  "allowed_origins": ["http://localhost:3000", ...]
}
```

### 2. List All Threads
```bash
curl http://127.0.0.1:8000/api/chat/threads
```

### 3. Get Thread History
```bash
curl http://127.0.0.1:8000/api/chat/thread/thread_abc123/history
```

### 4. Test Document Query
```bash
curl -X POST http://127.0.0.1:8000/api/query/ \
  -H "Content-Type: application/json" \
  -d '{"text": "What is the main topic?"}'
```

### 5. Backend Logs
Enable detailed logging:
```env
DEBUG=true
```
Restart backend and watch console output.

### 6. Browser Console
Open DevTools (F12) → Console tab
Look for:
- Network errors (red)
- API response details
- Thread IDs being used

### 7. Check Chroma Collections
```bash
curl http://127.0.0.1:8000/api/diagnostics/chroma
```

---

## 📝 Quick Fixes Checklist

When things go wrong, try these in order:

- [ ] Restart backend (`Ctrl+C`, then `python main.py`)
- [ ] Refresh browser (hard refresh: `Cmd+Shift+R` or `Ctrl+Shift+R`)
- [ ] Check backend console for errors
- [ ] Check browser console (F12) for errors
- [ ] Verify `.env` file has correct API keys
- [ ] Test health endpoint: `curl http://127.0.0.1:8000/api/health`
- [ ] Wait 30 seconds and try again (rate limits)
- [ ] Check internet connection
- [ ] Update dependencies: `pip install -r requirements.txt`

---

## 🆘 Still Having Issues?

1. **Check Backend Console**: Most errors appear here with details
2. **Check Browser Console**: Frontend errors and network issues
3. **Enable Debug Mode**: Add `DEBUG=true` to `.env`
4. **Review Logs**: Look for error patterns
5. **Test with curl**: Isolate frontend vs backend issues
6. **Check API Keys**: Verify HuggingFace and Chroma credentials

---

## 📚 Additional Resources

- [README.md](README.md) - Full documentation
- [CHAT_MEMORY_IMPLEMENTATION.md](CHAT_MEMORY_IMPLEMENTATION.md) - Technical details
- [QUICKSTART.md](QUICKSTART.md) - Setup guide
- Backend API Docs: http://127.0.0.1:8000/docs (when running)

---

**Last Updated**: 2025-11-11
