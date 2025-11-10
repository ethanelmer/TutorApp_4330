import React, { useState } from 'react';
import Chat from './components/Chat.js';
import Quiz from './components/Quiz.js';
import Header from './components/Header.js';
import './App.css';

function App() {
  const [mode, setMode] = useState('chat'); // 'chat' or 'quiz'

  const [showMenu, setShowMenu] = useState(false);

  const handleMenuOptionClick = (option) => {
    setShowMenu(false);
    if (option === 'Quiz Mode') {
      setMode('quiz');
    } else if (option === 'New Chat') {
      console.log('New Chat selected');
    }
  };

  return (
    <div className="App">
      <Header 
        onMenuClick={() => setShowMenu(v => !v)} 
        showMenu={showMenu}
        onMenuOptionClick={handleMenuOptionClick}
      />
      {mode === 'chat' ? (
        <Chat onSwitchToQuiz={() => setMode('quiz')} />
      ) : (
        <Quiz onBackToChat={() => setMode('chat')} />
      )}
    </div>
  );
}

export default App;
