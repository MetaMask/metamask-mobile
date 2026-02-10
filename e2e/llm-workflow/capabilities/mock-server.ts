import type { MockServerCapability } from '@metamask/client-mcp-core';
import type { Mockttp } from 'mockttp';
import MockServerE2E from '../../../tests/api-mocking/MockServerE2E';
import PortManager, {
  ResourceType,
} from '../../../tests/framework/PortManager';

/**
 * MetaMask Mobile mock server capability - thin wrapper over MockServerE2E infrastructure.
 * Provides mock server functionality for E2E tests using the existing MockServerE2E implementation.
 */
export class MetaMaskMobileMockServerCapability
  implements MockServerCapability
{
  private mockServer: MockServerE2E | null = null;
  private running = false;

  /**
   * Starts the mock server with allocated port from PortManager.
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    // Allocate port using PortManager
    const portManager = PortManager.getInstance();
    const allocation = await portManager.allocatePort(ResourceType.MOCK_SERVER);

    // Create MockServerE2E instance with empty events (no default mocks)
    this.mockServer = new MockServerE2E({
      events: {},
    });

    // Set the allocated port
    this.mockServer.setServerPort(allocation.port);

    // Start the server
    await this.mockServer.start();

    this.running = true;
  }

  /**
   * Stops the mock server and releases the allocated port.
   */
  async stop(): Promise<void> {
    if (!this.mockServer) {
      return;
    }

    await this.mockServer.stop();
    this.mockServer = null;
    this.running = false;
  }

  /**
   * Returns whether the mock server is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Returns the underlying Mockttp server instance.
   * @throws Error if server is not started
   */
  getServer(): Mockttp {
    if (!this.mockServer) {
      throw new Error('Mock server not started. Call start() first.');
    }

    return this.mockServer.server;
  }

  /**
   * Returns the port number the mock server is running on.
   * @throws Error if server is not started
   */
  getPort(): number {
    if (!this.mockServer) {
      throw new Error('Mock server not started. Call start() first.');
    }

    return this.mockServer.getServerPort();
  }
}
