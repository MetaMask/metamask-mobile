/* eslint-disable import/no-nodejs-modules */
import net from 'net';
import { createLogger } from './logger';
import {
  FALLBACK_FIXTURE_SERVER_PORT,
  FALLBACK_COMMAND_QUEUE_SERVER_PORT,
  FALLBACK_MOCKSERVER_PORT,
  FALLBACK_GANACHE_PORT,
  FALLBACK_DAPP_SERVER_PORT,
} from './Constants';
import { DEFAULT_ANVIL_PORT } from '../seeder/anvil-manager';

const logger = createLogger({
  name: 'PortManager',
});

export enum ResourceType {
  FIXTURE_SERVER = 'fixture-server',
  MOCK_SERVER = 'mock-server',
  COMMAND_QUEUE_SERVER = 'command-queue-server',
  DAPP_SERVER = 'dapp-server',
  GANACHE = 'ganache',
  ANVIL = 'anvil',
}

export interface AllocatedPort {
  port: number;
  resourceType: ResourceType;
  instanceId?: string;
  allocatedAt: Date;
}

/**
 * Maps ResourceType to fallback port.
 * These static ports are used on BrowserStack where dynamic port allocation
 * is not possible due to lack of adb access.
 *
 * @param resourceType - The type of resource
 * @returns The fallback port for the resource
 */
function getFallbackPortForResource(resourceType: ResourceType): number {
  switch (resourceType) {
    case ResourceType.FIXTURE_SERVER:
      return FALLBACK_FIXTURE_SERVER_PORT;
    case ResourceType.MOCK_SERVER:
      return FALLBACK_MOCKSERVER_PORT;
    case ResourceType.COMMAND_QUEUE_SERVER:
      return FALLBACK_COMMAND_QUEUE_SERVER_PORT;
    case ResourceType.GANACHE:
      return FALLBACK_GANACHE_PORT;
    case ResourceType.ANVIL:
      return DEFAULT_ANVIL_PORT;
    case ResourceType.DAPP_SERVER:
      return FALLBACK_DAPP_SERVER_PORT;
    default:
      throw new Error(`Unknown resource type: ${resourceType}`);
  }
}

export default class PortManager {
  private static instance: PortManager | null = null;

  private singleResourcePorts: Map<ResourceType, AllocatedPort> = new Map();
  private multiResourcePorts: Map<ResourceType, Map<string, AllocatedPort>> =
    new Map();

  private constructor() {
    logger.debug('PortManager singleton instance created');
  }

