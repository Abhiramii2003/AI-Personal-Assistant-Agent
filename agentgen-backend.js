/**
 * ============================================================================
 * AI Personal Assistant Agent — Consolidated Standalone Backend (AgentGen)
 * ============================================================================
 * 
 * Standalone consolidated backend containing:
 * 1. Express Server & CORS Middleware
 * 2. API Routes (/api/chat, /api/tasks, /api/health)
 * 3. AI Agent Orchestration Loop (agent.js)
 * 4. Intent Planning & Structured JSON Plan Generation (planner.js)
 * 5. Tool Registry & Safe Execution (executor.js)
 * 6. LLM Integration Service with Offline Simulation Fallback (llm.js)
 * 7. Safe Arithmetic Calculator Tool (calculator.js)
 * 8. Date & Time Tool (dateTime.js)
 * 9. In-Memory Task Manager Tool (taskManager.js)
 * 
 * Required npm dependencies: express, cors, dotenv, axios
 * Environment variables: PORT, LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
 * 
 * Compatible with standalone node execution and AgentGen single-file backend upload.
 * ============================================================================
 */

// Safely load .env if available (optional in cloud platforms like AgentGen)
try {
  require('dotenv').config();
} catch (e) {
  // Ignore if dotenv is not installed in the deployment environment
}

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// ============================================================================
// CONFIGURATION & SECRETS
// ============================================================================
const PORT = process.env.PORT || 5000;
const API_KEY = process.env.LLM_API_KEY || '';
const BASE_URL = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';
// ============================================================================
// Module: backend/src/tools/calculator.js
// ============================================================================
/**
 * Safe Calculator Tool
 * 
 * Performs arithmetic operations safely WITHOUT using eval().
 * Uses a tokenized recursive-descent parser to calculate mathematical expressions.
 * 
 * Supports:
 * - Basic operators: +, -, *, /, ^ (exponent), % (modulo)
 * - Natural phrases: "20% of 500", "15% of 80"
 * - Parentheses: "(10 + 5) * 4"
 * - Negative and decimal numbers
 */

/**
 * Pre-processes natural language arithmetic expressions
 * e.g., "20% of 500" -> "(20 / 100) * 500"
 * e.g., "25 * 48" -> "25 * 48"
 * e.g., "25 x 48" -> "25 * 48"
 */
function normalizeExpression(expr) {
  if (!expr || typeof expr !== 'string') {
    throw new Error('Invalid calculation input. Input must be a non-empty string.');
  }

  let cleaned = expr.trim();

  // Convert "X% of Y" to "((X / 100) * Y)"
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/gi, '(($1 / 100) * $2)');

  // Convert "X% * Y" or "X * Y%"
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1 / 100)');

  // Replace common multiplication and division symbols
  cleaned = cleaned.replace(/[xX×]/g, '*');
  cleaned = cleaned.replace(/÷/g, '/');

  // Strip leading phrases like "calculate", "what is", "solve", "?", "="
  cleaned = cleaned.replace(/^(what is|calculate|solve|evaluate|compute)\s+/i, '');
  cleaned = cleaned.replace(/[?=\s]+$/g, '');

  return cleaned;
}

/**
 * Tokenizer for arithmetic expressions
 */
