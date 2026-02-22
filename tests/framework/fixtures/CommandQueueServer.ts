import { getLocalHost } from './FixtureUtils.ts';
import Koa, { Context } from 'koa';
import { createLogger } from '../logger.ts';
import { CommandType, Resource, ServerStatus } from '../types.ts';
import PortManager, { ResourceType } from '../PortManager.ts';

const logger = createLogger({
  name: 'CommandQueueServer',
});

/**
 * The command queue item to add to the command queue server
 *
 * @param type - The type of command to add to the command queue
 * @param args - The arguments to add to the command queue
 */
export interface CommandQueueItem {
  type: CommandType;
  args: Record<string, unknown>;
}

class CommandQueueServer implements Resource {
  private _app: Koa;
  private _server: ReturnType<Koa['listen']> | undefined;
  private _queue: CommandQueueItem[];
  _serverPort: number;
  _serverStatus: ServerStatus = ServerStatus.STOPPED;

  constructor() {
    this._app = new Koa();
    this._queue = [];
    this._serverPort = 0; // will be set with setServerPort()
    this._app.use(async (ctx: Context) => {
      // Middleware to handle requests
      ctx.set('Access-Control-Allow-Origin', '*');
      ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      ctx.set(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
      );
      if (this._isQueueRequest(ctx)) {
        const newQueue = [...this._queue];
        this._queue.length = 0;
        ctx.body = {
          queue: newQueue,
        };
      }

      if (this._isDebugRequest(ctx)) {
        ctx.body = {
          queue: this._queue,
        };
      }
    });
  }

  isStarted(): boolean {
    return this._serverStatus === ServerStatus.STARTED;
  }

  getServerPort(): number {
    return this._serverPort;
  }

  getServerStatus(): ServerStatus {
    return this._serverStatus;
  }

  setServerPort(port: number): void {
    this._serverPort = port;
  }

  // Start the fixture server
  async start(): Promise<void> {
    if (this._serverStatus === ServerStatus.STARTED) {
      logger.debug('The command queue server has already been started');
      return;
    }

    const options = {
      host: getLocalHost(),
      port: this._serverPort,
      exclusive: true,
    };

    await new Promise<void>((resolve, reject) => {
      logger.debug('Starting command queue server on port', this._serverPort);
      this._server = this._app.listen(options);
      if (!this._server) {
        logger.error(
          '❌ Failed to start command queue server on port',
          this._serverPort,
        );
        reject(new Error('Failed to start command queue server'));
        return;
      }
      let onError: ((err: Error) => void) | null = null;
      let onListening: (() => void) | null = null;
      onError = (err: Error) => {
        if (onListening) {
          this._server?.removeListener('listening', onListening);
        }
        logger.error(
          '❌ Failed to start command queue server on port',
          this._serverPort,
          err,
        );
        this._serverStatus = ServerStatus.STOPPED;
        try {
          this._server?.close();
        } catch (e) {
          // ignore cleanup errors
        }
        this._server = undefined;
        reject(err);
      };
      onListening = () => {
        if (onError) {
          this._server?.removeListener('error', onError);
        }
        this._serverStatus = ServerStatus.STARTED;
        resolve();
      };
      this._server.once('error', onError);
      this._server.once('listening', onListening);
    });
  }
  // Stop the fixture server
  async stop(): Promise<void> {
    if (!this._server) {
      return;
    }

    await new Promise((resolve, reject) => {
      logger.debug('Stopping command queue server on port', this._serverPort);
      if (!this._server) {
        logger.error(
          '❌ Failed to stop command queue server on port',
          this._serverPort,
        );
        throw new Error('Failed to stop command queue server');
      }
      this._server.close();
      this._server.once('error', reject);
      this._server.once('close', () => {
        // Release the port after server is stopped
        if (this._serverPort > 0) {
          PortManager.getInstance().releasePort(
            ResourceType.COMMAND_QUEUE_SERVER,
          );
        }
        resolve(undefined);
      });
      this._server = undefined;
      this._serverStatus = ServerStatus.STOPPED;
    });
    logger.debug('Command queue server stopped on port', this._serverPort);
  }

  addToQueue(item: CommandQueueItem) {
    this._queue.push(item);
  }

  private _isQueueRequest(ctx: Context) {
    return ctx.method === 'GET' && ctx.path === '/queue.json';
  }

  private _isDebugRequest(ctx: Context) {
    return ctx.method === 'GET' && ctx.path === '/debug.json';
  }
}

export default CommandQueueServer;
