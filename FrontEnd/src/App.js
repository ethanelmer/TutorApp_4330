import React, { useState } from 'react';
import Chat from './components/Chat.js';
import Quiz from './components/Quiz.js';
import './App.css';

function App() {
  const [mode, setMode] = useState('chat'); // 'chat' or 'quiz'

  return (
    <div className="App">
      {mode === 'chat' ? (
        <Chat onSwitchToQuiz={() => setMode('quiz')} />
      ) : (
        <Quiz onBackToChat={() => setMode('chat')} />
      )}
    </div>
  );
}

export default App;
