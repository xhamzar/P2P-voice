
/**
 * PRODUCTION REFERENCE: Node.js + WebSocket Signaling Server
 * Save this file as 'server.js' and run 'npm install ws'
 */

/*
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map(); // id -> socket

wss.on('connection', (ws) => {
  let clientId = null;

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    
    // Simple ID-based registration on first message
    if (!clientId) {
      clientId = msg.sender;
      clients.set(clientId, ws);
      console.log(`Client ${clientId} connected`);
    }

    const targetSocket = clients.get(msg.target);
    if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
      targetSocket.send(JSON.stringify(msg));
    }
  });

  ws.on('close', () => {
    if (clientId) {
      clients.delete(clientId);
      console.log(`Client ${clientId} disconnected`);
    }
  });
});

console.log('Signaling server running on ws://localhost:8080');
*/
