/**
 * Server Entrypoint
 * 
 * Boots the Express HTTP server on the configured PORT.
 */

const app = require('./app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🤖 AI Personal Assistant Agent Backend running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat endpoint: POST http://localhost:${PORT}/api/chat`);
  console.log(`🔑 LLM Provider: ${process.env.LLM_MODEL || 'gpt-4o-mini'} (${process.env.LLM_API_KEY ? 'Active API Key' : 'Built-in Simulation Mode'})`);
  console.log('====================================================');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, closing server...');
  server.close(() => {
    console.log('Server terminated cleanly.');
  });
});
