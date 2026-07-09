import { NitroWebSocket } from 'react-native-nitro-websockets';

interface MockNitroMessageEvent {
  isBinary: boolean;
  data: string;
  binaryData?: ArrayBuffer | null;
}

interface MockNitroCloseEvent {
  code: number;
  reason: string;
  wasClean: boolean;
}

interface MockWsInstance {
  onopen: (() => void) | null;
  onmessage: ((e: MockNitroMessageEvent) => void) | null;
  onclose: ((e: MockNitroCloseEvent) => void) | null;
  onerror: ((error: string) => void) | null;
  url: string;
  protocol: string;
  bufferedAmount: number;
  extensions: string;
  readyState: string;
  send: jest.Mock;
  close: jest.Mock;
}

let mockWsInstance: MockWsInstance;

jest.mock('react-native-nitro-websockets', () => ({
  NitroWebSocket: jest.fn().mockImplementation((url: string) => {
    mockWsInstance = {
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      url,
      protocol: 'mock-protocol',
      bufferedAmount: 42,
      extensions: 'permessage-deflate',
      readyState: 'CONNECTING',
      send: jest.fn(),
      close: jest.fn(),
    };
    return mockWsInstance;
  }),
}));

import {
  installDevNitroWebSocket,
  installProductionNitroWebSocket,
  NitroWebSocketAdapter,
} from './NitroWebSocketSetup';

const MockNitroWebSocket = jest.mocked(NitroWebSocket);

const originalGlobalWebSocket = global.WebSocket;

