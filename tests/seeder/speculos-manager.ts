/* eslint-disable import-x/no-nodejs-modules */
import { execSync, spawn } from 'child_process';
import { createLogger } from '../framework/logger.ts';
import { ServerStatus, Resource } from '../framework/types.ts';
import PortManager, { ResourceType } from '../framework/PortManager.ts';

const logger = createLogger({
  name: 'SpeculosManager',
});

const DEFAULT_SPECULOS_PORT = 5100;
const SPECULOS_DOCKER_IMAGE = 'ghcr.io/ledgerhq/speculos';
const CONTAINER_NAME_PREFIX = 'speculos-e2e';
const SPECULOS_ENTRYPOINT = '/speculos/speculos.py';
const DEFAULT_ELF_DIR = `${process.cwd()}/.speculos-cache/apps`;

export interface SpeculosManagerOptions {
  host?: string;
  port?: number;
  model?: string;
  appPath?: string;
  dockerImage?: string;
  elfDir?: string;
}

export const defaultSpeculosOptions: Required<SpeculosManagerOptions> = {
  host: '127.0.0.1',
  port: DEFAULT_SPECULOS_PORT,
  model: 'nanox',
  appPath: '/apps/ethereum-nanox.elf',
  dockerImage: SPECULOS_DOCKER_IMAGE,
  elfDir: DEFAULT_ELF_DIR,
};

class SpeculosManager implements Resource {
  private containerId: string | undefined;
  private allocatedPort: number | undefined;
  private options: Required<SpeculosManagerOptions>;
  serverStatus: ServerStatus = ServerStatus.STOPPED;

  constructor(opts: SpeculosManagerOptions = {}) {
    this.options = { ...defaultSpeculosOptions, ...opts };
  }

  setServerPort(port: number): void {
    this.allocatedPort = port;
  }

  async start(): Promise<void> {
    if (this.serverStatus === ServerStatus.STARTED) {
      logger.debug('Speculos already started');
      return;
    }

    const portManager = PortManager.getInstance();
    const allocation = await portManager.allocatePort(ResourceType.SPECULOS);
    this.allocatedPort = allocation.port;

    if (!this.allocatedPort) {
      throw new Error('Failed to allocate port for Speculos');
    }

    const containerName = `${CONTAINER_NAME_PREFIX}-${this.allocatedPort}`;

    this.removeExistingContainer(containerName);

    const port = this.allocatedPort;
    logger.debug(`Starting Speculos Docker container on port ${port}...`);

    const args = [
      'run',
      '-d',
      '--rm',
      '--name',
      containerName,
      '-p',
      `${this.allocatedPort}:5000`,
      '-v',
      `${this.options.elfDir}:/apps:ro`,
      '--entrypoint',
      SPECULOS_ENTRYPOINT,
      this.options.dockerImage,
      '--model',
      this.options.model,
      '--display',
      'headless',
      this.options.appPath,
    ];

    const child = spawn('docker', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const containerId = await new Promise<string>((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      child.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim());
        } else {
          reject(
            new Error(`docker run failed (exit ${code}): ${stderr || stdout}`),
          );
        }
      });
      child.on('error', (err) => reject(err));
    });

    this.containerId = containerId;
    logger.debug(`Container started: ${containerId.substring(0, 12)}`);

    await this.waitForReady();

    this.serverStatus = ServerStatus.STARTED;
    logger.debug(`Speculos ready on port ${this.allocatedPort}`);
  }

  async stop(): Promise<void> {
    if (this.serverStatus !== ServerStatus.STARTED) {
      logger.debug('Speculos not running');
      this.serverStatus = ServerStatus.STOPPED;
      return;
    }

    try {
      this.removeAdbReverse();

      if (this.containerId) {
        const containerName = `${CONTAINER_NAME_PREFIX}-${this.allocatedPort}`;
        logger.debug(`Stopping container ${containerName}...`);
        try {
          execSync(`docker stop ${containerName} 2>/dev/null`, {
            timeout: 10000,
            stdio: 'ignore',
          });
        } catch {
          try {
            execSync(`docker kill ${containerName} 2>/dev/null`, {
              timeout: 5000,
              stdio: 'ignore',
            });
          } catch {
            // Best effort
          }
        }
        this.containerId = undefined;
      }

      if (this.allocatedPort !== undefined) {
        PortManager.getInstance().releasePort(ResourceType.SPECULOS);
      }
    } catch (e) {
      logger.error(`Error stopping Speculos: ${e}`);
    } finally {
      this.serverStatus = ServerStatus.STOPPED;
      this.allocatedPort = undefined;
    }
  }

  isStarted(): boolean {
    return this.serverStatus === ServerStatus.STARTED;
  }

  getServerPort(): number {
    return this.allocatedPort ?? 0;
  }

  getServerStatus(): ServerStatus {
    return this.serverStatus;
  }

  getPort(): number | undefined {
    return this.allocatedPort;
  }

  getHost(): string {
    return this.options.host;
  }

  private removeExistingContainer(name: string): void {
    try {
      execSync(`docker rm -f ${name} 2>/dev/null`, { stdio: 'ignore' });
    } catch {
      // Container doesn't exist, that's fine
    }
  }

  private async waitForReady(maxRetries = 30, delayMs = 2000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const resp = await fetch(
          `http://${this.options.host}:${this.allocatedPort}/apdu`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: 'B001000000' }),
            signal: controller.signal,
          },
        );
        clearTimeout(timeout);
        if (resp.ok) return;
      } catch {
        // Not ready yet
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error(
      `Speculos not ready after ${maxRetries} retries on port ${this.allocatedPort}`,
    );
  }

  public setupAdbReverse(): void {
    if (!this.allocatedPort) return;
    try {
      execSync(`adb reverse tcp:5000 tcp:${this.allocatedPort}`, {
        stdio: 'ignore',
      });
      logger.debug(`adb reverse: emulator:5000 -> host:${this.allocatedPort}`);
    } catch (e) {
      logger.debug(`adb reverse failed (non-fatal): ${e}`);
    }
  }

  private removeAdbReverse(): void {
    try {
      execSync('adb reverse --remove tcp:5000', { stdio: 'ignore' });
    } catch {
      // Best effort
    }
  }
}

export { SpeculosManager };