  /**
   * Determines if tests are running on BrowserStack with local tunnel enabled.
   * Protected to allow mocking in tests.
   *
   * @returns True when BrowserStack local tunnel is enabled
   */
  protected isBrowserStack(): boolean {
    return process.env.BROWSERSTACK_LOCAL?.toLowerCase() === 'true';
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
   * Allocates a port for a single-instance resource.
   * - On BrowserStack: Uses static fallback ports (no adb access for dynamic ports)
   * - Local development: Allocates a random port from the range (40000-60000)
   *
   * @param resourceType - Type of resource to allocate port for
   * @returns Allocated port information
   */
  public async allocatePort(
    resourceType: ResourceType,
  ): Promise<AllocatedPort> {
    logger.debug(`Allocating port for resource: ${resourceType}`);

    const existing = this.singleResourcePorts.get(resourceType);
    if (existing) {
      logger.debug(
        `Resource ${resourceType} already has port ${existing.port} allocated`,
      );
      return existing;
    }

    // On BrowserStack, use static fallback ports (no adb access for dynamic mapping)
    if (this.isBrowserStack()) {
      const fallbackPort = getFallbackPortForResource(resourceType);
      logger.info(
        `BrowserStack mode: Using static fallback port ${fallbackPort} for ${resourceType}`,
      );
      return this.createAndStoreAllocation(resourceType, fallbackPort);
    }

    // Local development: allocate dynamic port
    logger.debug(`Allocating random port for ${resourceType}`);
    const portToUse = await this.findNextAvailablePort();

    return this.createAndStoreAllocation(resourceType, portToUse);
  }

  /**
   * Allocates a port for a multi-instance resource (e.g., multiple dapp servers).
   * - On BrowserStack: Uses static fallback ports + instance offset
   * - Local development: Allocates a random port from the range (40000-60000)
   *
   * @param resourceType - Type of resource to allocate port for
   * @param instanceId - Unique identifier for this instance
   * @returns Allocated port information
   */
  public async allocateMultiInstancePort(
    resourceType: ResourceType,
    instanceId: string,
  ): Promise<AllocatedPort> {
    logger.debug(
      `Allocating port for multi-instance resource: ${resourceType}, instance: ${instanceId}`,
    );

    // Check if this instance already has a port
    const instanceMap = this.multiResourcePorts.get(resourceType);
    if (instanceMap) {
      const existing = instanceMap.get(instanceId);
      if (existing) {
        logger.debug(
          `Instance ${instanceId} of ${resourceType} already has port ${existing.port}`,
        );
        return existing;
      }
    }

    // On BrowserStack, use static fallback ports + instance offset
    if (this.isBrowserStack()) {
      const baseFallbackPort = getFallbackPortForResource(resourceType);
      // Extract instance number from instanceId (e.g., "dapp-server-0" -> 0)
      const instanceIndex = parseInt(instanceId.split('-').pop() || '0', 10);
      const portToUse = baseFallbackPort + instanceIndex;
      logger.info(
        `BrowserStack mode: Using static port ${portToUse} for ${resourceType}:${instanceId}`,
      );
      return this.createAndStoreMultiInstanceAllocation(
        resourceType,
        instanceId,
        portToUse,
      );
    }

    // Local development: allocate dynamic port
    logger.debug(
      `Allocating random port for multi-instance ${resourceType}:${instanceId}`,
    );
    const portToUse = await this.findNextAvailablePort();

    return this.createAndStoreMultiInstanceAllocation(
      resourceType,
      instanceId,
      portToUse,
    );
  }

  private createAndStoreAllocation(
    resourceType: ResourceType,
    port: number,
  ): AllocatedPort {
    const allocation: AllocatedPort = {
      port,
      resourceType,
      allocatedAt: new Date(),
    };
    this.singleResourcePorts.set(resourceType, allocation);
    logger.info(`✓ Port ${port} allocated for resource: ${resourceType}`);
    return allocation;
  }

  private createAndStoreMultiInstanceAllocation(
    resourceType: ResourceType,
    instanceId: string,
    port: number,
  ): AllocatedPort {
    const allocation: AllocatedPort = {
      port,
      resourceType,
      instanceId,
      allocatedAt: new Date(),
    };

    let instanceMap = this.multiResourcePorts.get(resourceType);
    if (!instanceMap) {
      instanceMap = new Map();
      this.multiResourcePorts.set(resourceType, instanceMap);
    }
    instanceMap.set(instanceId, allocation);

    logger.info(
      `✓ Port ${port} allocated for resource: ${resourceType}, instance: ${instanceId}`,
    );
    return allocation;
  }

  /**
   * Gets the port for a single-instance resource.
   *
   * @param resourceType - Type of resource
   * @returns Port number or undefined if not allocated
   */
  public getPort(resourceType: ResourceType): number | undefined {
    return this.singleResourcePorts.get(resourceType)?.port;
  }

  /**
   * Gets the port for a specific instance of a multi-instance resource.
   *
   * @param resourceType - Type of resource
   * @param instanceId - Instance identifier
   * @returns Port number or undefined if not allocated
   */
  public getMultiInstancePort(
    resourceType: ResourceType,
    instanceId: string,
  ): number | undefined {
    return this.multiResourcePorts.get(resourceType)?.get(instanceId)?.port;
  }

  /**
   * Gets all ports allocated for a multi-instance resource.
   *
   * @param resourceType - Type of resource
   * @returns Array of all allocations for this resource type
   */
  public getAllInstancePorts(resourceType: ResourceType): AllocatedPort[] {
    const instanceMap = this.multiResourcePorts.get(resourceType);
    if (!instanceMap) {
      return [];
    }
    return Array.from(instanceMap.values());
  }

  /**
   * Releases the port for a single-instance resource.
   *
   * @param resourceType - Type of resource to release
   */
  public releasePort(resourceType: ResourceType): void {
    const allocation = this.singleResourcePorts.get(resourceType);
    if (allocation) {
      logger.debug(
        `Releasing port ${allocation.port} (resource: ${resourceType})`,
      );
      this.singleResourcePorts.delete(resourceType);
    } else {
      logger.debug(
        `Attempted to release port for ${resourceType} but it was not allocated`,
      );
    }
  }

  /**
   * Releases the port for a specific instance of a multi-instance resource.
   *
   * @param resourceType - Type of resource
   * @param instanceId - Instance identifier
   */
  public releaseMultiInstancePort(
    resourceType: ResourceType,
    instanceId: string,
  ): void {
    const instanceMap = this.multiResourcePorts.get(resourceType);
    if (instanceMap) {
      const allocation = instanceMap.get(instanceId);
      if (allocation) {
        logger.debug(
          `Releasing port ${allocation.port} (resource: ${resourceType}, instance: ${instanceId})`,
        );
        instanceMap.delete(instanceId);
        if (instanceMap.size === 0) {
          this.multiResourcePorts.delete(resourceType);
        }
      } else {
        logger.debug(
          `Attempted to release port for ${resourceType}:${instanceId} but it was not allocated`,
        );
      }
    }
  }

  /**
   * Releases all ports for a multi-instance resource.
   *
   * @param resourceType - Type of resource
   */
  public releaseAllInstancesOf(resourceType: ResourceType): void {
    const instanceMap = this.multiResourcePorts.get(resourceType);
    if (instanceMap) {
      const count = instanceMap.size;
      logger.info(
        `Releasing all ${count} instance(s) of resource: ${resourceType}`,
      );
      this.multiResourcePorts.delete(resourceType);
    } else {
      logger.debug(`No instances of ${resourceType} to release`);
    }
  }

  /**
   * Releases all allocated ports.
   */
  public releaseAll(): void {
    const singleCount = this.singleResourcePorts.size;
    let multiCount = 0;
    this.multiResourcePorts.forEach((instanceMap) => {
      multiCount += instanceMap.size;
    });

    const totalCount = singleCount + multiCount;
    if (totalCount > 0) {
      logger.info(
        `Releasing all ${totalCount} allocated port(s) (${singleCount} single, ${multiCount} multi-instance)`,
      );
      this.singleResourcePorts.clear();
      this.multiResourcePorts.clear();
    } else {
      logger.debug('No ports to release');
    }
  }

  /**
   * Checks if a port is currently allocated by any resource.
   *
   * @param port - Port number to check
   * @returns True if port is allocated
   */
  public isPortAllocated(port: number): boolean {
    for (const allocation of this.singleResourcePorts.values()) {
      if (allocation.port === port) {
        return true;
      }
    }
    for (const instanceMap of this.multiResourcePorts.values()) {
      for (const allocation of instanceMap.values()) {
        if (allocation.port === port) {
          return true;
        }
      }
    }

    return false;
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
        server.close();
        resolve(true);
      });

