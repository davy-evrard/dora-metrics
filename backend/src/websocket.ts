import WebSocket from 'ws';
import { Server } from 'http';
import metricsService from './services/metrics.service';

export class WebSocketServer {
  private wss: WebSocket.Server;
  private clients: Set<WebSocket> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection');
      this.clients.add(ws);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send initial connection message
      ws.send(JSON.stringify({ type: 'connected', message: 'Connected to DORA Metrics' }));
    });

    this.startPeriodicUpdates();
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(ws: WebSocket, data: any): void {
    switch (data.type) {
      case 'subscribe':
        // Subscribe to team metrics updates
        const teamId = data.teamId;
        if (teamId) {
          this.sendMetricsUpdate(ws, teamId);
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  /**
   * Send metrics update to a specific client
   */
  private async sendMetricsUpdate(ws: WebSocket, teamId: number): Promise<void> {
    try {
      const summary = await metricsService.getMetricsSummary(teamId, 30);

      ws.send(JSON.stringify({
        type: 'metrics_update',
        teamId,
        data: summary,
      }));
    } catch (error) {
      console.error('Error sending metrics update:', error);
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: any): void {
    const data = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Start periodic updates to all clients
   */
  private startPeriodicUpdates(): void {
    // Send updates every 30 seconds
    this.updateInterval = setInterval(() => {
      this.broadcast({
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
      });
    }, 30000);
  }

  /**
   * Stop the WebSocket server
   */
  close(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.clients.forEach((client) => {
      client.close();
    });

    this.wss.close();
  }
}

export default WebSocketServer;
