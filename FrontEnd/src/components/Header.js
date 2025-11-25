import React from 'react';
import './Header.css';

function Header({ onMenuClick, showMenu, onMenuOptionClick, mode, onRegenerateQuiz, regenInProgress }) {
  return (
    <header className="app-header-bar">
      <div className="header-left-group">
        <button
          type="button"
          className="header-menu-btn"
          aria-label="Open menu"
          onClick={onMenuClick}
        >
          ☰
        </button>
        <h1 className="app-header-title">Tutor App</h1>
      </div>
      {mode === 'quiz' && (
        <button
          type="button"
          className={`header-regenerate-btn ${regenInProgress ? 'is-disabled' : ''}`}
          onClick={onRegenerateQuiz}
          aria-label="Regenerate Quiz"
          disabled={regenInProgress}
        >
          {regenInProgress ? (
            <span className="regen-inner"><span className="regen-spinner" /> Regenerating…</span>
          ) : (
            <span className="regen-inner">🔄 Regenerate Quiz</span>
          )}
        </button>
      )}
      {showMenu && (
        <div className="header-dropdown-menu">
          <p onClick={() => onMenuOptionClick('Chat Mode')}>Chat Mode</p>
          <p onClick={() => onMenuOptionClick('Quiz Mode')}>Quiz Mode</p>
        </div>
      )}
    </header>
  );
}

export default Header;
