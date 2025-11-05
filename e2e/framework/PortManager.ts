/* eslint-disable import/no-nodejs-modules */
import net from 'net';
import { createLogger } from './logger';
import {
  DEFAULT_FIXTURE_SERVER_PORT,
  DEFAULT_MOCKSERVER_PORT,
  DEFAULT_DAPP_SERVER_PORT,
  DEFAULT_COMMAND_QUEUE_SERVER_PORT,
} from './Constants';
import { DEFAULT_GANACHE_PORT } from '../../app/util/test/ganache';
import { DEFAULT_ANVIL_PORT } from '../seeder/anvil-manager';

const logger = createLogger({
  name: 'PortManager',
});

export enum ResourceId {
  FIXTURE_SERVER = 'fixture-server',
  MOCK_SERVER = 'mock-server',
  COMMAND_QUEUE_SERVER = 'command-queue-server',
  DAPP_SERVER = 'dapp-server',
  DAPP_SERVER_1 = 'dapp-server-1',
  GANACHE = 'ganache',
  ANVIL = 'anvil',
}

export interface PortRequest {
  resourceId: ResourceId | string;
  preferredPort?: number;
  minPort?: number;
  maxPort?: number;
  maxAttempts?: number;
}

export interface AllocatedPort {
  port: number;
  resourceId: ResourceId | string;
  allocatedAt: Date;
}

export default class PortManager {
  private static instance: PortManager | null = null;

  private allocatedPorts: Map<number, AllocatedPort> = new Map();

  private resourceToPort: Map<string, number> = new Map();

  private static readonly DEFAULT_PORTS: Record<ResourceId, number> = {
    [ResourceId.FIXTURE_SERVER]: DEFAULT_FIXTURE_SERVER_PORT,
    [ResourceId.MOCK_SERVER]: DEFAULT_MOCKSERVER_PORT,
    [ResourceId.COMMAND_QUEUE_SERVER]: DEFAULT_COMMAND_QUEUE_SERVER_PORT,
    [ResourceId.DAPP_SERVER]: DEFAULT_DAPP_SERVER_PORT,
    [ResourceId.DAPP_SERVER_1]: DEFAULT_DAPP_SERVER_PORT + 1,
    [ResourceId.GANACHE]: DEFAULT_GANACHE_PORT,
    [ResourceId.ANVIL]: DEFAULT_ANVIL_PORT,
  };

  private constructor() {
    logger.debug('PortManager singleton instance created');
  }

  public static getInstance(): PortManager {
    if (!PortManager.instance) {
      PortManager.instance = new PortManager();
    }
    return PortManager.instance;
  }

  public static resetInstance(): void {
    if (PortManager.instance) {
      PortManager.instance.releaseAll();
      PortManager.instance = null;
      logger.debug('PortManager instance reset');
    }
  }

  /**
   * Gets an available port for a resource.
   * Returns the preferred port if available, otherwise finds the next available port.
   * On BrowserStack, always returns the static default port.
   *
   * @param request - Port request parameters
   * @returns Available port number
   */
  public async getAvailablePort(request: PortRequest): Promise<number> {
    const {
      resourceId,
      preferredPort,
      maxPort = 60000,
      maxAttempts = 100,
    } = request;

    logger.debug(`Getting available port for resource: ${resourceId}`);

    const existingPort = this.resourceToPort.get(resourceId);
    if (existingPort) {
      logger.debug(
        `Resource ${resourceId} already has port ${existingPort} allocated`,
      );
      return existingPort;
    }

    // On BrowserStack, use static ports
    if (this.isBrowserStack()) {
      const staticPort = PortManager.DEFAULT_PORTS[resourceId as ResourceId];
      logger.debug(
        `BrowserStack detected - using static port ${staticPort} for ${resourceId}`,
      );
      this.allocatePortForResource(staticPort, resourceId);
      return staticPort;
    }

    // Determine preferred port
    const defaultPort =
      preferredPort ?? PortManager.DEFAULT_PORTS[resourceId as ResourceId];

    // If no default port is available, find any available port
    if (defaultPort === undefined) {
      logger.debug(`No default port for ${resourceId}, finding available port`);
      const portToUse = await this.findNextAvailablePort(
        30000,
        maxPort,
        maxAttempts,
      );
      this.allocatePortForResource(portToUse, resourceId);
      logger.info(`✓ Port ${portToUse} allocated for resource: ${resourceId}`);
      return portToUse;
    }

    // Check if preferred port is available
    let portToUse: number;
    if (
      this.isPortAllocated(defaultPort) ||
      !(await this.isPortAvailable(defaultPort))
    ) {
      logger.debug(
        `Port ${defaultPort} not available, finding next available port`,
      );
      portToUse = await this.findNextAvailablePort(
        defaultPort + 1,
        maxPort,
        maxAttempts,
      );
    } else {
      logger.debug(`Port ${defaultPort} is available for ${resourceId}`);
      portToUse = defaultPort;
    }

    this.allocatePortForResource(portToUse, resourceId);
    logger.info(`✓ Port ${portToUse} allocated for resource: ${resourceId}`);
    return portToUse;
  }

  private allocatePortForResource(port: number, resourceId: string): void {
    const allocation: AllocatedPort = {
      port,
      resourceId,
      allocatedAt: new Date(),
    };
    this.allocatedPorts.set(port, allocation);
    this.resourceToPort.set(resourceId, port);
  }

  public releasePort(port: number): void {
    const allocation = this.allocatedPorts.get(port);
    if (allocation) {
      logger.debug(
        `Releasing port ${port} (resource: ${allocation.resourceId})`,
      );
      this.allocatedPorts.delete(port);
      this.resourceToPort.delete(allocation.resourceId);
    } else {
      logger.debug(
        `Attempted to release port ${port} but it was not allocated`,
      );
    }
  }

  public releaseAll(): void {
    const count = this.allocatedPorts.size;
    if (count > 0) {
      logger.info(`Releasing all ${count} allocated port(s)`);
      this.allocatedPorts.clear();
      this.resourceToPort.clear();
    } else {
      logger.debug('No ports to release');
    }
  }

  public isPortAllocated(port: number): boolean {
    return this.allocatedPorts.has(port);
  }

  public getPortForResource(resourceId: string): number | undefined {
    return this.resourceToPort.get(resourceId);
  }

  private isBrowserStack(): boolean {
    return process.env.BROWSERSTACK_LOCAL?.toLowerCase() === 'true';
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          logger.debug(`Error checking port ${port}: ${err.message}`);
          resolve(false);
        }
      });

      server.once('listening', () => {
        // Keep the server open briefly to hold the port while the resource binds
        // This reduces the race condition window
        setTimeout(() => {
          server.close();
          resolve(true);
        }, 100);
      });

      server.listen(port);
    });
  }

  private async findNextAvailablePort(
    startPort: number,
    maxPort: number = 60000,
    maxAttempts: number = 100,
  ): Promise<number> {
    let attempts = 0;
    let currentPort = startPort;

    while (attempts < maxAttempts) {
      if (!this.isPortAllocated(currentPort)) {
        if (await this.isPortAvailable(currentPort)) {
          logger.debug(
            `Found available port ${currentPort} after ${attempts + 1} attempt(s)`,
          );
          return currentPort;
        }
      }

      currentPort++;
      if (currentPort > maxPort) {
        currentPort = 30000;
      }
      attempts++;
    }

    throw new Error(
      `Failed to find an available port after ${maxAttempts} attempts (started from ${startPort})`,
    );
  }
}
