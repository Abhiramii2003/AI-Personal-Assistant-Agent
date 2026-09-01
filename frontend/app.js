/**
 * AI Personal Assistant — Frontend Client Script
 * 
 * Manages chat interactions, conversation memory, tool activity updates,
 * and API communication with the Node.js agent backend.
 */

// Determine API base URL (works whether served by backend on :5000 or opened directly)
const API_URL = window.location.origin.includes('5000') || window.location.protocol === 'http:' && !window.location.port
  ? '/api/chat'
  : 'http://localhost:5000/api/chat';

// State
let conversationHistory = [];
let isThinking = false;

// DOM Elements
const messagesViewport = document.getElementById('messagesViewport');
const welcomeBanner = document.getElementById('welcomeBanner');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const sendBtnText = document.getElementById('sendBtnText');
const sendBtnIcon = document.getElementById('sendBtnIcon');
const sendSpinner = document.getElementById('sendSpinner');
const clearChatBtn = document.getElementById('clearChatBtn');
const activityPanelContainer = document.getElementById('activityPanelContainer');
const activityStepsList = document.getElementById('activityStepsList');
const activityToolBadge = document.getElementById('activityToolBadge');

/**
 * Formats step text with appropriate icon
 */
function getStepIcon(stepText) {
  if (stepText.startsWith('Received')) return 'bi-box-arrow-in-right text-muted';
  if (stepText.startsWith('Analyzed') || stepText.startsWith('Planned')) return 'bi-diagram-3-fill text-primary';
  if (stepText.startsWith('Selected tool') || stepText.startsWith('Executed')) return 'bi-gear-wide-connected text-success';
  if (stepText.startsWith('Synthesizing') || stepText.startsWith('Generated')) return 'bi-chat-left-text-fill text-info';
  return 'bi-check-circle-fill text-success';
}

/**
 * Returns tool badge HTML based on tool name
 */
function getToolBadgeHtml(tool) {
  if (!tool) return '';
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

  return `
    <div class="${badgeClass}">
      <i class="bi ${icon}"></i>
      <span>${label}</span>
    </div>
  `;
}

/**
 * Updates the live Agent Activity trace panel
 */
