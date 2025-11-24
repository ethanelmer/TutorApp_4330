import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './Quiz.css';

const Quiz = ({ onBackToChat }) => {
    const [quiz, setQuiz] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAnswers, setShowAnswers] = useState({});
    const [parsedQuestions, setParsedQuestions] = useState([]);

    const pollRef = useRef(null);

    useEffect(() => {
        fetchPreloadedQuiz();
        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
            }
        };
    }, []);

    const startPollingStatus = () => {
        if (pollRef.current) return; // already polling
        pollRef.current = setInterval(async () => {
            try {
                const statusResp = await axios.get('http://127.0.0.1:8000/api/quiz/status/');
                if (statusResp.data.ready) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                    fetchPreloadedQuiz();
                }
            } catch (e) {
                // swallow errors; keep polling
            }
        }, 3000);
    };

    const fetchPreloadedQuiz = async () => {
        try {
            const resp = await axios.get('http://127.0.0.1:8000/api/quiz/preloaded/');
            if (resp.data.quiz) {
                handleQuizPayload(resp.data.quiz);
                setIsLoading(false);
            } else {
                // not ready yet; show loading and begin polling
                setIsLoading(true);
                startPollingStatus();
            }
        } catch (e) {
            // fallback to on-demand generation if preload fails
            setIsLoading(true);
            generateQuiz();
        }
    };

    const handleQuizPayload = (quizData) => {
        setQuiz(quizData);
        try {
            const jsonMatch = quizData.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.questions && Array.isArray(parsed.questions)) {
                    setParsedQuestions(parsed.questions);
                } else {
                    setParsedQuestions([]);
                }
            } else {
                setParsedQuestions([]);
            }
        } catch (parseError) {
            console.log('Could not parse as JSON, will display as markdown');
            setParsedQuestions([]);
        }
    };

    const generateQuiz = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/quiz/generate/');
            const quizData = response.data.quiz;
            handleQuizPayload(quizData);
        } catch (err) {
            console.error('Error generating quiz:', err);
            let errorMessage = 'Failed to generate quiz. Please try again.';
            if (err.response?.data?.detail) {
                errorMessage = err.response.data.detail;
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const regenerateBackground = async () => {
        try {
            await axios.post('http://127.0.0.1:8000/api/quiz/regenerate/');
            setIsLoading(true);
            // Clear existing quiz while regenerating
            setQuiz(null);
            setParsedQuestions([]);
            startPollingStatus();
        } catch (e) {
            setError('Failed to start regeneration');
        }
    };

    const toggleAnswer = (index) => {
        setShowAnswers(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    if (isLoading) {
        return (
            <div className="quiz-container">
                <div className="quiz-header">
                    <button className="back-button" onClick={onBackToChat}>
                        ← Back to Chat
                    </button>
                    <h1>Quiz Mode</h1>
                </div>
                <div className="quiz-loading">
                    <div className="loading-spinner"></div>
                    <p>Generating your personalized quiz from the study materials...</p>
                    <p className="loading-subtext">This may take a moment</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="quiz-container">
                <div className="quiz-header">
                    <button className="back-button" onClick={onBackToChat}>
                        ← Back to Chat
                    </button>
                    <h1>Quiz Mode</h1>
                </div>
                <div className="quiz-error">
                    <p>❌ {error}</p>
                    <button className="retry-button" onClick={generateQuiz}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="quiz-container">
            <div className="quiz-header">
                <button className="back-button" onClick={onBackToChat}>
                    ← Back to Chat
                </button>
                <h1>Quiz Mode</h1>
                <button className="regenerate-button" onClick={regenerateBackground}>
                    🔄 Regenerate (Background)
                </button>
                <button className="regenerate-button" onClick={generateQuiz}>
                    ⚡ Generate Now
                </button>
            </div>

            <div className="quiz-content">
                {parsedQuestions.length > 0 ? (
                    // Display structured questions if parsing was successful
                    <div className="quiz-questions">
                        {parsedQuestions.map((item, index) => (
                            <div key={index} className="question-card">
                                <div className="question-header">
                                    <span className="question-number">Question {index + 1}</span>
                                </div>
                                <div className="question-text">
                                    <ReactMarkdown>{item.question}</ReactMarkdown>
                                </div>
                                <button 
                                    className="show-answer-button"
                                    onClick={() => toggleAnswer(index)}
                                >
                                    {showAnswers[index] ? '🔼 Hide Answer' : '🔽 Show Answer'}
                                </button>
                                {showAnswers[index] && (
                                    <div className="answer-section">
                                        <div className="answer-label">Answer:</div>
                                        <div className="answer-text">
                                            <ReactMarkdown>{item.answer}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    // Display as markdown if parsing failed
                    <div className="quiz-markdown">
                        <ReactMarkdown>{quiz}</ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Quiz;
