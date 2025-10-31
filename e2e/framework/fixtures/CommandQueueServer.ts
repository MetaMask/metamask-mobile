import { getCommandQueueServerPort, getLocalHost } from './FixtureUtils';
import Koa, { Context } from 'koa';
import { createLogger } from '../logger';
import { CommandType, Resource, ServerStatus } from '../types';

const logger = createLogger({
  name: 'CommandQueueServer',
});

interface CommandQueueItem {
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
    this._serverPort = getCommandQueueServerPort();
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

    return new Promise((resolve, reject) => {
      logger.debug('Starting command queue server on port', this._serverPort);
      this._server = this._app.listen(options);
      if (!this._server) {
        logger.error(
          '❌ Failed to start command queue server on port',
          this._serverPort,
        );
        throw new Error('Failed to start command queue server');
      }
      this._server.once('error', reject);
      this._server.once('listening', resolve);
      this._serverStatus = ServerStatus.STARTED;
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
      this._server.once('close', resolve);
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
}

export default CommandQueueServer;
