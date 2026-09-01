/**
 * LLM Service
 * 
 * Handles communication with the Large Language Model.
 * This service is isolated so the rest of the application does not depend
 * directly on any specific LLM provider API.
 * 
 * Supports:
 * - OpenAI-compatible REST endpoints (OpenAI, OpenRouter, Groq, Gemini OpenAI API, Ollama)
 * - Structured JSON plan generation
 * - Final response synthesis
 * - Built-in intelligent offline fallback (for testing/learning without an API key)
 */

const axios = require('axios');

const API_KEY = process.env.LLM_API_KEY || '';
const BASE_URL = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

/**
 * System prompt instructing the LLM on its role and how to generate execution plans
 */
const PLANNER_SYSTEM_PROMPT = `
You are the Planning Core of an AI Personal Assistant Agent.
Analyze the user's message and recent conversation history, then output a JSON plan determining what action the agent should take.

AVAILABLE ACTIONS:
1. "calculator": For mathematical expressions, calculations, percentages, arithmetic (e.g. "What is 25 * 48?", "20% of 500", "100 / 4").
   Set "input" to the exact mathematical expression to evaluate (e.g. "25 * 48").
2. "datetime": For questions asking about current date, current time, day of week, or temporal status (e.g. "What is today's date?", "What time is it?", "What day is today?").
   Set "input" to "" (empty string).
3. "add_task": When the user wants to add or create a new task/reminder (e.g. "Add Learn React to my tasks", "Remember to buy groceries").
   Set "input" to the task title without quotation marks (e.g. "Learn React").
4. "list_tasks": When the user asks to see, view, or show their tasks/todos (e.g. "Show my tasks", "What are my tasks?", "List my todos").
   Set "input" to "" (empty string).
5. "complete_task": When the user wants to mark a task as finished/completed (e.g. "Complete Learn React", "Finish task 1", "Done with grocery shopping").
   Set "input" to the task title or task ID (e.g. "Learn React" or "1").
6. "delete_task": When the user wants to delete/remove a task (e.g. "Delete Learn React", "Remove task 2").
   Set "input" to the task title or task ID (e.g. "Learn React" or "2").
7. "llm": For normal conversation, greetings, answering questions using general knowledge, explaining concepts, or remembering information from previous turns.
   Set "input" to the user query or context.

RULES:
- Respond with ONLY a valid JSON object. No Markdown code fences, no extra text.
- Do NOT invoke a tool when normal conversation is sufficient.
- Always use "calculator" for arithmetic instead of computing it yourself.
- JSON structure:
{
  "action": "calculator" | "datetime" | "add_task" | "list_tasks" | "complete_task" | "delete_task" | "llm",
  "input": "...",
  "reasoning": "Brief explanation of why this action was selected"
}
`;

/**
 * Intelligent offline fallback planner used when no API key is provided
 */
