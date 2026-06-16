import type { ChainCapability } from '@metamask/client-mcp-core';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';
import { appendLog } from '../utils';

export interface ChainCapabilityOptions {
  port: number;
  chainId?: number;
}

export class MetaMaskMobileChainCapability implements ChainCapability {
  private anvilManager: AnvilManager | undefined;

  private port: number;

  private chainId: number;

  private started = false;

  constructor(options: ChainCapabilityOptions) {
    this.port = options.port;
    this.chainId = options.chainId ?? 1337;
  }

  async start(): Promise<void> {
    appendLog('getOrCreateAnvilManager');
    const anvilManager = await this.getOrCreateAnvilManager();

    appendLog('anvilManager.setServerPort');
    anvilManager.setServerPort(this.port);
    appendLog('anvilManager.start');
    await anvilManager.start({ chainId: this.chainId });

    appendLog('anvilManager started');
    this.started = true;
  }

  async stop(): Promise<void> {
    if (this.started) {
      await this.anvilManager?.stop();
      this.started = false;
    }
  }

  isRunning(): boolean {
    return this.started && (this.anvilManager?.isStarted() ?? false);
  }

  setPort(port: number): void {
    this.port = port;
    this.anvilManager?.setServerPort(port);
  }

  getAnvilManager(): AnvilManager {
    if (!this.anvilManager) {
      throw new Error('Anvil manager not initialized. Call start() first.');
    }
    return this.anvilManager;
  }

  private async getOrCreateAnvilManager(): Promise<AnvilManager> {
    if (!this.anvilManager) {
      this.anvilManager = new AnvilManager();
    }

    return this.anvilManager;
  }
}
