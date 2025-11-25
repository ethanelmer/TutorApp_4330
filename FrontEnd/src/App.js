import React, { useState } from 'react';
import Chat from './components/Chat.js';
import Quiz from './components/Quiz.js';
import Header from './components/Header.js';
import './App.css';

function App() {
  const [mode, setMode] = useState('chat'); // 'chat' or 'quiz'
  const [showMenu, setShowMenu] = useState(false);
  const [regenerateCounter, setRegenerateCounter] = useState(0);
  const [regenInProgress, setRegenInProgress] = useState(false);

  const handleMenuOptionClick = (option) => {
    setShowMenu(false);
    if (option === 'Quiz Mode') {
      setMode('quiz');
    } else if (option === 'Chat Mode') {
      setMode('chat');
    }
  };

  const handleRegenerateQuiz = () => {
    if (regenInProgress) return; // prevent double trigger
    setRegenInProgress(true);
    setRegenerateCounter(c => c + 1); // signal Quiz component
  };

  const handleRegenerationComplete = () => {
    setRegenInProgress(false);
  };

  return (
    <div className="App">
      <Header
        onMenuClick={() => setShowMenu(v => !v)}
        showMenu={showMenu}
        onMenuOptionClick={handleMenuOptionClick}
        mode={mode}
        onRegenerateQuiz={handleRegenerateQuiz}
        regenInProgress={regenInProgress}
      />
      {mode === 'chat' ? (
        <Chat onSwitchToQuiz={() => setMode('quiz')} />
      ) : (
        <Quiz
          externalRegenerateTrigger={regenerateCounter}
          onRegenerationComplete={handleRegenerationComplete}
        />
      )}
    </div>
  );
}

export default App;
