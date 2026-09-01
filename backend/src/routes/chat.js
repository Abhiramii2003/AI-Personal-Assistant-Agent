/**
 * Chat Route Handler
 * 
 * Exposes the POST /api/chat endpoint connecting incoming frontend requests
 * to the agent orchestration layer.
 */

const express = require('express');
const router = express.Router();
const { runAgent } = require('../agent/agent');
const { getTasks, clearTasks } = require('../tools/taskManager');

/**
 * POST /api/chat
 * Primary agent interaction endpoint
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    // 1. Input Validation
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
      ? conversationHistory.slice(-20) // Limit to last 20 messages for context safety
      : [];

    // 2. Run Agent
    const result = await runAgent(message.trim(), validatedHistory);

    // 3. Return JSON response
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

/**
 * GET /api/tasks
 * Helper endpoint to inspect current in-memory tasks
 */
router.get('/tasks', (req, res) => {
  res.json({
    success: true,
    tasks: getTasks()
  });
});

/**
 * DELETE /api/tasks
 * Helper endpoint to reset in-memory tasks
 */
router.delete('/tasks', (req, res) => {
  const result = clearTasks();
  res.json(result);
});

module.exports = router;
