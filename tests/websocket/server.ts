// eslint-disable-next-line @typescript-eslint/no-shadow, import-x/no-extraneous-dependencies
import { WebSocket, WebSocketServer } from 'ws';
import { createLogger, LogLevel } from '../framework/logger.ts';
import { Resource, ServerStatus } from '../framework/types.ts';
import PortManager, { ResourceType } from '../framework/PortManager.ts';

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

  private readonly resourceType?: ResourceType;

  private port = 0;

  private server: WebSocketServer | null = null;

  private websocketConnections: WebSocket[] = [];

  private status: ServerStatus = ServerStatus.STOPPED;

  /**
   * @param name - Human-readable label used in log messages.
   * @param resourceType - Optional ResourceType whose PortManager allocation
   * should be released when the server stops. Pass this only for servers
   * that are registered as single-instance resources in PortManager (e.g.
   * ResourceType.ACCOUNT_ACTIVITY_WS). Leave undefined for servers that
   * manage their own port lifecycle externally.
   */
  constructor(name: string, resourceType?: ResourceType) {
    this.name = name;
    this.resourceType = resourceType;
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

    const wsServer = new WebSocketServer({ port: this.port });
    this.server = wsServer;

    wsServer.on('connection', (socket: WebSocket) => {
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

    await new Promise<void>((resolve, reject) => {
      const handleError = (error: Error) => {
        wsServer.removeAllListeners('listening');
        this.server = null;
        this.status = ServerStatus.STOPPED;
        reject(error);
      };

      const handleListening = () => {
        wsServer.off('error', handleError);
        const address = wsServer.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
        }
        resolve();
      };

      wsServer.once('listening', handleListening);
      wsServer.once('error', handleError);
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
      // Ensure stale single-resource allocations do not carry over after timeout paths.
      if (this.resourceType) {
        PortManager.getInstance().releasePort(this.resourceType);
      }
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

    try {
      await new Promise<void>((resolve, reject) => {
        this.server?.close((err) => {
          if (err) {
            logger.warn(`[${this.name}] Error closing WebSocket server:`, err);
            reject(err);
          } else {
            logger.info(
              `[${this.name}] WebSocket server stopped on ws://localhost:${this.port}`,
            );
            resolve();
          }
        });
      });
    } finally {
      this.server = null;
      this.status = ServerStatus.STOPPED;
      if (this.resourceType) {
        PortManager.getInstance().releasePort(this.resourceType);
      }
    }
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
