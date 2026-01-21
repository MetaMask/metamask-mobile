/* eslint-disable import/no-nodejs-modules */
import { createLogger, Resource, ServerStatus } from './index';
import http from 'http';
import serveHandler from 'serve-handler';
import { getLocalHost } from './fixtures/FixtureUtils';
import { DappVariants } from './Constants';
import path from 'path';
import PortManager, { ResourceType } from './PortManager';

const logger = createLogger({
  name: 'DappServer',
});

export default class DappServer implements Resource {
  private _serverPort: number;
  private _serverStatus: ServerStatus = ServerStatus.STOPPED;
  private _server: http.Server | undefined;
  private _rootDirectory: string;
  private dappVariant: DappVariants;
  private dappCounter: number;

  constructor({
    dappCounter,
    rootDirectory,
    dappVariant,
  }: {
    dappCounter: number;
    rootDirectory: string;
    dappVariant: DappVariants;
  }) {
    this.dappVariant = dappVariant;
    this._rootDirectory = rootDirectory;
    this.dappCounter = dappCounter;
    // Port will be allocated when start() is called via PortManager
    this._serverPort = 0; // Placeholder, will be set in start()
  }

  async stop(): Promise<void> {
    logger.debug(
      `Stopping dapp server ${this.dappVariant} on port ${this._serverPort}`,
    );
    if (
      this._serverStatus === ServerStatus.STARTED &&
      this._server?.listening
    ) {
      await new Promise<void>((resolve, reject) => {
        this._server?.close((error) => {
          if (error) {
            return reject(error);
          }
          return resolve();
        });
      });
    }
    this._serverStatus = ServerStatus.STOPPED;
    // Release the port after server is stopped
    if (this._serverPort > 0) {
      const instanceId = `dapp-server-${this.dappCounter}`;
      PortManager.getInstance().releaseMultiInstancePort(
        ResourceType.DAPP_SERVER,
        instanceId,
      );
    }
    logger.debug(
      `Dapp server ${this.dappVariant} stopped on port ${this._serverPort}`,
    );
  }

  setServerPort(port: number): void {
    this._serverPort = port;
  }

  async start(): Promise<void> {
    if (this._serverStatus === ServerStatus.STARTED) {
      logger.debug(
        `Dapp server ${this.dappVariant} already started on port ${this._serverPort}`,
      );
      return;
    }

    logger.debug(
      `Starting dapp server ${this.dappVariant} on port ${this._serverPort}`,
    );

    await new Promise<void>((resolve, reject) => {
      this._server = http.createServer(
        async (
          request: http.IncomingMessage,
          response: http.ServerResponse,
        ) => {
          if (!request.url) {
            response.statusCode = 404;
            response.end('Not Found');
            return;
          }

          if (request.url.startsWith('/node_modules/')) {
            request.url = request.url.substr(14);
            const nodeModulesDir = path.resolve(
              __dirname,
              '../../node_modules',
            );
            return serveHandler(request, response, {
              directoryListing: false,
              public: nodeModulesDir,
            });
          }

          // Handle test-dapp-multichain URLs by removing the prefix
          // The multichain test dapp resources are referenced with /test-dapp-multichain/ prefix in its HTML
          if (request.url.startsWith('/test-dapp-multichain/')) {
            request.url = request.url.slice('/test-dapp-multichain'.length);
          }

          return serveHandler(request, response, {
            directoryListing: false,
            public: this._rootDirectory,
          });
        },
      );

      this._server.once('error', (error) => {
        logger.error(
          `Failed to start dapp server ${this.dappVariant} on port ${this._serverPort}: ${String(
            error,
          )}`,
        );
        this._serverStatus = ServerStatus.STOPPED;
        reject(error);
      });

      this._server.listen(this._serverPort, () => {
        this._serverStatus = ServerStatus.STARTED;
        logger.debug(
          `Dapp server ${this.dappVariant} started on port ${this._serverPort}`,
        );
        resolve();
      });
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

  get getServerUrl(): string {
    return `http://${getLocalHost()}:${this._serverPort}`;
  }
}
