import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import './Chat.css';
import './FileUpload.css';

const Chat = () => {
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Hello! How can I assist you today? You can upload study materials and I\'ll help you understand them.' },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const [headerTitle, setHeaderTitle] = useState(''); // Header title state
    const [pastChats] = useState(['Chat 1', 'Chat 2', 'Chat 3', 'Chat 4', 'Chat 5','Chat 6','Chat 7','Chat 8','Chat 8','Chat 10','Chat 11','Chat 12','Chat 13','Chat 14']); // Sample past chats
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [documentCount, setDocumentCount] = useState(0);
    const fileInputRef = useRef(null);

    const messagesEndRef = useRef(null);

    // Scroll to the bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch document count on component mount
    useEffect(() => {
        fetchDocumentCount();
    }, []);

    const fetchDocumentCount = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/api/documents/');
            setDocumentCount(response.data.document_count);
        } catch (err) {
            console.error('Error fetching document count:', err);
        }
    };

    const handleMenuToggle = () => {
        setShowMenu((prevShowMenu) => !prevShowMenu); // Toggle dropdown visibility
    };

    const handleMenuOptionClick = (option) => {
        setShowMenu(false); // Close menu after selecting an option
        setHeaderTitle(option); // Update the header title
        console.log(`Option selected: ${option}`);
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
            const errorMessage = err.response?.data?.detail || 'Failed to upload file. Please try again.';
            setError(`Upload failed: ${errorMessage}`);
            setUploadProgress(0);
            setMessages(prev => [...prev, {
                sender: 'bot',
                text: `❌ Failed to upload ${selectedFile.name}. ${errorMessage}`
            }]);
        }
    };

    const handleSend = async (messageText) => {
        if (!messageText.trim()) return;

        const userMessage = { sender: 'user', text: messageText };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            // Send message to our FastAPI backend
            const response = await axios.post(
                'http://127.0.0.1:8000/api/query/',
                { text: messageText },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const botMessage = response.data.message;
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: 'bot', text: botMessage },
            ]);
        } catch (err) {
            console.error('Error fetching response:', err);
            setError('Sorry, something went wrong. Please try again.');
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: 'bot', text: 'Sorry, something went wrong. Please try again.' },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        handleSend(input);
    };

    return (
        <div className="chat-container">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <div className="header-left">
                        <div className="menu-icon" onClick={handleMenuToggle}>☰</div>
                        <span className="header-title">{headerTitle}</span>
                    </div>
                </div>
                {showMenu && (
                    <div className="menu-dropdown-sidebar">
                        <p onClick={() => handleMenuOptionClick("Guided Training")}>Guided Training</p>
                        <p onClick={() => handleMenuOptionClick("Questions and Answers")}>Questions and Answers</p>
                    </div>
                )}

                {/* Scrollable List of Past Chats */}
                <div className="past-chats">
                    {pastChats.map((chat, index) => (
                        <div key={index} className="past-chat-item">
                            {chat}
                        </div>
                    ))}
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