describe('NitroWebSocketSetup', () => {
  beforeAll(() => {
    installProductionNitroWebSocket();
  });

  afterAll(() => {
    global.WebSocket = originalGlobalWebSocket;
  });

  describe('module-level side effects', () => {
    it('keeps ws:// sockets (Metro hot reload) on the built-in WebSocket when imported in dev (__DEV__)', () => {
      // __DEV__ is a bare global injected by RN/Jest — not typed on globalThis.
      const devGlobal = global as unknown as { __DEV__: boolean };
      const originalDev = devGlobal.__DEV__;
      const sentinel = jest.fn();

      devGlobal.__DEV__ = true;
      global.WebSocket = sentinel as unknown as typeof WebSocket;
      try {
        jest.isolateModules(() => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('./NitroWebSocketSetup');
        });

        new global.WebSocket('ws://localhost:8081/hot');

        expect(sentinel).toHaveBeenCalledWith(
          'ws://localhost:8081/hot',
          undefined,
        );
      } finally {
        devGlobal.__DEV__ = originalDev;
        global.WebSocket = NitroWebSocketAdapter as unknown as typeof WebSocket;
      }
    });

    it('installs NitroWebSocketAdapter as global.WebSocket when installed explicitly', () => {
      new global.WebSocket('wss://example.com');

      expect(MockNitroWebSocket).toHaveBeenCalled();
    });
  });

  describe('installDevNitroWebSocket — scheme routing', () => {
    let MockOriginalWebSocket: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      MockOriginalWebSocket = jest.fn();
      global.WebSocket = MockOriginalWebSocket as unknown as typeof WebSocket;
      installDevNitroWebSocket();
    });

    afterEach(() => {
      // Restore the adapter installed by the outer beforeAll for later suites.
      installProductionNitroWebSocket();
    });

    it('routes ws:// sockets (Metro HMR /hot) to the built-in WebSocket', () => {
      new global.WebSocket('ws://localhost:8081/hot');

      expect(MockOriginalWebSocket).toHaveBeenCalledWith(
        'ws://localhost:8081/hot',
        undefined,
      );
      expect(MockNitroWebSocket).not.toHaveBeenCalled();
    });

    it('routes ws:// sockets to the built-in WebSocket regardless of host (LAN device, emulator)', () => {
      new global.WebSocket('ws://10.0.2.2:8081/hot');

      expect(MockOriginalWebSocket).toHaveBeenCalled();
      expect(MockNitroWebSocket).not.toHaveBeenCalled();
    });

    it('routes wss:// application sockets through NitroWebSocket', () => {
      new global.WebSocket('wss://example.com', 'proto1');

      expect(MockNitroWebSocket).toHaveBeenCalledWith(
        'wss://example.com',
        'proto1',
        undefined,
      );
      expect(MockOriginalWebSocket).not.toHaveBeenCalled();
    });

    it('matches the wss scheme case-insensitively', () => {
      new global.WebSocket('WSS://example.com');

      expect(MockNitroWebSocket).toHaveBeenCalled();
      expect(MockOriginalWebSocket).not.toHaveBeenCalled();
    });

    it('exposes W3C ready state constants on the routing constructor', () => {
      expect(global.WebSocket.CONNECTING).toBe(0);
      expect(global.WebSocket.OPEN).toBe(1);
      expect(global.WebSocket.CLOSING).toBe(2);
      expect(global.WebSocket.CLOSED).toBe(3);
    });

    it('falls back to the Nitro adapter when no built-in WebSocket exists', () => {
      global.WebSocket = undefined as unknown as typeof WebSocket;

      installDevNitroWebSocket();
      new global.WebSocket('ws://localhost:8081/hot');

      expect(MockNitroWebSocket).toHaveBeenCalled();
    });
  });

  describe('NitroWebSocketAdapter — static constants', () => {
    it('exposes W3C ready state constants 0–3', () => {
      expect(global.WebSocket.CONNECTING).toBe(0);
      expect(global.WebSocket.OPEN).toBe(1);
      expect(global.WebSocket.CLOSING).toBe(2);
      expect(global.WebSocket.CLOSED).toBe(3);
    });
  });

  describe('NitroWebSocketAdapter — constructor', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('passes url and protocols array to NitroWebSocket', () => {
      new global.WebSocket('wss://test.example.com', ['proto1', 'proto2']);

      expect(MockNitroWebSocket).toHaveBeenCalledWith(
        'wss://test.example.com',
        ['proto1', 'proto2'],
        undefined,
      );
    });

    it('passes url and single protocol string to NitroWebSocket', () => {
      new global.WebSocket('wss://test.example.com', 'proto1');

      expect(MockNitroWebSocket).toHaveBeenCalledWith(
        'wss://test.example.com',
        'proto1',
        undefined,
      );
    });
  });

  describe('NitroWebSocketAdapter — readyState', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('maps CONNECTING/OPEN/CLOSING/CLOSED strings to 0/1/2/3', () => {
      for (const [state, value] of [
        ['CONNECTING', 0],
        ['OPEN', 1],
        ['CLOSING', 2],
        ['CLOSED', 3],
      ] as const) {
        mockWsInstance.readyState = state;
        expect(ws.readyState).toBe(value);
      }
    });

    it('falls back to CLOSED (3) for an unrecognised readyState string', () => {
      mockWsInstance.readyState = 'UNKNOWN';

      expect(ws.readyState).toBe(3);
    });

    it('warns in __DEV__ when readyState is unrecognised', () => {
      const warnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation((_msg: string) => {
          // suppress output
        });
      const globalRecord = global as unknown as Record<string, unknown>;
      const originalDev = globalRecord.__DEV__;
      globalRecord.__DEV__ = true;
      mockWsInstance.readyState = 'UNKNOWN';

      const state = ws.readyState;

      expect(state).toBe(3);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown readyState'),
      );
      globalRecord.__DEV__ = originalDev;
      warnSpy.mockRestore();
    });
  });

  describe('NitroWebSocketAdapter — pass-through getters', () => {
    it('proxies url, protocol, bufferedAmount, and extensions from the native socket', () => {
      const ws = new global.WebSocket('wss://example.com');

      expect(ws.url).toBe('wss://example.com');
      expect(ws.protocol).toBe('mock-protocol');
      expect(ws.bufferedAmount).toBe(42);
      expect(ws.extensions).toBe('permessage-deflate');
    });
  });

  describe('NitroWebSocketAdapter — binaryType', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('defaults to arraybuffer', () => {
      expect(ws.binaryType).toBe('arraybuffer');
    });
  });

  describe('NitroWebSocketAdapter — .onX handlers', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('fires onopen with an open event when the native socket opens', () => {
      const handler = jest.fn();
      ws.onopen = handler;

      mockWsInstance.onopen?.();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'open' }),
      );
    });

    it('fires onmessage with event data when a native text message arrives', () => {
      const handler = jest.fn();
      ws.onmessage = handler;

      mockWsInstance.onmessage?.({ isBinary: false, data: 'hello' });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'message', data: 'hello' }),
      );
    });

    it('fires onclose with close event fields when the native socket closes', () => {
      const handler = jest.fn();
      ws.onclose = handler;

      mockWsInstance.onclose?.({
        code: 1000,
        reason: 'normal',
        wasClean: true,
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'close',
          code: 1000,
          reason: 'normal',
          wasClean: true,
        }),
      );
    });

    it('fires onerror with the error message when the native socket errors', () => {
      const handler = jest.fn();
      ws.onerror = handler;

      mockWsInstance.onerror?.('connection refused');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'connection refused',
        }),
      );
    });

    it('stops firing onopen after it is set to null', () => {
      const handler = jest.fn();
      ws.onopen = handler;
      ws.onopen = null;

      mockWsInstance.onopen?.();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('NitroWebSocketAdapter — message binary handling', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('delivers binaryData as message data for binary frames', () => {
      const handler = jest.fn();
      ws.onmessage = handler;
      const binary = new ArrayBuffer(4);

      mockWsInstance.onmessage?.({
        isBinary: true,
        data: 'ignored',
        binaryData: binary,
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'message', data: binary }),
      );
    });
  });

  describe('NitroWebSocketAdapter — addEventListener', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('fires a registered open listener when the native socket opens', () => {
      const listener = jest.fn();
      ws.addEventListener('open', listener);

      mockWsInstance.onopen?.();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('fires all listeners when multiple are registered for the same event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      ws.addEventListener('open', listener1);
      ws.addEventListener('open', listener2);

      mockWsInstance.onopen?.();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('fires a { once: true } listener only on the first event', () => {
      const listener = jest.fn();
      ws.addEventListener('open', listener, { once: true });

      mockWsInstance.onopen?.();
      mockWsInstance.onopen?.();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('removes a signal-bound listener when the signal aborts', () => {
      const controller = new AbortController();
      const listener = jest.fn();
      ws.addEventListener('message', listener, { signal: controller.signal });

      mockWsInstance.onmessage?.({ isBinary: false, data: 'first' });
      controller.abort();
      mockWsInstance.onmessage?.({ isBinary: false, data: 'second' });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('removes a signal-bound listener when the signal aborts before any event fires', () => {
      // Covers the rapid-teardown scenario: abort happens immediately after
      // registration, before the socket has dispatched a single event.
      const controller = new AbortController();
      const listener = jest.fn();
      ws.addEventListener('message', listener, { signal: controller.signal });

      controller.abort();
      mockWsInstance.onmessage?.({ isBinary: false, data: 'hello' });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('NitroWebSocketAdapter — removeEventListener', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('stops firing a listener after removeEventListener', () => {
      const listener = jest.fn();
      ws.addEventListener('open', listener);
      ws.removeEventListener('open', listener);

      mockWsInstance.onopen?.();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('NitroWebSocketAdapter — dispatchEvent', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('invokes close listeners with an externally dispatched close event', () => {
      // @nktkas/rews dispatches a synthetic CloseEvent on connect timeout.
      const listener = jest.fn();
      ws.addEventListener('close', listener);
      const closeEvent = {
        type: 'close',
        code: 3008,
        reason: 'Timeout',
        wasClean: false,
      };

      const result = ws.dispatchEvent(closeEvent as unknown as Event);

      expect(listener).toHaveBeenCalledWith(closeEvent);
      expect(result).toBe(true);
    });

    it('invokes the .onclose handler on an externally dispatched close event', () => {
      const handler = jest.fn();
      ws.onclose = handler;
      const closeEvent = {
        type: 'close',
        code: 1006,
        reason: '',
        wasClean: false,
      };

      ws.dispatchEvent(closeEvent as unknown as Event);

      expect(handler).toHaveBeenCalledWith(closeEvent);
    });

    it('does not throw when dispatching an unknown event type', () => {
      expect(() =>
        ws.dispatchEvent({ type: 'custom' } as unknown as Event),
      ).not.toThrow();
    });
  });

  describe('NitroWebSocketAdapter — AbortSignal cleanup on close', () => {
    it('removes the signal abort-listener from the signal when the socket closes', () => {
      const controller = new AbortController();
      const { signal } = controller;
      const removeEventListenerSpy = jest.spyOn(signal, 'removeEventListener');

      const ws2 = new global.WebSocket('wss://example.com');
      const listener = jest.fn();
      ws2.addEventListener('message', listener, { signal });

      // Trigger close — adapter should clean up its abort handler from the signal.
      mockWsInstance.onclose?.({ code: 1000, reason: 'done', wasClean: true });

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'abort',
        expect.any(Function),
      );
    });
  });

  describe('NitroWebSocketAdapter — .onX and addEventListener composition', () => {
    it('fires both .onopen and an addEventListener listener for the same event', () => {
      const ws = new global.WebSocket('wss://example.com');
      const onXHandler = jest.fn();
      const addedListener = jest.fn();
      ws.onopen = onXHandler;
      ws.addEventListener('open', addedListener);

      mockWsInstance.onopen?.();

      expect(onXHandler).toHaveBeenCalledTimes(1);
      expect(addedListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('NitroWebSocketAdapter — send', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('delegates string send to the native socket', () => {
      ws.send('hello world');

      expect(mockWsInstance.send).toHaveBeenCalledWith('hello world');
    });

    it('delegates ArrayBuffer send to the native socket', () => {
      const buffer = new ArrayBuffer(8);
      ws.send(buffer);

      expect(mockWsInstance.send).toHaveBeenCalledWith(buffer);
    });

    it('normalises a Uint8Array to a real ArrayBuffer before sending', () => {
      const view = new Uint8Array([1, 2, 3, 4]);

      (ws as unknown as { send(data: ArrayBufferView): void }).send(view);

      const sent = mockWsInstance.send.mock.calls[0][0];
      expect(ArrayBuffer.isView(sent)).toBe(false);
      expect(sent.byteLength).toBe(4);
      expect(Array.from(new Uint8Array(sent))).toEqual([1, 2, 3, 4]);
    });
  });

  describe('NitroWebSocketAdapter — close', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('delegates close with code and reason to the native socket', () => {
      ws.close(1000, 'normal closure');

      expect(mockWsInstance.close).toHaveBeenCalledWith(1000, 'normal closure');
    });

    it('delegates close with no arguments to the native socket', () => {
      ws.close();

      expect(mockWsInstance.close).toHaveBeenCalledWith(undefined, undefined);
    });
  });
});
