import type { ChainCapability } from '@metamask/client-mcp-core';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';
import PortManager, {
  ResourceType,
} from '../../../tests/framework/PortManager';

/**
 * MetaMask Mobile chain capability - thin wrapper over AnvilManager.
 * Implements ChainCapability interface for MCP integration.
 */
export class MetaMaskMobileChainCapability implements ChainCapability {
  private anvilManager: AnvilManager;
  private port: number;

  constructor() {
    this.anvilManager = new AnvilManager();
    this.port = 8545; // Default port, will be overridden by PortManager
  }

  /**
   * Start the Anvil blockchain node.
   * Allocates a port via PortManager and starts AnvilManager.
   */
  async start(): Promise<void> {
    // Allocate port via PortManager
    const allocation = await PortManager.getInstance().allocatePort(
      ResourceType.ANVIL,
    );
    this.port = allocation.port;

    // Configure AnvilManager with allocated port
    this.anvilManager.setServerPort(this.port);

    // Start Anvil with default options (chainId 1337)
    await this.anvilManager.start({
      chainId: 1337,
    });
  }

  /**
   * Stop the Anvil blockchain node.
   * Stops AnvilManager and releases the port.
   */
  async stop(): Promise<void> {
    await this.anvilManager.stop();
  }

  /**
   * Check if the Anvil node is running.
   */
  isRunning(): boolean {
    return this.anvilManager.isStarted();
  }

  /**
   * Set the port for the Anvil node.
   * Must be called before start().
   */
  setPort(port: number): void {
    this.port = port;
    this.anvilManager.setServerPort(port);
  }

  /**
   * Get the underlying AnvilManager instance.
   * Used by ContractSeedingCapability to access the provider.
   */
  getAnvilManager(): AnvilManager {
    return this.anvilManager;
  }
}
