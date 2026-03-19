const WebSocket = require("ws");
const logger = require("../utils/logger");

let wss = null;
const clients = new Map();

function setupWebSocket(server) {
  wss = new WebSocket.Server({ server, path: "/ws" });
  wss.on("connection", (ws) => {
    const id = "client_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    clients.set(id, ws);
    logger.info("WebSocket client connected: " + id);
    ws.on("close", () => { clients.delete(id); });
    ws.on("error", () => { clients.delete(id); });
  });
  logger.info("WebSocket server initialized on /ws");
}

function broadcast(data) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  clients.forEach((ws) => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
}

function getClientCount() { return clients.size; }

module.exports = { setupWebSocket, broadcast, getClientCount };
