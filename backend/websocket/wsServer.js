const WebSocket = require("ws");
const crypto = require("crypto");
const logger = require("../utils/logger");

let wss = null;
const clients = new Map();

function setupWebSocket(server) {
  wss = new WebSocket.Server({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    const id = `client_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    clients.set(id, ws);
    logger.info(`WebSocket connected: ${id} (total: ${clients.size})`);

    ws.on("close", () => {
      clients.delete(id);
      logger.debug(`WebSocket disconnected: ${id} (total: ${clients.size})`);
    });

    ws.on("error", (err) => {
      clients.delete(id);
      logger.warn(`WebSocket error: ${id}`, { error: err.message });
    });

    // Send welcome message
    try {
      ws.send(JSON.stringify({ event: "connected", clientId: id }));
    } catch (_) { /* ignore */ }
  });

  logger.info("WebSocket server initialized on /ws");
}

function broadcast(data) {
  if (!wss || clients.size === 0) return;
  const msg = JSON.stringify(data);
  for (const [id, ws] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(msg);
      } catch (err) {
        logger.warn(`WebSocket send failed for ${id}`, { error: err.message });
        clients.delete(id);
      }
    }
  }
}

function getClientCount() {
  return clients.size;
}

module.exports = { setupWebSocket, broadcast, getClientCount };
