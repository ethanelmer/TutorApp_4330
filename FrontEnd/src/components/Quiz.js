import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './Quiz.css';

const Quiz = ({ externalRegenerateTrigger, onRegenerationComplete }) => {
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

    const startPollingStatus = (expectFresh = false, onDone) => {
        if (pollRef.current) return; // already polling
        pollRef.current = setInterval(async () => {
            try {
                const statusResp = await axios.get('http://127.0.0.1:8000/api/quiz/status/');
                const { ready, in_progress } = statusResp.data;
                // Initial load: fetch as soon as ready
                if (!expectFresh && ready) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                    const resp = await axios.get('http://127.0.0.1:8000/api/quiz/preloaded/');
                    if (resp.data.quiz) {
                        handleQuizPayload(resp.data.quiz);
                        setIsLoading(false);
                    }
                    if (onDone) onDone();
                    return;
                }
                // Regeneration: wait until finished (ready && !in_progress)
                if (expectFresh && ready && !in_progress) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                    const resp = await axios.get('http://127.0.0.1:8000/api/quiz/preloaded/');
                    if (resp.data.quiz) {
                        handleQuizPayload(resp.data.quiz);
                    }
                    if (onDone) onDone();
                    return;
                }
            } catch (e) {
                // swallow errors
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
                // Not ready yet; begin polling but keep a lightweight waiting state.
                setIsLoading(false); // do not block UI entirely
                startPollingStatus();
            }
        } catch (e) {
            // If preload endpoint errors, just start polling instead of forcing generation.
            startPollingStatus();
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
            // Keep current quiz visible; start fresh polling
            startPollingStatus(true, () => {
                if (onRegenerationComplete) onRegenerationComplete();
            });
        } catch (e) {
            setError('Failed to start regeneration');
            if (onRegenerationComplete) onRegenerationComplete();
        }
    };

    const toggleAnswer = (index) => {
        setShowAnswers(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    // Trigger regeneration when external counter changes
    useEffect(() => {
        if (externalRegenerateTrigger > 0) {
            regenerateBackground();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [externalRegenerateTrigger]);

    if (isLoading) {
        return (
            <div className="quiz-container">
                <div className="quiz-loading">
                    <div className="loading-spinner"></div>
                    <p>Preparing quiz context...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="quiz-container">
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
            <div className="quiz-content">
                {parsedQuestions.length > 0 ? (
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
                    <div className="quiz-empty-state">
                        <p>No quiz loaded yet. Waiting for background generation.</p>
                        <button className="manual-generate-button" onClick={generateQuiz}>
                            Generate Quiz Now
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Quiz;
