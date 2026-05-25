import type { SpeculosBleConfig, ButtonPress } from './types';
import { ControlApiClient } from './control-api';

export class SpeculosTestHelper {
  public readonly controlApi: ControlApiClient;
  private config: SpeculosBleConfig;

  constructor(config: Partial<SpeculosBleConfig> = {}) {
    this.config = {
      speculosHost: config.speculosHost ?? '127.0.0.1',
      speculosApduPort: config.speculosApduPort ?? 9999,
      speculosApiPort: config.speculosApiPort ?? 5000,
      controlApiPort: config.controlApiPort ?? 5002,
      deviceName: config.deviceName ?? 'Ledger Nano X',
    };
    this.controlApi = new ControlApiClient(this.config);
  }

  async start(): Promise<void> {
    await this.controlApi.waitForReady();
  }

  async pressButton(button: 'left' | 'right' | 'both', count = 1): Promise<void> {
    await this.controlApi.pressButton(button, count);
  }

  async takeScreenshot(): Promise<Uint8Array> {
    return this.controlApi.takeScreenshot();
  }

  async waitForSigningAndApprove(
    sequence?: ButtonPress[],
    timeoutMs = 60_000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const log = await this.controlApi.getApduLog();
      const hasSigningApdu = log.some(
        (e) => e.direction === 'in' && e.tag === 'apdu_complete',
      );
      if (hasSigningApdu) {
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    const presses = sequence ?? [
      { button: 'right' as const, count: 4 },
      { button: 'both' as const, count: 1 },
    ];

    for (const step of presses) {
      await this.pressButton(step.button, step.count ?? 1);
    }
  }

  async rejectSigning(): Promise<void> {
    await this.pressButton('both', 1);
  }

  async injectRejection(): Promise<void> {
    await this.controlApi.injectError('6985');
  }

  async isConnected(): Promise<boolean> {
    const state = await this.controlApi.getConnectionState();
    return state.has_connection;
  }

  async disconnectBle(): Promise<void> {
    await this.controlApi.disconnectBle();
  }
}
