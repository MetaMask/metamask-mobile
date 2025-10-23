import { getLocalHost, getPerpsModifiersServerPort } from './FixtureUtils';
import Koa, { Context } from 'koa';
import { createLogger } from '../logger';
import { PerpsModifiersType } from '../types';

const logger = createLogger({
  name: 'PerpsModifiersServer',
});

interface PerpsModifiersQueueItem {
  type: PerpsModifiersType;
  data: Record<string, unknown>;
}

class PerpsModifiersServer {
  private _app: Koa;
  private _server: ReturnType<Koa['listen']> | undefined;
  private _queue: PerpsModifiersQueueItem[];

  constructor() {
    this._app = new Koa();
    this._queue = [];

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

  // Start the fixture server
  async start() {
    const options = {
      host: getLocalHost(),
      port: getPerpsModifiersServerPort(),
      exclusive: true,
    };

    return new Promise((resolve, reject) => {
      logger.debug('Starting perps modifiers server...');
      this._server = this._app.listen(options);
      if (!this._server) {
        throw new Error('Failed to start perps modifiers server');
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
      logger.debug('Stopping perps modifiers server...');
      if (!this._server) {
        throw new Error('Failed to stop perps modifiers server');
      }
      this._server.close();
      this._server.once('error', reject);
      this._server.once('close', resolve);
      this._server = undefined;
    });
  }

  addToQueue(item: PerpsModifiersQueueItem) {
    this._queue.push(item);
  }

  private _isQueueRequest(ctx: Context) {
    return ctx.method === 'GET' && ctx.path === '/queue.json';
  }
}

export default PerpsModifiersServer;
