/**
 * Agent Tool Executor & Registry
 * 
 * Manages the tool registry and dispatches execution of planned actions.
 * Avoids long chains of if/else statements by using a structured registry pattern.
 */

const { calculate } = require('../tools/calculator');
const { getCurrentDateTime } = require('../tools/dateTime');
const {
  addTask,
  listTasks,
  completeTask,
  deleteTask,
  clearTasks
} = require('../tools/taskManager');

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

module.exports = {
  executePlan,
  toolRegistry,
  getRegisteredTools
};