function updateActivityPanel(steps, toolUsed, loading) {
  if ((!steps || steps.length === 0) && !loading) {
    activityPanelContainer.classList.add('d-none');
    return;
  }

  activityPanelContainer.classList.remove('d-none');
  activityStepsList.innerHTML = '';

  // Tool badge on top right
  if (toolUsed) {
    activityToolBadge.classList.remove('d-none');
    activityToolBadge.innerHTML = `<i class="bi bi-gear-fill me-1"></i> Tool: <strong>${toolUsed}</strong>`;
  } else {
    activityToolBadge.classList.add('d-none');
  }

  // Steps
  (steps || []).forEach(step => {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'activity-step';
    stepDiv.innerHTML = `<i class="bi ${getStepIcon(step)}"></i> <span class="small">${escapeHtml(step)}</span>`;
    activityStepsList.appendChild(stepDiv);
  });

  if (loading) {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'activity-step text-primary';
    loadingDiv.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2" role="status"></span>
      <span class="small fw-semibold">Agent is reasoning & orchestrating tools...</span>
    `;
    activityStepsList.appendChild(loadingDiv);
  }
}

/**
 * Escapes HTML characters to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Appends a message bubble to the chat viewport
 */
function appendMessage(role, content, toolUsed = null) {
  if (welcomeBanner) {
    welcomeBanner.classList.add('d-none');
  }

  const isUser = role === 'user';
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const row = document.createElement('div');
  row.className = `message-row ${isUser ? 'user-row' : 'bot-row'}`;

  const inner = document.createElement('div');
  inner.className = 'd-flex align-items-start gap-2';
  inner.style.maxWidth = '85%';

  let avatarHtml = '';
  if (isUser) {
    avatarHtml = `
      <div class="rounded-circle bg-secondary bg-opacity-10 text-secondary p-2 d-flex align-items-center justify-content-center flex-shrink-0" style="width: 36px; height: 36px;">
        <i class="bi bi-person-fill fs-5"></i>
      </div>
    `;
  } else {
    avatarHtml = `
      <div class="rounded-circle bg-primary bg-opacity-10 text-primary p-2 d-flex align-items-center justify-content-center flex-shrink-0" style="width: 36px; height: 36px;">
        <i class="bi bi-robot fs-5"></i>
      </div>
    `;
  }

  const toolBadgeHtml = !isUser && toolUsed ? getToolBadgeHtml(toolUsed) : '';

  const bubbleHtml = `
    <div class="message-bubble">
      ${toolBadgeHtml}
      <div style="white-space: pre-wrap;">${escapeHtml(content)}</div>
      <span class="message-time text-end">${timeStr}</span>
    </div>
  `;

  if (isUser) {
    inner.innerHTML = `${bubbleHtml}${avatarHtml}`;
  } else {
    inner.innerHTML = `${avatarHtml}${bubbleHtml}`;
  }

  row.appendChild(inner);
  messagesViewport.appendChild(row);
  scrollToBottom();
}

/**
 * Displays thinking indicator in the chat
 */
let thinkingElement = null;

function showThinking() {
  if (thinkingElement) return;

  const row = document.createElement('div');
  row.className = 'message-row bot-row thinking-row';

  row.innerHTML = `
    <div class="d-flex align-items-start gap-2">
      <div class="rounded-circle bg-primary bg-opacity-10 text-primary p-2 d-flex align-items-center justify-content-center flex-shrink-0" style="width: 36px; height: 36px;">
        <i class="bi bi-robot fs-5"></i>
      </div>
      <div class="message-bubble">
        <span class="small text-muted me-2">Agent is thinking</span>
        <div class="dot-flashing"></div>
      </div>
    </div>
  `;

  messagesViewport.appendChild(row);
  thinkingElement = row;
  scrollToBottom();
}

function hideThinking() {
  if (thinkingElement) {
    thinkingElement.remove();
    thinkingElement = null;
  }
}

/**
 * Scroll viewport to bottom
 */
function scrollToBottom() {
  messagesViewport.scrollTop = messagesViewport.scrollHeight;
}

/**
 * Set loading state on form controls
 */
function setLoading(loading) {
  isThinking = loading;
  messageInput.disabled = loading;
  sendBtn.disabled = loading;

  if (loading) {
    sendBtnText.textContent = 'Thinking...';
    sendBtnIcon.classList.add('d-none');
    sendSpinner.classList.remove('d-none');
    showThinking();
  } else {
    sendBtnText.textContent = 'Send';
    sendBtnIcon.classList.remove('d-none');
    sendSpinner.classList.add('d-none');
    hideThinking();
    messageInput.focus();
  }
}

/**
 * Sends message to agent backend
 */
async function sendMessage(text) {
  const trimmed = (text || '').trim();
  if (!trimmed || isThinking) return;

  // 1. Render User Message
  appendMessage('user', trimmed);
  conversationHistory.push({ role: 'user', content: trimmed });

  // 2. Set Loading UI & Initial Activity Trace
  setLoading(true);
  updateActivityPanel(['Received user request', 'Analyzing request & determining plan...'], null, true);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: trimmed,
        conversationHistory: conversationHistory
      })
    });

    const data = await response.json();

    if (data.success) {
      // 3. Render Assistant Response
      appendMessage('assistant', data.message, data.toolUsed);
      conversationHistory.push({ role: 'assistant', content: data.message });

      // 4. Update Activity Stepper
      updateActivityPanel(data.agentSteps || [], data.toolUsed, false);
    } else {
      throw new Error(data.message || 'Error communicating with agent.');
    }
  } catch (error) {
    console.error('Chat error:', error);
    const friendlyError = 'Sorry, something went wrong while communicating with the agent. Please make sure the backend server is running.';
    appendMessage('assistant', friendlyError);
    conversationHistory.push({ role: 'assistant', content: friendlyError });
    updateActivityPanel(['Encountered connection or processing error'], null, false);
  } finally {
    setLoading(false);
  }
}

// Event Listeners
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value;
  messageInput.value = '';
  sendMessage(text);
});

// Quick suggestion chip clicks
document.querySelectorAll('.prompt-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const prompt = btn.getAttribute('data-prompt');
    if (prompt && !isThinking) {
      sendMessage(prompt);
    }
  });
});

// Clear conversation button
clearChatBtn.addEventListener('click', () => {
  conversationHistory = [];
  messagesViewport.innerHTML = '';
  if (welcomeBanner) {
    messagesViewport.appendChild(welcomeBanner);
    welcomeBanner.classList.remove('d-none');
  }
  updateActivityPanel([], null, false);
  messageInput.focus();
});

// Initial Welcome message
appendMessage(
  'assistant',
  'Hello! I am your AI Personal Assistant. I can calculate arithmetic, check the date & time, manage your tasks, and answer questions. What can I help you with today?'
);