import { NextApiRequest, NextApiResponse } from "next";
import { WebSocketServer } from "ws";
import redisClient from "~/lib/redis";

const WEBSOCKET_PATH = "/api/socket";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const socket = res.socket as any;

  if (!socket.server.wss) {
    console.log("Starting WebSocket server...");
    const wss = new WebSocketServer({ noServer: true });

    socket.server.on("upgrade", (request: any, socket: any, head: any) => {
      if (request.url === WEBSOCKET_PATH) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    // Redis subscriber for real-time updates
    const redisSubscriber = redisClient.subscribe("messages");

    redisSubscriber.on("message", (message) => {
      const messageToSend = JSON.stringify({ text: message, timestamp: Date.now() });
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(messageToSend);
        }
      });
    });

    wss.on("connection", (ws) => {
      console.log("Client connected");

      ws.on("message", async (message) => {
        console.log(`Received from WebSocket: ${message}`);
        await redisClient.publish("messages", message);
      });

      ws.on("close", () => console.log("Client disconnected"));
    });

    socket.server.wss = wss;
  }

  res.end();
}