function tokenize(expression) {
  const tokens = [];
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (/\d/.test(char) || char === '.') {
      let numStr = '';
      let hasDot = false;
      while (i < expression.length && (/\d/.test(expression[i]) || expression[i] === '.')) {
        if (expression[i] === '.') {
          if (hasDot) throw new Error(`Malformed number with multiple decimal points at position ${i}`);
          hasDot = true;
        }
        numStr += expression[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
      continue;
    }

    if ('+-*/^%()'.includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    throw new Error(`Unsupported character in expression: '${char}'`);
  }

  return tokens;
}

/**
 * Recursive-descent parser to safely evaluate tokens without eval()
 * Grammar:
 * Expression   := Term (( '+' | '-' ) Term)*
 * Term         := Exponent (( '*' | '/' | '%' ) Exponent)*
 * Exponent     := Factor ( '^' Factor )*
 * Factor       := ( '+' | '-' ) Factor | NUMBER | '(' Expression ')'
 */
function parseTokens(tokens) {
  let pos = 0;

  function peek() {
    return tokens[pos];
  }

  function consume(expectedValue) {
    const token = tokens[pos];
    if (!token) {
      throw new Error('Unexpected end of expression');
    }
    if (expectedValue && token.value !== expectedValue) {
      throw new Error(`Expected '${expectedValue}' but got '${token.value}'`);
    }
    pos++;
    return token;
  }

  function parseExpression() {
    let result = parseTerm();

    while (pos < tokens.length) {
      const token = peek();
      if (token && token.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
        consume();
        const nextTerm = parseTerm();
        if (token.value === '+') result += nextTerm;
        else result -= nextTerm;
      } else {
        break;
      }
    }

    return result;
  }

  function parseTerm() {
    let result = parseExponent();

    while (pos < tokens.length) {
      const token = peek();
      if (token && token.type === 'OPERATOR' && (token.value === '*' || token.value === '/' || token.value === '%')) {
        consume();
        const nextExponent = parseExponent();
        if (token.value === '*') {
          result *= nextExponent;
        } else if (token.value === '/') {
          if (nextExponent === 0) {
            throw new Error('Division by zero is not allowed');
          }
          result /= nextExponent;
        } else if (token.value === '%') {
          result %= nextExponent;
        }
      } else {
        break;
      }
    }

    return result;
  }

  function parseExponent() {
    let result = parseFactor();

    while (pos < tokens.length) {
      const token = peek();
      if (token && token.type === 'OPERATOR' && token.value === '^') {
        consume();
        const exponent = parseFactor();
        result = Math.pow(result, exponent);
      } else {
        break;
      }
    }

    return result;
  }

  function parseFactor() {
    const token = peek();
    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    // Unary plus or minus
    if (token.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
      consume();
      const factor = parseFactor();
      return token.value === '-' ? -factor : factor;
    }

    // Number literal
    if (token.type === 'NUMBER') {
      consume();
      return token.value;
    }

    // Parentheses
    if (token.type === 'OPERATOR' && token.value === '(') {
      consume('(');
      const value = parseExpression();
      consume(')');
      return value;
    }

    throw new Error(`Unexpected token '${token.value}'`);
  }

  const finalResult = parseExpression();

  if (pos < tokens.length) {
    throw new Error(`Unexpected extra characters near '${tokens[pos].value}'`);
  }

  return finalResult;
}

/**
 * Main Calculator Execution Function
 * @param {string} input - Mathematical expression e.g. "25 * 48", "20% of 500"
 * @returns {object} { success: boolean, expression: string, result: number|string, formatted: string }
 */
function calculate(input) {
  try {
    const normalized = normalizeExpression(input);
    const tokens = tokenize(normalized);
    if (tokens.length === 0) {
      return {
        success: false,
        error: 'No calculation provided.'
      };
    }

    const numericResult = parseTokens(tokens);

    // Format nicely: limit floating point inaccuracies e.g. 0.1 + 0.2
    const rounded = Number.isInteger(numericResult)
      ? numericResult
      : parseFloat(numericResult.toFixed(8));

    return {
      success: true,
      expression: input,
      normalizedExpression: normalized,
      result: rounded,
      formatted: `${input} = ${rounded}`
    };
  } catch (error) {
    return {
      success: false,
      expression: input,
      error: error.message || 'Calculation error'
    };
  }
}


// ============================================================================
// Module: backend/src/tools/dateTime.js
// ============================================================================
/**
 * Date & Time Tool
 * 
 * Provides accurate current temporal information:
 * - Current Date (e.g., Tuesday, September 1, 2026)
 * - Current Time (12-hour and 24-hour formats)
 * - Day of the Week
 * - Timezone information
 */

/**
 * Returns structured current date and time information
 * @returns {object} Temporal data object
 */
function getCurrentDateTime() {
  const now = new Date();

  // Format options
  const dateOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  const timeOptions = {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };

  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = now.toLocaleDateString('en-US', dateOptions);
  const formattedTime = now.toLocaleTimeString('en-US', timeOptions);
  const isoString = now.toISOString();

  // Timezone information
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  const timeZoneOffset = now.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(timeZoneOffset / 60));
  const offsetMins = Math.abs(timeZoneOffset % 60);
  const offsetSign = timeZoneOffset <= 0 ? '+' : '-';
  const formattedOffset = `UTC${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

  return {
    success: true,
    dayOfWeek,
    date: formattedDate,
    time: formattedTime,
    timeZone: `${timeZone} (${formattedOffset})`,
    iso: isoString,
    summary: `Today is ${dayOfWeek}, ${formattedDate}. The current time is ${formattedTime} (${timeZone}).`
  };
}


// ============================================================================
// Module: backend/src/tools/taskManager.js
// ============================================================================
/**
 * In-Memory Task Manager Tool
 * 
 * Manages personal tasks in memory for learning and demonstration purposes.
 * Note: In a production system, this would persist data to a database (PostgreSQL, MongoDB, SQLite).
 * 
 * Supports:
 * - Adding tasks
 * - Listing all tasks (with completion status)
 * - Marking tasks as completed
 * - Deleting tasks
 * - Clearing tasks
 */

let tasks = [
  {
    id: 1,
    title: "Learn AI Agent Architecture",
    completed: true,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  }
];

let nextId = 2;

/**
 * Add a new task
 * @param {string} title - Task description
 */
function addTask(title) {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return {
      success: false,
      error: 'Task title cannot be empty.'
    };
  }

  // Clean quotes or extra phrasing from title
  const cleanTitle = title.replace(/^["']|["']$/g, '').trim();

  const newTask = {
    id: nextId++,
    title: cleanTitle,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  tasks.push(newTask);

  return {
    success: true,
    message: `Task "${cleanTitle}" added successfully.`,
    task: newTask,
    totalTasks: tasks.length
  };
}

/**
 * List all tasks
 */
function listTasks() {
  if (tasks.length === 0) {
    return {
      success: true,
      tasks: [],
      message: 'You have no tasks in your list. Try adding one by saying "Add Learn React to my tasks".',
      formatted: 'No tasks found.'
    };
  }

  const formatted = tasks
    .map((t, idx) => `${idx + 1}. [${t.completed ? '✓' : ' '}] ${t.title} (ID: ${t.id})`)
    .join('\n');

  const pendingCount = tasks.filter(t => !t.completed).length;
  const completedCount = tasks.filter(t => t.completed).length;

  return {
    success: true,
    tasks: [...tasks],
    total: tasks.length,
    pendingCount,
    completedCount,
    formatted,
    message: `You have ${tasks.length} task${tasks.length === 1 ? '' : 's'} (${pendingCount} pending, ${completedCount} completed):\n${formatted}`
  };
}

/**
 * Find task by ID or partial title match
 */
function findTask(query) {
  if (!query) return null;
  const trimmed = String(query).replace(/^["']|["']$/g, '').trim();

  // Try numeric ID
  const numericId = parseInt(trimmed, 10);
  if (!isNaN(numericId)) {
    const byId = tasks.find(t => t.id === numericId);
    if (byId) return byId;
  }

  // Try exact title match (case-insensitive)
  const exact = tasks.find(t => t.title.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;

  // Try partial title match
  return tasks.find(t => t.title.toLowerCase().includes(trimmed.toLowerCase()));
}

/**
 * Complete a task
 * @param {string|number} query - Task ID or title
 */
function completeTask(query) {
  const task = findTask(query);

  if (!task) {
    return {
      success: false,
      error: `Could not find a task matching "${query}". Check your tasks with "Show my tasks".`
    };
  }

  if (task.completed) {
    return {
      success: true,
      task,
      message: `Task "${task.title}" was already marked as completed.`
    };
  }

  task.completed = true;
  task.completedAt = new Date().toISOString();

  return {
    success: true,
    task,
    message: `Task "${task.title}" (ID: ${task.id}) marked as completed!`
  };
}

/**
 * Delete a task
 * @param {string|number} query - Task ID or title
 */
function deleteTask(query) {
  const task = findTask(query);

  if (!task) {
    return {
      success: false,
      error: `Could not find a task matching "${query}" to delete.`
    };
  }

  tasks = tasks.filter(t => t.id !== task.id);

  return {
    success: true,
    deletedTask: task,
    remainingCount: tasks.length,
    message: `Task "${task.title}" (ID: ${task.id}) deleted successfully.`
  };
}

/**
 * Clear all tasks
 */
function clearTasks() {
  const count = tasks.length;
  tasks = [];
  nextId = 1;
  return {
    success: true,
    message: `Cleared ${count} task${count === 1 ? '' : 's'}.`
  };
}

/**
 * Get raw tasks array
 */
function getTasks() {
  return [...tasks];
}


// ============================================================================
// Module: backend/src/services/llm.js
// ============================================================================
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


// ============================================================================
// Module: backend/src/agent/planner.js
// ============================================================================
/**
 * Agent Planner
 * 
 * Determines user intent and plans what tool/action should be executed.
 * Takes the raw user message and conversation history, invokes the LLM planning prompt,
 * and validates the resulting structured JSON plan.
 */


const VALID_ACTIONS = [
  'calculator',
  'datetime',
  'add_task',
  'list_tasks',
  'complete_task',
  'delete_task',
  'llm'
];

/**
 * Validates and sanitizes the planner output
 * @param {object} plan - Raw plan from LLM
 * @param {string} originalMessage - Original user query
 * @returns {object} Validated plan { action, input, reasoning }
 */
function validatePlan(plan, originalMessage) {
  if (!plan || typeof plan !== 'object') {
    return {
      action: 'llm',
      input: originalMessage,
      reasoning: 'Plan was invalid or empty, falling back to direct LLM response.'
    };
  }

  let action = String(plan.action || '').trim().toLowerCase();

  // Normalize aliases if any
  if (action === 'math' || action === 'calc') action = 'calculator';
  if (action === 'date' || action === 'time' || action === 'date_time') action = 'datetime';
  if (action === 'tasks' || action === 'show_tasks') action = 'list_tasks';

  if (!VALID_ACTIONS.includes(action)) {
    console.warn(`[Planner] Unknown action "${action}" proposed. Defaulting to "llm".`);
    action = 'llm';
  }

  let input = plan.input !== undefined && plan.input !== null ? plan.input : '';
  if (typeof input !== 'string') {
    input = String(input);
  }

  // If calculator has empty input, fallback to using the original message
  if (action === 'calculator' && !input.trim()) {
    input = originalMessage;
  }

  const reasoning = plan.reasoning || `Selected action: ${action}`;

  return {
    action,
    input,
    reasoning
  };
}

/**
 * Main plan creation function
 * @param {string} userMessage - User input string
 * @param {Array} conversationHistory - Prior conversation turns
 * @returns {Promise<object>} Validated plan { action, input, reasoning }
 */
async function createPlan(userMessage, conversationHistory = []) {
  try {
    const rawPlan = await generatePlan(userMessage, conversationHistory);
    const validatedPlan = validatePlan(rawPlan, userMessage);
    return validatedPlan;
  } catch (error) {
    console.error('[Planner] Error generating plan:', error.message);
    return {
      action: 'llm',
      input: userMessage,
      reasoning: 'Planning failed due to an internal error, defaulting to direct conversation.'
    };
  }
}


// ============================================================================
// Module: backend/src/agent/executor.js
// ============================================================================
/**
 * Agent Tool Executor & Registry
 * 
 * Manages the tool registry and dispatches execution of planned actions.
 * Avoids long chains of if/else statements by using a structured registry pattern.
 */


/**
 * Tool Registry Map
 * Maps each action identifier to its tool handler, metadata, and execution function.
 */
const toolRegistry = {
  calculator: {
    name: 'Calculator Tool',
    category: 'calculator',
    description: 'Safely evaluates arithmetic expressions without eval()',
    execute: (input) => calculate(input)
  },

  datetime: {
    name: 'Date & Time Tool',
    category: 'dateTime',
    description: 'Retrieves current date, time, and day of week',
    execute: () => getCurrentDateTime()
  },

  add_task: {
    name: 'Task Manager (Add)',
    category: 'taskManager',
    description: 'Adds a new task to memory',
    execute: (input) => addTask(input)
  },

  list_tasks: {
    name: 'Task Manager (List)',
    category: 'taskManager',
    description: 'Lists all stored tasks with completion status',
    execute: () => listTasks()
  },

  complete_task: {
    name: 'Task Manager (Complete)',
    category: 'taskManager',
    description: 'Marks a specified task as completed',
    execute: (input) => completeTask(input)
  },

  delete_task: {
    name: 'Task Manager (Delete)',
    category: 'taskManager',
    description: 'Deletes a specified task from memory',
    execute: (input) => deleteTask(input)
  },

  clear_tasks: {
    name: 'Task Manager (Clear)',
    category: 'taskManager',
    description: 'Clears all tasks',
    execute: () => clearTasks()
  }
};

/**
 * Executes a planned action using the tool registry
 * @param {object} plan - { action, input, reasoning }
 * @returns {object} Execution result { success, toolUsed, category, data, error }
 */
async function executePlan(plan) {
  const { action, input } = plan;

  // Direct LLM conversation does not invoke an external tool
  if (action === 'llm') {
    return {
      success: true,
      toolUsed: null,
      category: null,
      data: null,
      isDirectLLM: true
    };
  }

  const tool = toolRegistry[action];

  if (!tool) {
    console.error(`[Executor] Unknown tool requested: ${action}`);
    return {
      success: false,
      toolUsed: action,
      category: null,
      error: `Tool "${action}" is not registered in the tool registry.`
    };
  }

  try {
    console.log(`[Agent] Executing tool "${tool.name}" with input: "${input}"`);
    const result = await tool.execute(input);

    return {
      success: result.success !== false,
      toolUsed: action,
      category: tool.category,
      toolName: tool.name,
      data: result,
      error: result.error || null
    };
  } catch (error) {
    console.error(`[Executor] Error executing tool "${tool.name}":`, error);
    return {
      success: false,
      toolUsed: action,
      category: tool.category,
      toolName: tool.name,
      data: null,
      error: error.message || 'An unexpected error occurred during tool execution.'
    };
  }
}

/**
 * Returns a list of all registered tools and their descriptions
 */
function getRegisteredTools() {
  return Object.keys(toolRegistry).map(key => ({
    action: key,
    name: toolRegistry[key].name,
    category: toolRegistry[key].category,
    description: toolRegistry[key].description
  }));
}


// ============================================================================
// Module: backend/src/agent/agent.js
// ============================================================================
/**
 * Core Agent Loop & Orchestrator
 * 
 * Orchestrates the full lifecycle of an AI Agent request:
 * 1. Understand user request & review conversation memory
 * 2. Plan appropriate action via Planner (Intent Analysis)
 * 3. Decide: Direct Answer vs. Tool Execution
 * 4. Execute tool safely via Executor
 * 5. Synthesize final natural language answer via LLM
 * 6. Return response with transparent step-by-step activity trace
 */


/**
 * System prompt defining the persona and behavior of the personal assistant
 */
const AGENT_SYSTEM_PROMPT = `
You are a helpful, polite, and accurate AI Personal Assistant.
You have access to specialized tools for arithmetic, date/time lookup, and personal task management.

GUIDELINES:
- When a tool result is provided, use it faithfully to answer the user's question.
- Never invent calculation results or falsify date/time information.
- Keep answers concise, clear, and friendly.
- If conversation history contains context (like user name or previous answers), reference it naturally.
`;

/**
 * Runs the complete agent orchestration loop
 * @param {string} userMessage - User input prompt
 * @param {Array} conversationHistory - Past messages [{ role: 'user'|'assistant', content: '...' }]
 * @returns {Promise<object>} { success, message, toolUsed, agentSteps }
 */
async function runAgent(userMessage, conversationHistory = []) {
  const agentSteps = [];

  console.log(`\n========================================`);
  console.log(`[Agent] User request received: "${userMessage}"`);
  agentSteps.push('Received user request');

  try {
    // -------------------------------------------------------------
    // Step 1: Planning / Intent Understanding
    // -------------------------------------------------------------
    console.log(`[Agent] Planning request & analyzing intent...`);
    agentSteps.push('Analyzed request and planning next action');

    const plan = await createPlan(userMessage, conversationHistory);
    console.log(`[Agent] Plan created: action="${plan.action}", input="${plan.input}", reasoning="${plan.reasoning}"`);
    agentSteps.push(`Planned action: ${plan.action} (${plan.reasoning})`);

    let toolUsed = null;
    let finalMessage = '';

    // -------------------------------------------------------------
    // Step 2 & 3: Decision & Tool Execution
    // -------------------------------------------------------------
    if (plan.action !== 'llm') {
      agentSteps.push(`Selected tool: ${plan.action}`);
      console.log(`[Agent] Selected tool: ${plan.action}`);

      const executionResult = await executePlan(plan);
      toolUsed = executionResult.category || plan.action;

      if (executionResult.success) {
        agentSteps.push(`Executed ${executionResult.toolName || plan.action} successfully`);
        console.log(`[Agent] Tool executed successfully`);
      } else {
        agentSteps.push(`Tool execution returned an error: ${executionResult.error}`);
        console.warn(`[Agent] Tool error: ${executionResult.error}`);
      }

      // -----------------------------------------------------------
      // Step 4: Synthesize Final Response using Tool Output
      // -----------------------------------------------------------
      console.log(`[Agent] Generating final response incorporating tool results...`);
      agentSteps.push('Synthesizing final response with tool results');

      const synthesisMessages = [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        ...(conversationHistory || []).map(turn => ({ role: turn.role, content: turn.content })),
        { role: 'user', content: userMessage },
        {
          role: 'system',
          content: `TOOL EXECUTION RESULT (${plan.action}): ${JSON.stringify(executionResult.data || executionResult.error)}`
        }
      ];

      finalMessage = await generateResponse(synthesisMessages);
    } else {
      // -----------------------------------------------------------
      // Direct Conversational LLM Response (No Tool Required)
      // -----------------------------------------------------------
      console.log(`[Agent] Direct conversational response (no tool needed)`);
      agentSteps.push('Direct conversational answer without tool');

      const conversationMessages = [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        ...(conversationHistory || []).map(turn => ({ role: turn.role, content: turn.content })),
        { role: 'user', content: userMessage }
      ];

      finalMessage = await generateResponse(conversationMessages);
    }

    // -------------------------------------------------------------
    // Step 5: Final Response Delivery
    // -------------------------------------------------------------
    console.log(`[Agent] Request completed successfully`);
    agentSteps.push('Generated final response');

    return {
      success: true,
      message: finalMessage,
      toolUsed: toolUsed,
      agentSteps: agentSteps
    };
  } catch (error) {
    console.error(`[Agent] Fatal error during agent loop:`, error);
    agentSteps.push(`Encountered error: ${error.message}`);

    return {
      success: false,
      message: 'Sorry, I encountered an issue processing your request. Please try again.',
      toolUsed: null,
      agentSteps: agentSteps,
      error: error.message
    };
  }
}


// ============================================================================
// EXPRESS APPLICATION & ROUTER SETUP
// ============================================================================

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

const frontendCandidates = [
  path.join(__dirname, 'frontend'),
  path.join(__dirname, '../frontend'),
  path.join(__dirname, 'public')
];
const frontendPath = frontendCandidates.find(p => fs.existsSync(p));
if (frontendPath) {
  app.use(express.static(frontendPath));
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AI Personal Assistant Agent (AgentGen Consolidated Backend)'
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'The "message" field is required and must be a non-empty string.',
        toolUsed: null,
        agentSteps: ['Request rejected: Missing or invalid message']
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Message exceeds maximum length of 2000 characters.',
        toolUsed: null,
        agentSteps: ['Request rejected: Message too long']
      });
    }

    const validatedHistory = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-20)
      : [];

    const result = await runAgent(message.trim(), validatedHistory);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('[Route /api/chat] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing request.',
      toolUsed: null,
      agentSteps: ['Internal server error encountered']
    });
  }
});

app.get('/api/tasks', (req, res) => {
  res.json({
    success: true,
    tasks: getTasks()
  });
});

app.delete('/api/tasks', (req, res) => {
  const result = clearTasks();
  res.json(result);
});

app.get('*', (req, res, next) => {
  if (!req.path.startsWith('/api') && frontendPath) {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  next();
});

app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`
  });
});

app.use((err, req, res, next) => {
  console.error('[App] Uncaught Express error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred.'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🤖 AI Personal Assistant Agent (AgentGen Backend)`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💬 Chat endpoint: POST http://localhost:${PORT}/api/chat`);
    console.log(`🔑 LLM Provider: ${MODEL} (${API_KEY ? 'Active API Key' : 'Built-in Simulation Mode'})`);
    console.log('====================================================');
  });
}

module.exports = {
  app,
  runAgent,
  calculate,
  getCurrentDateTime,
  addTask,
  listTasks,
  completeTask,
  deleteTask,
  clearTasks,
  getTasks,
  createPlan,
  executePlan,
  toolRegistry
};
