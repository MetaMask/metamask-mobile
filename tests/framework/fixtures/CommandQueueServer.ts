import Koa, { Context } from 'koa';
import { createLogger, LogLevel } from '../logger';
import { E2ECommandTypes, Resource, ServerStatus, SrpProfile } from '../types';
import PortManager, { ResourceType } from '../PortManager';

const logger = createLogger({
  name: 'CommandQueueServer',
  level: LogLevel.DEBUG,
});

/**
 * The command queue item to add to the command queue server
 *
 * @param type - The type of command to add to the command queue
 * @param args - The arguments to add to the command queue
 */
export interface CommandQueueItem {
  type: E2ECommandTypes;
  args: Record<string, unknown>;
}

class CommandQueueServer implements Resource {
  private _app: Koa;
  private _server: ReturnType<Koa['listen']> | undefined;
  private _queue: CommandQueueItem[];
  private _exportedState: Record<string, unknown> | null;
  private _srpProfile: SrpProfile;
  _serverPort: number;
  _serverStatus: ServerStatus = ServerStatus.STOPPED;

  constructor() {
    this._app = new Koa();
    this._queue = [];
    this._exportedState = null;
    this._srpProfile = SrpProfile.PERFORMANCE;
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
        return;
      }

      if (this._isDebugRequest(ctx)) {
        logger.debug('Debug request received');
        ctx.body = {
          queue: this._queue,
        };
        return;
      }

      if (this._isExportedStatePost(ctx)) {
        logger.debug('Exported state post request received');
        const body = await this._parseJsonBody(ctx);
        this._exportedState = body as Record<string, unknown>;
        ctx.status = 200;
        ctx.body = { success: true };
        return;
      }

      if (this._isExportedStateGet(ctx)) {
        logger.debug('Exported state get request received');
        if (this._exportedState === null) {
          ctx.status = 404;
          ctx.body = { error: 'No exported state available' };
          return;
        }
        ctx.body = this._exportedState;
        return;
      }

      if (this._isSrpProfileTypeRequest(ctx)) {
        logger.debug(
          'SRP profile type request received. Current SRP profile:',
          this._srpProfile,
        );
        ctx.body = {
          srpProfile: this._srpProfile,
        };
        return;
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
      logger.info('The command queue server has already been started');
      return;
    }

    const options = {
      host: '0.0.0.0',
      port: this._serverPort,
      exclusive: true,
    };

    await new Promise<void>((resolve, reject) => {
      logger.info('Starting command queue server on port', this._serverPort);
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
      logger.info('Stopping command queue server on port', this._serverPort);
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
    logger.info('Command queue server stopped on port', this._serverPort);
  }

  addToQueue(item: CommandQueueItem) {
    this._queue.push(item);
  }

  /**
   * Set the number of SRPs the app should pre-load during initialization.
   * The app fetches this value from the root endpoint (GET /) at startup.
   *
   * @param type - The type of SRP profile to import
   */
  setSrpProfile(type: SrpProfile): void {
    logger.debug('Setting SRP profile type to', type.toString());
    this._srpProfile = type;
  }

  requestStateExport() {
    this._exportedState = null;
    this._queue.push({
      type: E2ECommandTypes.exportState,
      args: {},
    });
  }

  async getExportedState(
    timeout = 10000,
    pollInterval = 500,
  ): Promise<Record<string, unknown>> {
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      if (this._exportedState !== null) {
        const state = this._exportedState;
        this._exportedState = null;
        return state;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `getExportedState timed out after ${timeout}ms — the app did not POST to /exported-state. ` +
        'Ensure the command queue server is running and the app is polling /queue.json.',
    );
  }

  private _isQueueRequest(ctx: Context) {
    return ctx.method === 'GET' && ctx.path === '/queue.json';
  }

  private _isDebugRequest(ctx: Context) {
    return ctx.method === 'GET' && ctx.path === '/debug.json';
  }

  private _isSrpProfileTypeRequest(ctx: Context) {
    return ctx.method === 'GET' && ctx.path === '/srp-profile-type.json';
  }

  private _isExportedStatePost(ctx: Context) {
    return ctx.method === 'POST' && ctx.path === '/exported-state';
  }

  private _isExportedStateGet(ctx: Context) {
    return ctx.method === 'GET' && ctx.path === '/exported-state.json';
  }

  private _parseJsonBody(ctx: Context): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = '';
      ctx.req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      ctx.req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
      ctx.req.on('error', reject);
    });
  }
}

export default CommandQueueServer;
