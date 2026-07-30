import {
  fetchDiscoveryTargets,
  selectHermesTarget,
  type HermesTarget,
} from '@metamask/device-mcp';

import { probeHermesHealthy, verifyJsLiveness } from '../ios/hermes-health';

jest.mock('@metamask/device-mcp', () => ({
  fetchDiscoveryTargets: jest.fn(),
  selectHermesTarget: jest.fn(),
}));

const mockFetchDiscoveryTargets = jest.mocked(fetchDiscoveryTargets);
const mockSelectHermesTarget = jest.mocked(selectHermesTarget);

const healthyTarget: HermesTarget = {
  id: 'target-1',
  title: 'Hermes React Native',
  appId: 'io.metamask.MetaMask',
  webSocketDebuggerUrl: 'ws://localhost:8081/inspector/page/1',
  reactNative: { logicalDeviceId: 'SIM-UDID' },
};

const unhealthySelection = {
  ok: false as const,
  code: 'HERMES_TARGET_NOT_FOUND',
  message: 'No Hermes debug target found',
};

describe('hermes-health', () => {
  let stderrSpy: jest.SpyInstance;

  afterEach(() => {
    stderrSpy?.mockRestore();
    jest.useRealTimers();
  });

  describe('probeHermesHealthy', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
      stderrSpy = jest
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true);
      mockSelectHermesTarget.mockReturnValue(unhealthySelection);
    });

    it('returns healthy when a matching target is found on first poll', async () => {
      mockFetchDiscoveryTargets.mockResolvedValue([healthyTarget]);
      mockSelectHermesTarget.mockReturnValue({
        ok: true,
        target: healthyTarget,
      });

      const result = await probeHermesHealthy({
        port: 8081,
        appId: 'io.metamask.MetaMask',
        intervalMs: 10,
        ceilingMs: 1_000,
      });

      expect(result.healthy).toBe(true);
      expect(result.target).toEqual(healthyTarget);
      expect(result.pinnedDeviceId).toBe('SIM-UDID');
    });

    it('returns unhealthy when target is not found (release build with empty /json)', async () => {
      mockFetchDiscoveryTargets.mockResolvedValue([]);
      mockSelectHermesTarget.mockReturnValue({
        ok: false,
        code: 'HERMES_TARGET_NOT_FOUND',
        message: 'No Hermes debug target found',
      });

      const promise = probeHermesHealthy({
        port: 8081,
        appId: 'io.metamask.MetaMask',
        intervalMs: 10,
        ceilingMs: 50,
      });

      await jest.advanceTimersByTimeAsync(60);
      const result = await promise;

      expect(result.healthy).toBe(false);
      expect(result.reason).toBe('HERMES_TARGET_NOT_FOUND');
    });

    it('returns unhealthy when multiple devices are ambiguous', async () => {
      mockFetchDiscoveryTargets.mockResolvedValue([healthyTarget]);
      mockSelectHermesTarget.mockReturnValue({
        ok: false,
        code: 'HERMES_MULTIPLE_DEVICES',
        message: 'Ambiguous Hermes target',
      });

      const promise = probeHermesHealthy({
        port: 8081,
        appId: 'io.metamask.MetaMask',
        intervalMs: 10,
        ceilingMs: 50,
      });

      await jest.advanceTimersByTimeAsync(60);
      const result = await promise;

      expect(result.healthy).toBe(false);
      expect(result.reason).toBe('HERMES_MULTIPLE_DEVICES');
    });

    it('retries until a target appears after initial failure', async () => {
      mockFetchDiscoveryTargets
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValueOnce([healthyTarget]);
      mockSelectHermesTarget.mockReturnValue({
        ok: true,
        target: healthyTarget,
      });

      const promise = probeHermesHealthy({
        port: 8081,
        appId: 'io.metamask.MetaMask',
        intervalMs: 10,
        ceilingMs: 2_000,
      });

      await jest.advanceTimersByTimeAsync(20);
      const result = await promise;

      expect(result.healthy).toBe(true);
      expect(mockFetchDiscoveryTargets).toHaveBeenCalledTimes(2);
    });

    it('returns unhealthy when fetchDiscoveryTargets throws persistently', async () => {
      mockFetchDiscoveryTargets.mockRejectedValue(new Error('ECONNREFUSED'));

      const promise = probeHermesHealthy({
        port: 8081,
        appId: 'io.metamask.MetaMask',
        intervalMs: 10,
        ceilingMs: 50,
      });

      await jest.advanceTimersByTimeAsync(60);
      const result = await promise;

      expect(result.healthy).toBe(false);
      expect(result.reason).toContain('ECONNREFUSED');
    });
  });

  describe('verifyJsLiveness', () => {
    let originalWebSocket: typeof globalThis.WebSocket | undefined;

    beforeEach(() => {
      jest.clearAllMocks();
      jest.useRealTimers();
      stderrSpy = jest
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true);
      originalWebSocket = globalThis.WebSocket;
    });

    afterEach(() => {
      if (originalWebSocket === undefined) {
        delete (globalThis as Partial<typeof globalThis>).WebSocket;
      } else {
        globalThis.WebSocket = originalWebSocket;
      }
    });

    it('returns false when global WebSocket is unavailable (Node 20 without --experimental-websocket)', async () => {
      delete (globalThis as Partial<typeof globalThis>).WebSocket;

      const result = await verifyJsLiveness(
        'ws://localhost:8081/inspector/page/1',
        1_000,
      );

      expect(result).toBe(false);
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('global WebSocket unavailable'),
      );
    });

    it('returns true when a CDP Runtime.evaluate result arrives', async () => {
      const mockWs = createMockWebSocket();
      globalThis.WebSocket = mockWs.constructor as unknown as typeof WebSocket;

      const promise = verifyJsLiveness(
        'ws://localhost:8081/inspector/page/1',
        2_000,
      );

      mockWs.simulateOpen();
      mockWs.simulateMessage(JSON.stringify({ id: 1, result: { value: 2 } }));

      await expect(promise).resolves.toBe(true);
    });

    it('returns false on timeout when no CDP response arrives', async () => {
      const mockWs = createMockWebSocket();
      globalThis.WebSocket = mockWs.constructor as unknown as typeof WebSocket;

      const promise = verifyJsLiveness(
        'ws://localhost:8081/inspector/page/1',
        50,
      );

      mockWs.simulateOpen();

      await expect(promise).resolves.toBe(false);
    });

    it('returns false when the WebSocket errors', async () => {
      const mockWs = createMockWebSocket();
      globalThis.WebSocket = mockWs.constructor as unknown as typeof WebSocket;

      const promise = verifyJsLiveness(
        'ws://localhost:8081/inspector/page/1',
        2_000,
      );

      mockWs.simulateError();

      await expect(promise).resolves.toBe(false);
    });

    it('returns false when the WebSocket closes before a result', async () => {
      const mockWs = createMockWebSocket();
      globalThis.WebSocket = mockWs.constructor as unknown as typeof WebSocket;

      const promise = verifyJsLiveness(
        'ws://localhost:8081/inspector/page/1',
        2_000,
      );

      mockWs.simulateOpen();
      mockWs.simulateClose();

      await expect(promise).resolves.toBe(false);
    });

    it('ignores non-JSON messages and waits for the correct response', async () => {
      const mockWs = createMockWebSocket();
      globalThis.WebSocket = mockWs.constructor as unknown as typeof WebSocket;

      const promise = verifyJsLiveness(
        'ws://localhost:8081/inspector/page/1',
        2_000,
      );

      mockWs.simulateOpen();
      mockWs.simulateMessage('not-json');
      mockWs.simulateMessage(
        JSON.stringify({ id: 99, result: { value: 'other' } }),
      );
      mockWs.simulateMessage(JSON.stringify({ id: 1, result: { value: 2 } }));

      await expect(promise).resolves.toBe(true);
    });
  });
});

interface MockWebSocketHandler {
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
  send: (data: string) => void;
  close: () => void;
  readyState: number;
}

interface MockWebSocketInstance {
  constructor: new (url: string) => unknown;
  simulateOpen(): void;
  simulateMessage(data: string): void;
  simulateError(): void;
  simulateClose(): void;
}

function createMockWebSocket(): MockWebSocketInstance {
  const instances: MockWebSocketHandler[] = [];

  class MockWebSocket {
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    onclose: (() => void) | null = null;
    send = jest.fn() as jest.MockedFunction<(data: string) => void>;
    close = jest.fn() as jest.MockedFunction<() => void>;
    readyState = 0;

    constructor(_url: string) {
      instances.push(this);
    }
  }

  const last = (): MockWebSocketHandler => instances[instances.length - 1];

  return {
    constructor: MockWebSocket as unknown as new (url: string) => unknown,
    simulateOpen() {
      const inst = last();
      inst.readyState = 1;
      inst.onopen?.();
    },
    simulateMessage(data: string) {
      last().onmessage?.({ data });
    },
    simulateError() {
      last().onerror?.();
    },
    simulateClose() {
      last().onclose?.();
    },
  };
}
