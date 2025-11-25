import React, { useState } from 'react';
import Chat from './components/Chat.js';
import Quiz from './components/Quiz.js';
import Header from './components/Header.js';
import './App.css';

function App() {
  const [mode, setMode] = useState('chat'); // 'chat' or 'quiz'
  const [showMenu, setShowMenu] = useState(false);
  const [regenerateCounter, setRegenerateCounter] = useState(0);

  const handleMenuOptionClick = (option) => {
    setShowMenu(false);
    if (option === 'Quiz Mode') {
      setMode('quiz');
    } else if (option === 'Chat Mode') {
      setMode('chat');
    }
  };

  const handleRegenerateQuiz = () => {
    // Increment counter to signal regeneration to Quiz component
    setRegenerateCounter(c => c + 1);
  };

  return (
    <div className="App">
      <Header
        onMenuClick={() => setShowMenu(v => !v)}
        showMenu={showMenu}
        onMenuOptionClick={handleMenuOptionClick}
        mode={mode}
        onRegenerateQuiz={handleRegenerateQuiz}
      />
      {mode === 'chat' ? (
        <Chat onSwitchToQuiz={() => setMode('quiz')} />
      ) : (
        <Quiz externalRegenerateTrigger={regenerateCounter} />
      )}
    </div>
  );
}

export default App;