function heuristicPlanner(userMessage) {
  const msg = (userMessage || '').trim();
  const lower = msg.toLowerCase();

  // 1. Task Operations
  if (lower.startsWith('add ') || lower.includes('add to my tasks') || lower.includes('add task') || lower.includes('remember to ')) {
    let taskName = msg
      .replace(/^(please\s+)?add\s+/i, '')
      .replace(/\s+to\s+(my\s+)?tasks?/i, '')
      .replace(/\s+to\s+(my\s+)?todo\s*list/i, '')
      .replace(/^task\s+/i, '')
      .replace(/^remember\s+to\s+/i, '')
      .trim();
    return {
      action: 'add_task',
      input: taskName || 'New Task',
      reasoning: 'User requested to add a new task to their list.'
    };
  }

  if (
    lower.includes('show my task') ||
    lower.includes('show tasks') ||
    lower.includes('list tasks') ||
    lower.includes('list my task') ||
    lower.includes('what are my task') ||
    lower.includes('view task') ||
    lower === 'tasks' ||
    lower === 'my tasks'
  ) {
    return {
      action: 'list_tasks',
      input: '',
      reasoning: 'User requested to view/list all current tasks.'
    };
  }

  if (lower.startsWith('complete ') || lower.startsWith('finish ') || lower.startsWith('done with ') || lower.includes('mark task')) {
    let taskName = msg
      .replace(/^(please\s+)?(complete|finish|mark as complete|mark as done)\s+/i, '')
      .replace(/^done\s+with\s+/i, '')
      .replace(/^task\s+/i, '')
      .trim();
    return {
      action: 'complete_task',
      input: taskName,
      reasoning: 'User requested to complete an existing task.'
    };
  }

  if (lower.startsWith('delete ') || lower.startsWith('remove ') || lower.includes('delete task') || lower.includes('remove task')) {
    let taskName = msg
      .replace(/^(please\s+)?(delete|remove)\s+/i, '')
      .replace(/\s+from\s+(my\s+)?tasks?/i, '')
      .replace(/^task\s+/i, '')
      .trim();
    return {
      action: 'delete_task',
      input: taskName,
      reasoning: 'User requested to delete a task from their list.'
    };
  }

  // 2. Date and Time queries
  if (
    lower.includes("today's date") ||
    lower.includes('current date') ||
    lower.includes('what date is') ||
    lower.includes('what is the date') ||
    lower.includes('what is today') ||
    lower.includes('what time is it') ||
    lower.includes('current time') ||
    lower.includes('what day is today') ||
    lower.includes('what day is it') ||
    lower.includes('day of the week')
  ) {
    return {
      action: 'datetime',
      input: '',
      reasoning: 'User requested current temporal or date/time information.'
    };
  }

  // 3. Calculator / Arithmetic detection
  // Matches patterns like "25 * 48", "100 / 4", "20% of 500", "what is 50 + 50", etc.
  const hasMathExpr = /((\d+(\.\d+)?)\s*[%xX*\/+\-^÷]\s*(\d+(\.\d+)?))|(\d+\s*%\s*of\s*\d+)/.test(msg);
  if (hasMathExpr || (lower.startsWith('what is ') && /\d/.test(msg) && /[+\-*\/xX÷^%]/.test(msg))) {
    const expr = msg
      .replace(/^(what is|calculate|compute|solve)\s+/i, '')
      .replace(/[?=\s]+$/g, '')
      .trim();
    return {
      action: 'calculator',
      input: expr,
      reasoning: 'User provided a mathematical expression requiring exact arithmetic.'
    };
  }

  // 4. Default: Direct LLM conversation
  return {
    action: 'llm',
    input: userMessage,
    reasoning: 'General conversational query or knowledge question.'
  };
}

/**
 * Intelligent offline fallback response generator
 */
function heuristicResponder(userMessage, conversationHistory, toolResult, toolAction) {
  const msg = (userMessage || '').trim();
  const lower = msg.toLowerCase();

  // If a tool was used, format a helpful natural language response
  if (toolAction === 'calculator' && toolResult) {
    if (toolResult.success) {
      return `${toolResult.expression} = ${toolResult.result}`;
    } else {
      return `I encountered an issue with that calculation: ${toolResult.error}`;
    }
  }

  if (toolAction === 'datetime' && toolResult && toolResult.success) {
    return toolResult.summary;
  }

  if ((toolAction === 'add_task' || toolAction === 'list_tasks' || toolAction === 'complete_task' || toolAction === 'delete_task' || toolAction === 'taskManager') && toolResult) {
    return toolResult.message || toolResult.formatted || 'Task operation completed.';
  }

  // Conversational memory check (e.g. "what is my name?")
  if (lower.includes('what is my name') || lower.includes('who am i') || lower.includes('do you know my name')) {
    if (conversationHistory && conversationHistory.length > 0) {
      for (const item of conversationHistory) {
        if (item.role === 'user') {
          const match = item.content.match(/my name is ([a-zA-Z\s]+)/i);
          if (match && match[1]) {
            return `Your name is ${match[1].trim()}.`;
          }
        }
      }
    }
    return "I don't believe you've told me your name yet! What should I call you?";
  }

  // Greeting with name if introduced
  const nameIntroMatch = msg.match(/^my name is ([a-zA-Z\s]+)/i);
  if (nameIntroMatch && nameIntroMatch[1]) {
    return `Nice to meet you, ${nameIntroMatch[1].trim()}! How can I assist you today?`;
  }

  if (lower === 'hello' || lower === 'hi' || lower === 'hey') {
    return 'Hello! I am your AI Personal Assistant. I can help with calculations, check the date/time, manage your tasks, and answer questions. How can I help you today?';
  }

  if (lower.includes('what is an ai agent') || lower.includes('explain what an ai agent is')) {
    return 'An AI Agent is an autonomous system that perceives user requests, plans appropriate actions, selects and executes specialized tools (like calculators, databases, or APIs), and synthesizes clear responses to accomplish goals.';
  }

  if (lower.includes('tell me a joke')) {
    return 'Why do programmers prefer dark mode? Because light attracts bugs! 😄';
  }

  return `I understand: "${userMessage}". As your personal assistant, I can compute math, manage your tasks, check the current date/time, or answer questions. What would you like to do next?`;
}

