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

const { createPlan } = require('./planner');
const { executePlan } = require('./executor');
const { generateResponse } = require('../services/llm');

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

module.exports = {
  runAgent
};
