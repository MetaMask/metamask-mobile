import type { MockServerCapability } from '@metamask/client-mcp-core';
import type { Mockttp } from 'mockttp';
import type MockServerE2E from '../../../tests/api-mocking/MockServerE2E';

export interface MockServerCapabilityOptions {
  port: number;
}

/**
 * MetaMask Mobile mock server capability - thin wrapper over MockServerE2E.
 */
export class MetaMaskMobileMockServerCapability
  implements MockServerCapability
{
  private mockServer: MockServerE2E | undefined;

  private running = false;

  private port: number;

  constructor(options: MockServerCapabilityOptions) {
    this.port = options.port;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    const { default: MockServerE2EConstructor } = await import(
      '../../../tests/api-mocking/MockServerE2E'
    );
    const server = new MockServerE2EConstructor({ events: {} });
    server.setServerPort(this.port);

    await server.start();

    this.mockServer = server;
    this.running = true;
  }

  async stop(): Promise<void> {
    if (!this.mockServer) {
      return;
    }

    await this.mockServer.stop();
    this.mockServer = undefined;
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  getServer(): Mockttp {
    if (!this.mockServer) {
      throw new Error('Mock server not started. Call start() first.');
    }

    return this.mockServer.server;
  }

  getPort(): number {
    return this.port;
  }
}
