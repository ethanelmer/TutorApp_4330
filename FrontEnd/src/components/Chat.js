import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import './Chat.css';
import './FileUpload.css';

const Chat = ({ onSwitchToQuiz }) => {
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Hello! How can I assist you today? You can upload study materials and I\'ll help you understand them.' },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pastChats, setPastChats] = useState([]);
    const [currentThreadId, setCurrentThreadId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [documentCount, setDocumentCount] = useState(0);
    const [showChats, setShowChats] = useState(true);
    const headerTitle = 'TutorAI';
    const fileInputRef = useRef(null);

    const messagesEndRef = useRef(null);

    // Scroll to the bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Initialize: create new thread, fetch document count, and load past threads
    useEffect(() => {
        const initialize = async () => {
            await createNewThread();
            await fetchDocumentCount();
            await fetchPastThreads();
        };
        initialize();
    }, []);

    // Create a new thread on component mount or when user clicks "New Chat"
    const createNewThread = async () => {
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/chat/thread/new');
            setCurrentThreadId(response.data.thread_id);
            console.log('Created new thread:', response.data.thread_id);
        } catch (err) {
            console.error('Error creating thread:', err);
            setError('Failed to create chat thread');
        }
    };

    // Fetch list of past threads
    const fetchPastThreads = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/api/chat/threads');
            setPastChats(response.data.threads);
        } catch (err) {
            console.error('Error fetching past threads:', err);
        }
    };

    // Load a specific thread's history
    const loadThread = async (threadId) => {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/chat/thread/${threadId}/history`);
            const history = response.data.messages;

            // Convert thread history to message format
            const loadedMessages = [
                { sender: 'bot', text: 'Hello! How can I assist you today? You can upload study materials and I\'ll help you understand them.' }
            ];

            history.forEach(msg => {
                loadedMessages.push({
                    sender: msg.role === 'user' ? 'user' : 'bot',
                    text: msg.content
                });
            });

            setMessages(loadedMessages);
            setCurrentThreadId(threadId);
        } catch (err) {
            console.error('Error loading thread:', err);
            setError('Failed to load chat history');
        }
    };

    // Handle creating a new chat
    const handleNewChat = async () => {
        setMessages([
            { sender: 'bot', text: 'Hello! How can I assist you today? You can upload study materials and I\'ll help you understand them.' }
        ]);
        await createNewThread();
        await fetchPastThreads();
    };

    // Handle deleting a thread
    const handleDeleteThread = async (threadId, event) => {
        // Prevent triggering the loadThread function when clicking delete
        event.stopPropagation();

        // Confirm deletion
        if (!window.confirm('Are you sure you want to delete this chat thread?')) {
            return;
        }

        try {
            await axios.delete(`http://127.0.0.1:8000/api/chat/thread/${threadId}`);

            // If we deleted the current thread, create a new one
            if (currentThreadId === threadId) {
                setMessages([
                    { sender: 'bot', text: 'Hello! How can I assist you today? You can upload study materials and I\'ll help you understand them.' }
                ]);
                await createNewThread();
            }

            // Refresh the list of threads
            await fetchPastThreads();
        } catch (err) {
            console.error('Error deleting thread:', err);
            setError('Failed to delete chat thread');
        }
    };

    const fetchDocumentCount = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/api/documents/');
            setDocumentCount(response.data.document_count);
        } catch (err) {
            console.error('Error fetching document count:', err);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setUploadProgress(0);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return;

        // Check file size (limit to 10MB)
        if (selectedFile.size > 10 * 1024 * 1024) {
            setError('File size too large. Please upload files smaller than 10MB.');
            return;
        }

        // Check file type
        const allowedTypes = ['.txt', '.md', '.pdf'];
        const fileExtension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
        if (!allowedTypes.includes(fileExtension)) {
            setError('Invalid file type. Please upload .txt, .md, or .pdf files.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            setError(null); // Clear any previous errors
            const response = await axios.post('http://127.0.0.1:8000/api/upload/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                },
                timeout: 30000, // 30 second timeout
            });

            setMessages(prev => [...prev, {
                sender: 'bot',
                text: `✅ Successfully uploaded and processed ${selectedFile.name}. ${response.data.chunks} chunks were created.`
            }]);

            // Refresh document count
            fetchDocumentCount();

            // Reset file selection
            setSelectedFile(null);
            setUploadProgress(0);
        } catch (err) {
            console.error('Upload error:', err);
            let errorMessage = 'Failed to upload file. Please try again.';
            if (err.response?.data?.detail) {
                errorMessage = err.response.data.detail;
            } else if (err.message) {
                if (err.message.includes('Network Error')) {
                    errorMessage = 'Cannot connect to the server. Please make sure the backend server is running on http://127.0.0.1:8000';
                } else {
                    errorMessage = err.message;
                }
            }

            console.error('Upload error details:', err);
            setError(`Upload failed: ${errorMessage}`);
            setUploadProgress(0);
            setMessages(prev => [...prev, {
                sender: 'bot',
                text: `❌ Failed to upload ${selectedFile.name}. Error: ${errorMessage}`
            }]);
        }
    };

    const handleSend = async (messageText) => {
        if (!messageText.trim()) return;

        // If no thread exists, create one first
        if (!currentThreadId) {
            await createNewThread();
        }

        // Add user message immediately
        const userMessage = { sender: 'user', text: messageText };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        
        // Clear input immediately after adding message
        setInput('');
        
        setIsLoading(true);
        setError(null);

        try {
            // Send message to thread-based endpoint
            const response = await axios.post(
                `http://127.0.0.1:8000/api/chat/thread/${currentThreadId}/message`,
                { text: messageText },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            // Add bot response to messages
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: 'bot', text: response.data.message }
            ]);

            // Refresh past threads list to show updated preview
            fetchPastThreads();
        } catch (err) {
            console.error('Error fetching response:', err);
            let errorMessage = err.response?.data?.detail || 'Sorry, something went wrong. Please try again.';
            if (err.message && err.message.includes('Network Error')) {
                errorMessage = 'Cannot connect to the server. Please ensure the backend is running on http://127.0.0.1:8000 and that CORS allows your frontend origin (http://localhost:3000 or http://127.0.0.1:3000).';
            }
            // Add error message
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: 'bot', text: `❌ ${errorMessage}` }
            ]);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        handleSend(input);
    };

    const handleChatsToggle = () => {
        setShowChats((prev) => !prev);
    };

    const filteredPastChats = pastChats.filter((thread) => thread.message_count > 1);

    return (
        <div className="chat-container">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <div className="header-left">
                        <span className="header-title">{headerTitle}</span>
                    </div>
                </div>

                <button className="new-chat-button" onClick={handleNewChat}>
                    + New Chat
                </button>

                <div className="chats-section">
                    <button
                        type="button"
                        className="chats-header"
                        onClick={handleChatsToggle}
                        aria-expanded={showChats}
                    >
                        <span className="chats-title">Chats ({filteredPastChats.length})</span>
                        <span className="chats-toggle-icon">{showChats ? '▼' : '▶'}</span>
                    </button>

                    {showChats && (
                        <div className="past-chats">
                            {filteredPastChats.map((thread, index) => (
                                <div
                                    key={thread.thread_id || index}
                                    className={`past-chat-item ${currentThreadId === thread.thread_id ? 'active' : ''}`}
                                    onClick={() => loadThread(thread.thread_id)}
                                >
                                    <div className="chat-item-content">
                                        <div className="chat-preview">{thread.preview}</div>
                                        <div className="chat-meta">
                                            {thread.message_count} messages
                                        </div>
                                    </div>
                                    <button
                                        className="delete-thread-button"
                                        onClick={(e) => handleDeleteThread(thread.thread_id, e)}
                                        title="Delete this chat"
                                        type="button"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="main-chat">
                <div className="chat-window">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`message ${msg.sender}`}>
                            <div className="message-content">
                                {/* Use ReactMarkdown to render the message text with Markdown formatting */}
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message bot">
                            <div className="message-content">Typing...</div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {documentCount > 0 && (
                    <div className="document-list">
                        📚 <span className="document-count">{documentCount}</span> document chunks available for reference
                    </div>
                )}

                <form className="input-area" onSubmit={handleFormSubmit}>
                    <input
                        type="text"
                        placeholder="Ask me about your documents..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()}>
                        ➤
                    </button>
                </form>

                <div className="file-upload-area">
                    <div className="file-input-wrapper">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".txt,.md,.pdf"
                            style={{ display: 'none' }}
                        />
                        <button
                            className="file-upload-button"
                            onClick={() => fileInputRef.current?.click()}
                            type="button"
                        >
                            Choose File
                        </button>
                    </div>
                    {selectedFile && (
                        <>
                            <span className="selected-file">{selectedFile.name}</span>
                            <button
                                className="file-upload-button"
                                onClick={handleFileUpload}
                                disabled={!selectedFile || uploadProgress > 0}
                                type="button"
                            >
                                Upload
                            </button>
                        </>
                    )}
                    {uploadProgress > 0 && (
                        <span className="upload-progress">
                            Uploading: {uploadProgress}%
                        </span>
                    )}
                </div>

                {error && <div className="error-message">{error}</div>}
            </div>
        </div>
    );
};

export default Chat;
