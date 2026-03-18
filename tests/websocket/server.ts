// eslint-disable-next-line @typescript-eslint/no-shadow, import-x/no-extraneous-dependencies
import { WebSocket, WebSocketServer } from 'ws';
import { createLogger, LogLevel } from '../framework/logger.ts';
import { Resource, ServerStatus } from '../framework/types.ts';

const logger = createLogger({
  name: 'WebSocketServer',
  level: LogLevel.INFO,
});

/**
 * A local WebSocket server for e2e tests.
 *
 * Implements the framework Resource interface so it can be managed
 * by startResourceWithRetry (port allocation, adb reverse, retry logic).
 *
 * Protocol-specific message handling is added by each service's setup
 * function after start().
 */
class LocalWebSocketServer implements Resource {
  private readonly name: string;

  private port = 0;

  private server: WebSocketServer | null = null;

  private websocketConnections: WebSocket[] = [];

  private status: ServerStatus = ServerStatus.STOPPED;

  constructor(name: string) {
    this.name = name;
  }

  setServerPort(port: number): void {
    this.port = port;
  }

  getServerPort(): number {
    return this.port;
  }

  getServerStatus(): ServerStatus {
    return this.status;
  }

  isStarted(): boolean {
    return this.status === ServerStatus.STARTED;
  }

  /**
   * Start the WebSocket server on the configured port.
   * The base server only tracks connections. Protocol-specific message
   * handling is added by each service's setup function.
   */
  async start(): Promise<void> {
    if (this.server) {
      logger.info(
        `[${this.name}] WebSocket server is already running on ws://localhost:${this.port}`,
      );
      return;
    }

    this.server = new WebSocketServer({ port: this.port });

    this.server.on('connection', (socket: WebSocket) => {
      logger.info(
        `[${this.name}] Client connected to ws://localhost:${this.port}`,
      );
      this.websocketConnections.push(socket);

      socket.addEventListener('close', () => {
        logger.info(
          `[${this.name}] Client disconnected from ws://localhost:${this.port}`,
        );
        const index = this.websocketConnections.indexOf(socket);
        if (index > -1) {
          this.websocketConnections.splice(index, 1);
        }
      });
    });

    this.status = ServerStatus.STARTED;
    logger.info(
      `[${this.name}] WebSocket server running on ws://localhost:${this.port}`,
    );
  }

  /**
   * Stop the WebSocket server and close all connections.
   */
  async stop(): Promise<void> {
    if (!this.server) {
      logger.debug(`[${this.name}] WebSocket server is not running`);
      this.status = ServerStatus.STOPPED;
      return;
    }

    const serverClients = Array.from(this.server.clients);
    logger.info(
      `[${this.name}] Found ${serverClients.length} active server clients`,
    );

    // Close all client connections
    for (const client of serverClients) {
      try {
        if (
          client.readyState === client.OPEN ||
          client.readyState === client.CONNECTING
        ) {
          client.close();
        }
      } catch (error) {
        logger.warn(`[${this.name}] Error closing server client:`, error);
      }
    }

    // Clean up tracked connections
    for (const socket of this.websocketConnections) {
      try {
        if (
          socket.readyState === socket.OPEN ||
          socket.readyState === socket.CONNECTING
        ) {
          socket.close();
        }
      } catch (error) {
        logger.warn(
          `[${this.name}] Error closing tracked websocket connection:`,
          error,
        );
      }
    }

    this.websocketConnections = [];

    this.server.close(() => {
      logger.info(
        `[${this.name}] WebSocket server stopped on ws://localhost:${this.port}`,
      );
    });
    this.server = null;
    this.status = ServerStatus.STOPPED;

    // Give a delay to ensure all connections are fully closed
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  /**
   * Get the underlying WebSocketServer instance.
   * Used by mock setup functions to attach protocol-specific handlers.
   *
   * @returns The ws WebSocketServer
   */
  getServer(): WebSocketServer {
    if (!this.server) {
      throw new Error(
        `WebSocket server '${this.name}' has not been started yet.`,
      );
    }
    return this.server;
  }

  /**
   * Broadcast a message to all connected clients.
   *
   * @param message - The message string to send
   */
  sendMessage(message: string): void {
    if (this.server) {
      this.server.clients.forEach((client: WebSocket) => {
        if (client.readyState === 1) {
          // 1 === WebSocket.OPEN
          client.send(message);
        }
      });
    }
  }

  /**
   * Get the count of active WebSocket connections.
   *
   * @returns The number of active connections
   */
  getWebsocketConnectionCount(): number {
    if (!this.server) {
      return 0;
    }
    const serverClientCount = this.server.clients.size;
    logger.debug(
      `[${this.name}] Server has ${serverClientCount} clients, tracked array has ${this.websocketConnections.length}`,
    );
    return serverClientCount;
  }
}

export default LocalWebSocketServer;
