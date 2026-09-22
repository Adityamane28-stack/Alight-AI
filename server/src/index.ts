import 'dotenv/config';
import app from './app.js';

// Prevent unhandled errors or Google stream parsing exceptions from terminating the server process
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [Process Warning] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Process Warning] Uncaught Exception:', err);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});