      server.listen(port);
    });
  }

  /**
   * Finds the next available port in the specified range.
   * @param startPort - Start of port range (default: 32768)
   * @param maxPort - End of port range (default: 60999, giving 28,232 ports)
   * @param maxAttempts - Maximum number of ports to try (default: 100)
   * @returns Available port number
   * @throws Error if no available port is found after maxAttempts
   */
  private async findNextAvailablePort(
    startPort: number = 32768,
    maxPort: number = 60999,
    maxAttempts: number = 100,
  ): Promise<number> {
    const range = maxPort - startPort + 1;
    const randomOffset = Math.floor(Math.random() * range);
    let currentPort = startPort + randomOffset;

    let attempts = 0;

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
        currentPort = startPort;
      }

      attempts++;
    }

    const allocatedPorts: number[] = [];

    for (const allocation of this.singleResourcePorts.values()) {
      allocatedPorts.push(allocation.port);
    }

    // Collect all allocated ports from multi-instance resources
    for (const instanceMap of this.multiResourcePorts.values()) {
      for (const allocation of instanceMap.values()) {
        allocatedPorts.push(allocation.port);
      }
    }

    throw new Error(
      `Failed to find an available port after ${maxAttempts} attempts. ` +
        `Range: ${startPort}-${maxPort}. ` +
        `Currently allocated ports: ${allocatedPorts.length > 0 ? allocatedPorts.sort((a, b) => a - b).join(', ') : 'none'}`,
    );
  }
}
