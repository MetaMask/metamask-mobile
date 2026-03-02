import { getLocal, generateCACertificate, Mockttp } from 'mockttp';
import { Resource, ServerStatus, TestSpecificMock } from '../framework/types';
import PortManager, { ResourceType } from '../framework/PortManager';
import { FrameworkDetector } from '../framework/FrameworkDetector';
import { createLogger } from '../framework/logger';
import {
  configureAndroidProxy,
  removeAndroidProxy,
  removeCACertAndroid,
  installCACertAndroid,
  installCACertIOS,
  configureIOSProxy,
  removeIOSProxy,
  removeCACertIOS,
} from '../framework/fixtures/DeviceProxyConfig';

const logger = createLogger({ name: 'TransparentProxy' });

export default class TransparentProxy implements Resource {
  _serverPort = 0;
  _serverStatus: ServerStatus = ServerStatus.STOPPED;
  private _server: Mockttp | null = null;
  private _testSpecificMock?: TestSpecificMock;
  private _rejectionHandler:
    | ((reason: unknown, promise: Promise<unknown>) => void)
    | null = null;
  private _originalRejectionHandlers: ((...args: unknown[]) => void)[] = [];

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

    // Snapshot and replace all unhandledRejection handlers so our filter runs
    // INSTEAD of Jest's handler, not alongside it. For non-Aborted rejections
    // we forward to the original handlers.
    this._originalRejectionHandlers = process
      .rawListeners('unhandledRejection')
      .slice() as ((...args: unknown[]) => void)[];
    process.removeAllListeners('unhandledRejection');

    this._rejectionHandler = (reason: unknown, promise: Promise<unknown>) => {
      if (
        reason instanceof Error &&
        reason.message === 'Aborted' &&
        reason.stack?.includes('mockttp')
      ) {
        // eslint-disable-next-line no-empty-function
        promise.catch(() => {});
        return;
      }
      for (const handler of this._originalRejectionHandlers) {
        handler(reason, promise);
      }
    };
    process.on('unhandledRejection', this._rejectionHandler);

    this._serverStatus = ServerStatus.STARTED;
    logger.info(`Transparent proxy listening on port ${this._serverPort}`);
  }

  async stop(): Promise<void> {
    if (this._server) {
      await this._server.stop();
      this._server = null;
      PortManager.getInstance().releasePort(ResourceType.TRANSPARENT_PROXY);
    }
    // Drain period: 'aborted' events from destroyed sockets may fire
    // asynchronously after stop() resolves. Keep the filter active until
    // pending microtasks have flushed.
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Restore original handlers (e.g. Jest's) that were replaced in start().
    // Preserve any handlers added by other code during the proxy's lifetime.
    const currentHandlers = process.rawListeners('unhandledRejection').slice();
    const addedDuringLifetime = currentHandlers.filter(
      (h) =>
        h !== this._rejectionHandler &&
        !this._originalRejectionHandlers.includes(
          h as (...args: unknown[]) => void,
        ),
    );
    process.removeAllListeners('unhandledRejection');
    for (const handler of [
      ...this._originalRejectionHandlers,
      ...addedDuringLifetime,
    ]) {
      process.on('unhandledRejection', handler as (...args: unknown[]) => void);
    }
    this._rejectionHandler = null;
    this._originalRejectionHandlers = [];
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

  /**
   * Generates the CA certificate (if not already done) and installs it on the
   * device/simulator. Must be called BEFORE any port forwarding is set up,
   * so that if an Android emulator reboot is triggered (to disable dm-verity),
   * no adb-reverse entries are lost — they will all be created afterwards on
   * the fresh device state.
   */
  static async prepareCACertOnDevice(): Promise<void> {
    if (!FrameworkDetector.isDetox()) return;

    if (!TransparentProxy._caCert) {
      TransparentProxy._caCert = await generateCACertificate();
    }
    const certPem = TransparentProxy._caCert.cert;

    const isAndroid = device.getPlatform() === 'android';
    if (isAndroid) {
      const deviceId = (device as { id?: string }).id || '';
      await installCACertAndroid(deviceId, certPem);
    } else {
      const simulatorId = (device as { id?: string }).id || 'booted';
      await installCACertIOS(simulatorId, certPem);
    }
  }

  /**
   * Configures the device/simulator to route traffic through this proxy and
   * disables Detox synchronization. The CA certificate must already be
   * installed via prepareCACertOnDevice() before calling this.
   * Must be called AFTER the app has been launched.
   */
  async configureDevice(): Promise<void> {
    const proxyPort = PortManager.getInstance().getPort(
      ResourceType.TRANSPARENT_PROXY,
    );
    if (!proxyPort) {
      throw new Error('Transparent proxy port not allocated by PortManager');
    }

    if (FrameworkDetector.isDetox()) {
      const isAndroid = device.getPlatform() === 'android';
      if (isAndroid) {
        const deviceId = (device as { id?: string }).id || '';
        await configureAndroidProxy(deviceId, proxyPort);
      } else {
        await configureIOSProxy(proxyPort);
      }

      await device.setURLBlacklist(['.*']);
      await device.disableSynchronization();
    }

    logger.info('Device proxy configured.');
  }

  /**
   * Removes the device/simulator proxy configuration and uninstalls the CA certificate.
   * Should be called before stopping the proxy server.
   */
  async removeDeviceConfig(): Promise<void> {
    if (FrameworkDetector.isDetox()) {
      // Guard against device being inaccessible (e.g. emulator crashed during the test).
      // typeof check avoids ReferenceError when the Detox global has been torn down.
      let isAndroid: boolean;
      try {
        // eslint-disable-next-line no-undef
        isAndroid = device.getPlatform() === 'android';
      } catch {
        logger.warn(
          'device not accessible in removeDeviceConfig — skipping device cleanup',
        );
        return;
      }
      const certPem = TransparentProxy._caCert?.cert;

      if (isAndroid) {
        const deviceId = (device as { id?: string }).id || '';
        await removeAndroidProxy(deviceId);
        if (certPem) {
          await removeCACertAndroid(deviceId, certPem);
        }
      } else {
        await removeIOSProxy();
        if (certPem) {
          const simulatorId = (device as { id?: string }).id || 'booted';
          await removeCACertIOS(simulatorId, certPem);
        }
      }
    }
  }
}
