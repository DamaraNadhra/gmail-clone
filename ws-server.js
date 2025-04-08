
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import Redis from 'ioredis';

// 🔌 Connect to local Redis (using Docker)
const redis = new Redis('redis://localhost:6379');

// 🌐 Start HTTP server (needed for ws)
const server = createServer();
const wss = new WebSocketServer({ server });

let sockets = [];

// 🧠 Track client connections
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  sockets.push(ws);

  ws.on('close', () => {
    console.log('❌ WebSocket client disconnected');
    sockets = sockets.filter((client) => client !== ws);
  });
});

// 📬 Redis pub/sub listener
const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

subscriber.subscribe('gmail-updates', (err, count) => {
  if (err) {
    console.error('❗ Redis subscribe error:', err);
  } else {
    console.log(`📡 Subscribed to ${count} channel(s)`);
  }
});

subscriber.on('message', (channel, message) => {
  console.log(`📨 New message on ${channel}:`, message);

  // Relay to all WebSocket clients
  sockets.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  });
});

// 🚀 Start server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🧠 WebSocket server running at ws://localhost:${PORT}`);
});