import { createLogger } from './logger';

/**
 * PortAllocator - A singleton class for managing port allocation
 * Keeps track of which resources are using which ports and ensures no port conflicts
 * This prevents a test from failing because of port conflicts when the previous test crashed without proper cleanup
 */
export class PortAllocator {
  private static instance: PortAllocator;
  private portMap: Map<string, number> = new Map();
  private usedPorts: Set<number> = new Set();
  private MIN_PORT = 8000;
  private MAX_PORT = 9000;
  private readonly PORT_RANGE_SIZE = 1000;
  private readonly RESERVED_PORTS: number[] = [8080, 8546];

  private logger = createLogger({
    name: 'PortAllocator',
  });

  private constructor() {
    this.initializePortRange();
    this.logger.debug(
      `Port range initialized: ${this.MIN_PORT}-${this.MAX_PORT}`,
    );
  }

  /**
   * Initialize the port range based on environment
   * In CI, use worker PID to calculate a unique port range
   * Otherwise, use default port range
   * @param forceCI Optional parameter to force CI mode (for testing)
   */
  private initializePortRange(forceCI?: boolean): void {
    const isCI = forceCI || process.env.CI === 'true';
    const MAX_VALID_PORT = 65535;

    if (isCI) {
      const pid = process.pid;
      // Use PID to create a unique base port (keep within valid port range 1024-65535)
      const pidOffset = (pid % 50) * this.PORT_RANGE_SIZE; // Reduced from 100 to 50 to ensure we stay within limits
      this.MIN_PORT = 10000 + pidOffset;

      const calculatedMax = this.MIN_PORT + this.PORT_RANGE_SIZE - 1;
      this.MAX_PORT = Math.min(calculatedMax, MAX_VALID_PORT);

      if (this.MAX_PORT < calculatedMax) {
        const desiredMin = Math.max(
          1024,
          this.MAX_PORT - this.PORT_RANGE_SIZE + 1,
        );
        this.MIN_PORT = desiredMin;
        this.logger.debug(
          `Adjusted port range to maintain size: ${this.MIN_PORT}-${this.MAX_PORT}`,
        );
      }

      this.logger.debug(
        `CI environment detected. Using PID ${pid} to calculate port range: ${this.MIN_PORT}-${this.MAX_PORT}`,
      );
    } else {
      this.MIN_PORT = 8000;
      this.MAX_PORT = 9000;
    }
  }

  /**
   * Get the singleton instance of PortAllocator
   */
  public static getInstance(): PortAllocator {
    if (!PortAllocator.instance) {
      PortAllocator.instance = new PortAllocator();
    }
    return PortAllocator.instance;
  }

  /**
   * Allocate a port for a specific resource
   * @param resourceId Unique identifier for the resource requesting a port
   * @param preferredPort Optional preferred port to use if available
   * @returns The allocated port number
   */
  public allocatePort(resourceId: string, preferredPort?: number): number {
    if (this.portMap.has(resourceId)) {
      return this.portMap.get(resourceId) as number;
    }

    if (preferredPort && this.isPortAvailable(preferredPort)) {
      this.assignPort(resourceId, preferredPort);
      return preferredPort;
    }

    const port = this.findAvailablePort();
    if (port === -1) {
      throw new Error('No available ports in the specified range');
    }

    this.assignPort(resourceId, port);
    return port;
  }

  /**
   * Release a port allocated to a specific resource
   * @param resourceId Unique identifier for the resource
   * @returns true if port was released, false if resource had no allocated port
   */
  public releasePort(resourceId: string): boolean {
    const port = this.portMap.get(resourceId);
    if (port === undefined) {
      return false;
    }

    this.usedPorts.delete(port);
    this.portMap.delete(resourceId);
    return true;
  }

  /**
   * Get the port allocated to a specific resource
   * @param resourceId Unique identifier for the resource
   * @returns The allocated port or undefined if none allocated
   */
  public getPort(resourceId: string): number | undefined {
    return this.portMap.get(resourceId);
  }

  /**
   * Get all allocated ports and their resources
   * @returns A copy of the port map
   */
  public getAllocatedPorts(): Map<string, number> {
    return new Map(this.portMap);
  }

  /**
   * Check if a specific port is available
   * @param port Port number to check
   * @returns true if port is available, false otherwise
   */
  private isPortAvailable(port: number): boolean {
    if (port < this.MIN_PORT || port > this.MAX_PORT) {
      return false;
    }

    if (this.RESERVED_PORTS.includes(port)) {
      return false;
    }

    return !this.usedPorts.has(port);
  }

  /**
   * Find an available port in the allowed range
   * @returns An available port number or -1 if none available
   */
  private findAvailablePort(): number {
    for (let port = this.MIN_PORT; port <= this.MAX_PORT; port++) {
      if (this.isPortAvailable(port)) {
        return port;
      }
    }
    return -1;
  }

  /**
   * Assign a port to a resource
   * @param resourceId Unique identifier for the resource
   * @param port Port number to assign
   */
  private assignPort(resourceId: string, port: number): void {
    this.portMap.set(resourceId, port);
    this.usedPorts.add(port);
  }

  /**
   * Reset the port allocator (mainly for testing purposes)
   */
  public reset(): void {
    this.portMap.clear();
    this.usedPorts.clear();
  }

  /**
   * Reinitialize the port range with specific settings
   * This is primarily used for testing
   * @param forceCI Force CI mode for port range calculation
   */
  public reinitializePortRange(forceCI: boolean = false): void {
    this.initializePortRange(forceCI);
    this.logger.debug(
      `Port range reinitialized: ${this.MIN_PORT}-${this.MAX_PORT}`,
    );
  }

  /**
   * Get the current port range
   * @returns Object containing min and max port values
   */
  public getPortRange(): { min: number; max: number } {
    return {
      min: this.MIN_PORT,
      max: this.MAX_PORT,
    };
  }
}

export default PortAllocator.getInstance();
