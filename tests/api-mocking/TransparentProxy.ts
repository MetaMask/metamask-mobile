import { getLocal, generateCACertificate, Mockttp } from 'mockttp';
import { Resource, ServerStatus, TestSpecificMock } from '../framework/types';
import PortManager, { ResourceType } from '../framework/PortManager';
import { createLogger } from '../framework/logger';

const logger = createLogger({ name: 'TransparentProxy' });

export default class TransparentProxy implements Resource {
  _serverPort = 0;
  _serverStatus: ServerStatus = ServerStatus.STOPPED;
  private _server: Mockttp | null = null;
  private _testSpecificMock?: TestSpecificMock;
  private _rejectionHandler: ((reason: unknown) => void) | null = null;

  // Shared CA cert across all instances in the process (generated once)
  static _caCert: { key: string; cert: string } | null = null;

  constructor(params: { testSpecificMock?: TestSpecificMock }) {
    this._testSpecificMock = params.testSpecificMock;
  }

  async start(): Promise<void> {
    if (!TransparentProxy._caCert) {
      TransparentProxy._caCert = await generateCACertificate();
    }
    this._server = getLocal({
      https: {
        key: TransparentProxy._caCert.key,
        cert: TransparentProxy._caCert.cert,
      },
    });
    await this._server.start(this._serverPort);

    // Test-specific mocks take precedence
    if (this._testSpecificMock) {
      await this._testSpecificMock(this._server);
    }

    // Pass through all unmatched WebSocket connections
    await this._server.forAnyWebSocket().thenPassThrough();

    // Pass through all unmatched HTTP/HTTPS requests
    await this._server.forAnyRequest().thenPassThrough({
      beforeRequest: (req) => {
        logger.info(`→ ${req.method} ${req.url}`);
      },
    });

    await this._server.on('abort', (req) => {
      logger.debug(`Request aborted: ${req.method} ${req.url}`);
    });

    this._rejectionHandler = (reason: unknown) => {
      if (reason instanceof Error && reason.message === 'Aborted') {
        logger.debug(`Suppressed mockttp Aborted rejection`);
        return;
      }
    };
    process.on('unhandledRejection', this._rejectionHandler);

    this._serverStatus = ServerStatus.STARTED;
    logger.info(`Transparent proxy listening on port ${this._serverPort}`);
  }

  async stop(): Promise<void> {
    if (this._rejectionHandler) {
      process.removeListener('unhandledRejection', this._rejectionHandler);
      this._rejectionHandler = null;
    }
    if (this._server) {
      await this._server.stop();
      this._server = null;
      PortManager.getInstance().releasePort(ResourceType.TRANSPARENT_PROXY);
    }
    this._serverStatus = ServerStatus.STOPPED;
  }

  getCACertPem(): string {
    if (!TransparentProxy._caCert) {
      throw new Error('CA cert not generated yet — call start() first');
    }
    return TransparentProxy._caCert.cert;
  }

  get server(): Mockttp {
    if (!this._server) {
      throw new Error('TransparentProxy server not started');
    }
    return this._server;
  }

  isStarted(): boolean {
    return this._serverStatus === ServerStatus.STARTED;
  }

  setServerPort(port: number): void {
    this._serverPort = port;
  }

  getServerPort(): number {
    return this._serverPort;
  }

  getServerStatus(): ServerStatus {
    return this._serverStatus;
  }
}
