const WebSocket = require("ws");

module.exports = (server) => {
  // Attach WebSocket server to the existing HTTP server
  const wss = new WebSocket.Server({ server }); // `server` is correctly passed

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");

    ws.send(JSON.stringify({ message: "Welcome to the WebSocket server!" }));

    ws.on("message", (data) => {
      console.log("Received message:", data);

      // Broadcast to all clients except the sender
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });
};
