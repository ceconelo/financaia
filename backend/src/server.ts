import { createServer } from 'http';
import app from './app.js';
import { initSocket } from './socket/io.js';

const httpServer = createServer(app);
const io = initSocket(httpServer);

const PORT = process.env.API_PORT || 4000;

export function startAPIServer() {
  httpServer.listen(PORT, () => {
    console.log(`🚀 API Server running on port ${PORT}`);
  });
}

// Export io for services if needed (though services should preferably import from socket/io.js)
// But to maintain backward compatibility if any service imports from here (checked, none found, but good practice)
export { io };
