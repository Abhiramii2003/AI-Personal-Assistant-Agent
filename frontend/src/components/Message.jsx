import React from 'react';

/**
 * Message Component
 * 
 * Renders an individual chat message bubble (User or Agent),
 * along with tool attribution badges and timestamps.
 */
function Message({ message }) {
  const isUser = message.role === 'user';

  const renderToolBadge = (tool) => {
    if (!tool) return null;

    let badgeClass = 'tool-badge';
    let icon = 'bi-gear';
    let label = tool;

    if (tool === 'calculator') {
      badgeClass += ' tool-badge-calculator';
      icon = 'bi-calculator-fill';
      label = 'Used Calculator Tool';
    } else if (tool === 'dateTime') {
      badgeClass += ' tool-badge-dateTime';
      icon = 'bi-calendar-check-fill';
      label = 'Used Date & Time Tool';
    } else if (tool === 'taskManager') {
      badgeClass += ' tool-badge-taskManager';
      icon = 'bi-card-checklist';
      label = 'Used Task Manager Tool';
    }

    return (
      <div className={badgeClass}>
        <i className={`bi ${icon}`}></i>
        <span>{label}</span>
      </div>
    );
  };

  return (
    <div className={`message-row ${isUser ? 'user-row' : 'bot-row'}`}>
      <div className="d-flex align-items-start gap-2" style={{ maxWidth: '85%' }}>
        {!isUser && (
          <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-2 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 36, height: 36 }}>
            <i className="bi bi-robot fs-5"></i>
          </div>
        )}

        <div className="message-bubble">
          {!isUser && message.toolUsed && renderToolBadge(message.toolUsed)}

          <div style={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </div>

          <span className="message-time text-end">
            {message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {isUser && (
          <div className="rounded-circle bg-secondary bg-opacity-10 text-secondary p-2 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 36, height: 36 }}>
            <i className="bi bi-person-fill fs-5"></i>
          </div>
        )}
      </div>
    </div>
  );
}

export default Message;
