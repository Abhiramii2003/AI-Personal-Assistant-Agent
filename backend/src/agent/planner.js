/**
 * Agent Planner
 * 
 * Determines user intent and plans what tool/action should be executed.
 * Takes the raw user message and conversation history, invokes the LLM planning prompt,
 * and validates the resulting structured JSON plan.
 */

const { generatePlan } = require('../services/llm');

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

module.exports = {
  createPlan,
  validatePlan,
  VALID_ACTIONS
};
