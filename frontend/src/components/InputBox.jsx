import React, { useState } from 'react';

/**
 * InputBox Component
 * 
 * Provides the message input field, send button, and quick-prompt suggestions.
 */
function InputBox({ onSendMessage, disabled }) {
  const [input, setInput] = useState('');

  const suggestions = [
    'What is 25 * 48?',
    "What is today's date?",
    'Add "Learn React" to my tasks',
    'Show my tasks',
    'Explain what an AI agent is'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;

    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChipClick = (promptText) => {
    if (disabled) return;
    onSendMessage(promptText);
  };

  return (
    <div className="p-3 border-top bg-white">
      {/* Prompt Suggestion Chips */}
      <div className="d-flex align-items-center gap-2 overflow-auto pb-2 mb-2" style={{ scrollbarWidth: 'none' }}>
        <span className="text-muted small flex-shrink-0">
          <i className="bi bi-lightbulb-fill text-warning me-1"></i>Try:
        </span>
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            type="button"
            className="prompt-chip btn btn-sm"
            onClick={() => handleChipClick(suggestion)}
            disabled={disabled}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSubmit} className="d-flex gap-2">
        <input
          type="text"
          className="form-control form-control-lg fs-6"
          placeholder="Type your message... (e.g., What is 25 * 48?)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoFocus
        />
        <button
          type="submit"
          className="btn btn-primary px-4 d-flex align-items-center gap-2"
          disabled={disabled || !input.trim()}
        >
          {disabled ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span>Thinking...</span>
            </>
          ) : (
            <>
              <span>Send</span>
              <i className="bi bi-send-fill"></i>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default InputBox;
