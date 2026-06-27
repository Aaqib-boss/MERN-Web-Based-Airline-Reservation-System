import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Global handler to prevent Node.js v24 from crashing on client socket aborts
process.on('uncaughtException', (err) => {
  if (
    err.code === 'ECONNRESET' || 
    err.code === 'EPIPE' || 
    err.syscall === 'read' || 
    err.message?.includes('ECONNRESET')
  ) {
    // Silently ignore connection resets from client sockets
    return;
  }
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Import the Vite binary directly by its file path to bypass ES exports rules
import('./node_modules/vite/bin/vite.js');
