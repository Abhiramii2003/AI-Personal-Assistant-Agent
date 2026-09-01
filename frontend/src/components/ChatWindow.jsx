import React, { useEffect, useRef } from 'react';
import Message from './Message';

/**
 * ChatWindow Component
 * 
 * Displays the list of conversation messages and handles automatic scrolling.
 */
function ChatWindow({ messages = [], loading }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  return (
    <div className="messages-viewport">
      {messages.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex p-4 mb-3">
            <i className="bi bi-robot fs-1"></i>
          </div>
          <h5 className="fw-bold text-dark">Welcome to your Personal AI Assistant!</h5>
          <p className="small text-muted mx-auto" style={{ maxWidth: 450 }}>
            I am an intelligent agent with planning and tool capabilities. I can perform exact calculations, check the date/time, manage your tasks, and converse naturally.
          </p>

          <div className="row g-2 justify-content-center mt-3 mx-auto" style={{ maxWidth: 600 }}>
            <div className="col-12 col-md-4">
              <div className="p-3 bg-white rounded border shadow-sm h-100">
                <i className="bi bi-calculator text-primary fs-4 d-block mb-1"></i>
                <span className="fw-semibold small d-block">Calculator</span>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Math & Percentages</span>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="p-3 bg-white rounded border shadow-sm h-100">
                <i className="bi bi-calendar-check text-warning fs-4 d-block mb-1"></i>
                <span className="fw-semibold small d-block">Date & Time</span>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Current time & days</span>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="p-3 bg-white rounded border shadow-sm h-100">
                <i className="bi bi-list-task text-success fs-4 d-block mb-1"></i>
                <span className="fw-semibold small d-block">Task Manager</span>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Add, list, complete tasks</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {messages.map((msg, idx) => (
            <Message key={idx} message={msg} />
          ))}

          {loading && (
            <div className="message-row bot-row">
              <div className="d-flex align-items-start gap-2">
                <div className="rounded-circle bg-primary bg-opacity-10 text-primary p-2 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 36, height: 36 }}>
                  <i className="bi bi-robot fs-5"></i>
                </div>
                <div className="message-bubble">
                  <span className="small text-muted me-2">Agent is thinking</span>
                  <div className="dot-flashing"></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

export default ChatWindow;
