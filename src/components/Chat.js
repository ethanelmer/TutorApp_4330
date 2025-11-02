import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import './Chat.css';

// Import the LSU logo
import lsuLogo from './images/LSU-Logo.png';

const Chat = () => {
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Hello! How can I assist you today?' },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const [headerTitle, setHeaderTitle] = useState(''); // Header title state
    const [pastChats] = useState(['Chat 1', 'Chat 2', 'Chat 3', 'Chat 4', 'Chat 5','Chat 6','Chat 7','Chat 8','Chat 8','Chat 10','Chat 11','Chat 12','Chat 13','Chat 14']); // Sample past chats

    const messagesEndRef = useRef(null);

    // Scroll to the bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleMenuToggle = () => {
        setShowMenu((prevShowMenu) => !prevShowMenu); // Toggle dropdown visibility
    };

    const handleMenuOptionClick = (option) => {
        setShowMenu(false); // Close menu after selecting an option
        setHeaderTitle(option); // Update the header title
        console.log(`Option selected: ${option}`);
    };

    const handleSend = async (messageText) => {
        if (!messageText.trim()) return;

        const userMessage = { sender: 'user', text: messageText };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            // Send message to Django backend
            const response = await axios.post(
                'http://127.0.0.1:8000/api/query/',  // Django endpoint
                { text: messageText },  // Sending the user message in JSON format
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            // Retrieve the bot's response from Django's response data
            const botMessage = response.data.message;  // Assume Django returns { "message": "response text" }
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: 'bot', text: botMessage },
            ]);
        } catch (err) {
            console.error('Error fetching response from Django:', err);
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
                    {/* LSU Logo positioned to the right */}
                    <img src={lsuLogo} alt="LSU Logo" className="lsu-logo-sidebar" />
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

                <form className="input-area" onSubmit={handleFormSubmit}>
                    <input
                        type="text"
                        placeholder="Message Mike..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()}>
                        ➤
                    </button>
                </form>

                {error && <div className="error-message">{error}</div>}
            </div>
        </div>
    );
};

export default Chat;
