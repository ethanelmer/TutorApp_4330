import React from 'react';
import './Header.css';

function Header({ onMenuClick, showMenu, onMenuOptionClick }) {
  return (
    <header className="app-header-bar">
      <button
        type="button"
        className="header-menu-btn"
        aria-label="Open menu"
        onClick={onMenuClick}
      >
        ☰
      </button>
      <h1 className="app-header-title">Tutor App</h1>
      
      {showMenu && (
        <div className="header-dropdown-menu">
          <p onClick={() => onMenuOptionClick('New Chat')}>New Chat</p>
          <p onClick={() => onMenuOptionClick('Quiz Mode')}>Quiz Mode</p>
        </div>
      )}
    </header>
  );
}

export default Header;
