import { getCommandQueueServerPort, getLocalHost } from './FixtureUtils';
import Koa, { Context } from 'koa';
import { createLogger } from '../logger';
import { CommandType } from '../types';

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

class CommandQueueServer {
  private _app: Koa;
  private _server: ReturnType<Koa['listen']> | undefined;
  private _queue: CommandQueueItem[];
  private _port: number;

  constructor() {
    this._app = new Koa();
    this._queue = [];
    this._port = getCommandQueueServerPort();
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

  // Start the fixture server
  async start() {
    const options = {
      host: getLocalHost(),
      port: this._port,
      exclusive: true,
    };

    return new Promise((resolve, reject) => {
      logger.debug('Starting command queue server on port', this._port);
      this._server = this._app.listen(options);
      if (!this._server) {
        logger.error(
          '❌ Failed to start command queue server on port',
          this._port,
        );
        throw new Error('Failed to start command queue server');
      }
      this._server.once('error', reject);
      this._server.once('listening', resolve);
    });
  }
  // Stop the fixture server
  async stop() {
    if (!this._server) {
      return;
    }

    await new Promise((resolve, reject) => {
      logger.debug('Stopping command queue server on port', this._port);
      if (!this._server) {
        logger.error(
          '❌ Failed to stop command queue server on port',
          this._port,
        );
        throw new Error('Failed to stop command queue server');
      }
      this._server.close();
      this._server.once('error', reject);
      this._server.once('close', resolve);
      this._server = undefined;
    });
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
