import { EventEmitter } from 'events';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 5000;

export class SpeculosHttpTransport extends EventEmitter {
  private _opened = false;
  private host: string;
  private port: number;

  constructor(host = DEFAULT_HOST, port = DEFAULT_PORT) {
    super();
    this.host = host;
    this.port = port;
  }

  get isOpened(): boolean {
    return this._opened;
  }

  async exchange(apdu: Uint8Array): Promise<Uint8Array> {
    const hexApdu = Array.from(apdu, (b) => b.toString(16).padStart(2, '0')).join(
      '',
    );

    const resp = await fetch(
      `http://${this.host}:${this.port}/apdu`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: hexApdu }),
      },
    );

    if (!resp.ok) {
      throw new Error(`Speculos APDU exchange failed: HTTP ${resp.status}`);
    }

    const json = (await resp.json()) as { data: string };
    const hex = json.data;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  async close(): Promise<void> {
    this._opened = false;
    this.emit('disconnect');
  }

  setScrambleKey(_key: string): void {}

  open(): void {
    this._opened = true;
  }
}

export interface DeviceDescriptor {
  id: string;
  name: string;
}

export const SPECULOS_DEVICE_ID = 'speculos-virtual-ledger';
export const SPECULOS_DEVICE_NAME = 'Ledger Nano X';

export function emitFakeDevice(
  observer: { next?: (event: { type: string; descriptor: DeviceDescriptor }) => void },
  delayMs = 200,
): NodeJS.Timeout {
  return setTimeout(() => {
    observer.next?.({
      type: 'add',
      descriptor: { id: SPECULOS_DEVICE_ID, name: SPECULOS_DEVICE_NAME },
    });
  }, delayMs);
}