/**
 * Calls LLM to generate a structured JSON execution plan
 * @param {string} userMessage - User's query
 * @param {Array} conversationHistory - Prior conversation turns
 * @returns {Promise<object>} Parsed plan object
 */
async function generatePlan(userMessage, conversationHistory = []) {
  // If no API key configured, use built-in heuristic planner
  if (!API_KEY || API_KEY === 'your_api_key_here' || API_KEY.trim() === '') {
    return heuristicPlanner(userMessage);
  }

  try {
    const formattedHistory = (conversationHistory || []).map(turn => ({
      role: turn.role,
      content: turn.content
    }));

    const response = await axios.post(
      `${BASE_URL}/chat/completions`,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: PLANNER_SYSTEM_PROMPT },
          ...formattedHistory,
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from LLM planner');
    }

    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    console.warn('[LLM Service] Online planner failed or not configured, falling back to heuristic planner:', error.message);
    return heuristicPlanner(userMessage);
  }
}

/**
 * Helper to extract tool output from system prompt in fallback mode
 */
function extractToolExecutionFromMessages(messages) {
  for (const m of messages) {
    if (m.role === 'system' && m.content.startsWith('TOOL EXECUTION RESULT')) {
      const match = m.content.match(/^TOOL EXECUTION RESULT \(([^)]+)\):\s*([\s\S]*)$/);
      if (match) {
        try {
          const action = match[1];
          const data = JSON.parse(match[2]);
          return { action, data };
        } catch (e) {
          // ignore parse error
        }
      }
    }
  }
  return null;
}

/**
 * Calls LLM to generate a natural conversational response (incorporating tool results if present)
 * @param {Array} messages - Full messages array
 * @returns {Promise<string>} Generated text
 */
async function generateResponse(messages) {
  if (!API_KEY || API_KEY === 'your_api_key_here' || API_KEY.trim() === '') {
    const userMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const history = messages.filter(m => m.role !== 'system');
    const toolExec = extractToolExecutionFromMessages(messages);
    return heuristicResponder(userMsg, history, toolExec?.data, toolExec?.action);
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/chat/completions`,
      {
        model: MODEL,
        messages: messages,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );

    const text = response.data?.choices?.[0]?.message?.content;
    return text || 'I have completed your request.';
  } catch (error) {
    console.warn('[LLM Service] Online generation failed, falling back to heuristic responder:', error.message);
    const userMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const history = messages.filter(m => m.role !== 'system');
    const toolExec = extractToolExecutionFromMessages(messages);
    return heuristicResponder(userMsg, history, toolExec?.data, toolExec?.action);
  }
}

module.exports = {
  generatePlan,
  generateResponse,
  heuristicPlanner,
  heuristicResponder
};
