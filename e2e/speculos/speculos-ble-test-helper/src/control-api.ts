import type { SpeculosBleConfig, ControlApiHealthResponse, ApduLogEntry, ButtonPress } from './types';

export class ControlApiClient {
  private baseUrl: string;

  constructor(config: SpeculosBleConfig) {
    this.baseUrl = `http://${config.speculosHost}:${config.controlApiPort ?? 5002}`;
  }

  async health(): Promise<ControlApiHealthResponse> {
    const resp = await fetch(`${this.baseUrl}/health`);
    if (!resp.ok) throw new Error(`Control API health check failed: ${resp.status}`);
    return resp.json();
  }

  async waitForReady(maxRetries = 30, delayMs = 2000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const health = await this.health();
        if (health.status === 'ready') return;
      } catch {
        // Not ready yet
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error('Control API did not become ready in time');
  }

  async pressButton(button: 'left' | 'right' | 'both', count = 1): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/button/press`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ button, count }),
    });
    if (!resp.ok) throw new Error(`Button press failed: ${resp.status}`);
  }

  async takeScreenshot(): Promise<Uint8Array> {
    const resp = await fetch(`${this.baseUrl}/screenshot`);
    if (!resp.ok) throw new Error(`Screenshot failed: ${resp.status}`);
    const arrayBuffer = await resp.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  async enableBlindSigning(): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/blind-signing/enable`, {
      method: 'POST',
    });
    if (!resp.ok) throw new Error(`Blind signing enable failed: ${resp.status}`);
  }

  async getConnectionState(): Promise<{ state: string; has_connection: boolean }> {
    const resp = await fetch(`${this.baseUrl}/ble/connection`);
    if (!resp.ok) throw new Error(`Connection state check failed: ${resp.status}`);
    return resp.json();
  }

  async disconnectBle(): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/ble/disconnect`, {
      method: 'POST',
    });
    if (!resp.ok) throw new Error(`BLE disconnect failed: ${resp.status}`);
  }

  async injectError(responseHex: string): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/error/inject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: responseHex }),
    });
    if (!resp.ok) throw new Error(`Error injection failed: ${resp.status}`);
  }

  async getApduLog(): Promise<ApduLogEntry[]> {
    const resp = await fetch(`${this.baseUrl}/debug/apdu-log`);
    if (!resp.ok) throw new Error(`APDU log fetch failed: ${resp.status}`);
    return resp.json();
  }

  async autoApproveSigning(sequence?: ButtonPress[]): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/signing/auto-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presses: sequence ?? [
          { button: 'right', count: 4 },
          { button: 'both', count: 1 },
        ],
      }),
    });
    if (!resp.ok) throw new Error(`Auto-approve failed: ${resp.status}`);
  }
}
