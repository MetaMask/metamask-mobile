import { ControlApiClient } from '../speculos-ble-test-helper/src/control-api';
import type { SpeculosBleConfig } from '../speculos-ble-test-helper/src/types';

const mockConfig: SpeculosBleConfig = {
  speculosHost: 'localhost',
  speculosApduPort: 5000,
  speculosApiPort: 5001,
  controlApiPort: 5002,
};

function mockFetchResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    arrayBuffer: async () => {
      const hex = (body as { data: string }).data ?? '';
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
      }
      return bytes.buffer;
    },
  } as unknown as Response;
}

describe('ControlApiClient', () => {
  let client: ControlApiClient;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    client = new ControlApiClient(mockConfig);
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('health() calls correct URL and returns response', async () => {
    const healthResponse = {
      status: 'ready',
      ble_state: 'idle' as const,
      speculos_connected: true,
    };
    fetchSpy.mockResolvedValue(mockFetchResponse(healthResponse));

    const result = await client.health();

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:5002/health');
    expect(result).toEqual(healthResponse);
  });

  it('pressButton() sends correct JSON body', async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse({}));

    await client.pressButton('right', 3);

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:5002/button/press', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ button: 'right', count: 3 }),
    });
  });

  it('injectError() sends correct hex', async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse({}));

    await client.injectError('6985');

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:5002/error/inject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: '6985' }),
    });
  });

  it('takeScreenshot() returns Uint8Array', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    fetchSpy.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => pngBytes.buffer,
    } as Response);

    const result = await client.takeScreenshot();

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:5002/screenshot');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(Array.from(result)).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it('getConnectionState() parses response', async () => {
    const stateResponse = { state: 'connected', has_connection: true };
    fetchSpy.mockResolvedValue(mockFetchResponse(stateResponse));

    const result = await client.getConnectionState();

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:5002/ble/connection');
    expect(result).toEqual({ state: 'connected', has_connection: true });
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse({}, false, 503));

    await expect(client.health()).rejects.toThrow(
      'Control API health check failed: 503',
    );
  });

  it('uses default controlApiPort 5002 when not specified', () => {
    const configWithoutPort: SpeculosBleConfig = {
      speculosHost: 'myhost',
      speculosApduPort: 5000,
      speculosApiPort: 5001,
    };
    const defaultClient = new ControlApiClient(configWithoutPort);

    fetchSpy.mockResolvedValue(mockFetchResponse({ status: 'ok' }));
    defaultClient.health();

    expect(fetchSpy).toHaveBeenCalledWith('http://myhost:5002/health');
  });
});
