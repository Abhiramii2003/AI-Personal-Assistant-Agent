import React, { useState } from 'react';
import axios from 'axios';
import ChatWindow from './components/ChatWindow';
import InputBox from './components/InputBox';
import ToolActivity from './components/ToolActivity';

/**
 * Main App Component
 * 
 * Manages chat state, conversation history, API communication,
 * and renders the overall assistant UI.
 */
function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your AI Personal Assistant. I can calculate math, check the date & time, manage your tasks, and answer questions. What can I do for you?',
      toolUsed: null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [latestSteps, setLatestSteps] = useState([]);
  const [latestTool, setLatestTool] = useState(null);

  /**
   * Sends user message to backend /api/chat
   */
  const handleSendMessage = async (userText) => {
    if (!userText.trim() || loading) return;

    setError(null);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Append user message to UI state
    const userMessage = {
      role: 'user',
      content: userText,
      timestamp: now
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);
    setLatestSteps(['Received user request', 'Analyzing request & determining plan...']);
    setLatestTool(null);

    try {
      // 2. Prepare conversation history for backend context memory
      const conversationHistory = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // 3. POST request to Node.js backend
      const response = await axios.post('/api/chat', {
        message: userText,
        conversationHistory: conversationHistory
      });

      const data = response.data;

      if (data.success) {
        // 4. Update Agent Message & Activity State
        const assistantMessage = {
          role: 'assistant',
          content: data.message,
          toolUsed: data.toolUsed,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, assistantMessage]);
        setLatestSteps(data.agentSteps || []);
        setLatestTool(data.toolUsed || null);
      } else {
        throw new Error(data.message || 'Server returned an error.');
      }
    } catch (err) {
      console.error('Chat error:', err);
      const friendlyError = 'Sorry, something went wrong while communicating with the agent. Please try again.';
      setError(friendlyError);

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: friendlyError,
          toolUsed: null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      setLatestSteps(prev => [...prev, 'Encountered connection or processing error']);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resets conversation state
   */
  const handleClearHistory = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Conversation history cleared. How may I assist you now?',
        toolUsed: null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setLatestSteps([]);
    setLatestTool(null);
    setError(null);
  };

  return (
    <div className="app-wrapper py-3 px-2 px-md-4">
      {/* Header */}
      <header className="assistant-header p-4 mb-3">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-white text-primary rounded-3 p-2 d-flex align-items-center justify-content-center shadow-sm" style={{ width: 44, height: 44 }}>
              <i className="bi bi-robot fs-4"></i>
            </div>
            <div>
              <h1 className="h4 mb-0 fw-bold">AI Personal Assistant</h1>
              <p className="mb-0 small opacity-75">React + Node.js Agent Orchestrator with Tools</p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-white text-primary px-3 py-2 rounded-pill shadow-sm">
              <span className="spinner-grow spinner-grow-sm text-success me-1" style={{ width: 8, height: 8 }} role="status"></span>
              Agent Active
            </span>
            <button
              onClick={handleClearHistory}
              className="btn btn-outline-light btn-sm rounded-pill px-3"
              title="Clear Conversation"
            >
              <i className="bi bi-trash3 me-1"></i>
              Clear
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="chat-container">
        {/* Agent Activity Trace */}
        <div className="px-3 pt-3">
          <ToolActivity
            steps={latestSteps}
            toolUsed={latestTool}
            isThinking={loading}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-warning alert-dismissible fade show mx-3 mt-2" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
            <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          </div>
        )}

        {/* Chat History Messages */}
        <ChatWindow messages={messages} loading={loading} />

        {/* Message Input Form */}
        <InputBox onSendMessage={handleSendMessage} disabled={loading} />
      </main>

      {/* Footer Info */}
      <footer className="text-center py-2 text-muted small">
        <span>AI Agent Architecture: React UI ➔ Express API ➔ Intent Planner ➔ Tool Registry ➔ Response Synthesizer</span>
      </footer>
    </div>
  );
}

export default App;
