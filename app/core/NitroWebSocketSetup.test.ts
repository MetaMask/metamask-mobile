import {
  NitroWebSocket,
  prewarmOnAppStart,
} from 'react-native-nitro-websockets';

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
  prewarmOnAppStart: jest.fn(),
}));

import './NitroWebSocketSetup';

const MockNitroWebSocket = jest.mocked(NitroWebSocket);
const mockPrewarmOnAppStart = jest.mocked(prewarmOnAppStart);

const GATEWAY_URL = 'wss://gateway.api.cx.metamask.io/v1';

describe('NitroWebSocketSetup', () => {
  describe('module-level side effects', () => {
    it('replaces global.WebSocket on module load', () => {
      new global.WebSocket('wss://example.com');

      expect(MockNitroWebSocket).toHaveBeenCalled();
    });

    it('calls prewarmOnAppStart with the MetaMask gateway URL on module load', () => {
      expect(mockPrewarmOnAppStart).toHaveBeenCalledWith(GATEWAY_URL);
    });

    it('calls prewarmOnAppStart exactly once', () => {
      expect(mockPrewarmOnAppStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('NitroWebSocketAdapter — static constants', () => {
    it('exposes CONNECTING as 0', () => {
      expect(global.WebSocket.CONNECTING).toBe(0);
    });

    it('exposes OPEN as 1', () => {
      expect(global.WebSocket.OPEN).toBe(1);
    });

    it('exposes CLOSING as 2', () => {
      expect(global.WebSocket.CLOSING).toBe(2);
    });

    it('exposes CLOSED as 3', () => {
      expect(global.WebSocket.CLOSED).toBe(3);
    });
  });

  describe('NitroWebSocketAdapter — constructor', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('passes url to NitroWebSocket', () => {
      new global.WebSocket('wss://test.example.com');

      expect(MockNitroWebSocket).toHaveBeenCalledWith(
        'wss://test.example.com',
        undefined,
        undefined,
      );
    });

    it('passes protocols array to NitroWebSocket', () => {
      new global.WebSocket('wss://test.example.com', ['proto1', 'proto2']);

      expect(MockNitroWebSocket).toHaveBeenCalledWith(
        'wss://test.example.com',
        ['proto1', 'proto2'],
        undefined,
      );
    });

    it('passes single protocol string to NitroWebSocket', () => {
      new global.WebSocket('wss://test.example.com', 'proto1');

      expect(MockNitroWebSocket).toHaveBeenCalledWith(
        'wss://test.example.com',
        'proto1',
        undefined,
      );
    });
  });

  describe('NitroWebSocketAdapter — instance constants', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('exposes CONNECTING as 0 on instance', () => {
      expect((ws as unknown as { CONNECTING: number }).CONNECTING).toBe(0);
    });

    it('exposes OPEN as 1 on instance', () => {
      expect((ws as unknown as { OPEN: number }).OPEN).toBe(1);
    });

    it('exposes CLOSING as 2 on instance', () => {
      expect((ws as unknown as { CLOSING: number }).CLOSING).toBe(2);
    });

    it('exposes CLOSED as 3 on instance', () => {
      expect((ws as unknown as { CLOSED: number }).CLOSED).toBe(3);
    });
  });

  describe('NitroWebSocketAdapter — readyState', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('maps CONNECTING string to 0', () => {
      mockWsInstance.readyState = 'CONNECTING';

      expect(ws.readyState).toBe(0);
    });

    it('maps OPEN string to 1', () => {
      mockWsInstance.readyState = 'OPEN';

      expect(ws.readyState).toBe(1);
    });

    it('maps CLOSING string to 2', () => {
      mockWsInstance.readyState = 'CLOSING';

      expect(ws.readyState).toBe(2);
    });

    it('maps CLOSED string to 3', () => {
      mockWsInstance.readyState = 'CLOSED';

      expect(ws.readyState).toBe(3);
    });

    it('falls back to CLOSED (3) for an unrecognised readyState string', () => {
      mockWsInstance.readyState = 'UNKNOWN';

      expect(ws.readyState).toBe(3);
    });
  });

  describe('NitroWebSocketAdapter — pass-through getters', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('returns url from native socket', () => {
      expect(ws.url).toBe('wss://example.com');
    });

    it('returns protocol from native socket', () => {
      expect(ws.protocol).toBe('mock-protocol');
    });

    it('returns bufferedAmount from native socket', () => {
      expect(ws.bufferedAmount).toBe(42);
    });

    it('returns extensions from native socket', () => {
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

    it('stores an assigned binaryType value', () => {
      ws.binaryType = 'blob';

      expect(ws.binaryType).toBe('blob');
    });
  });

  describe('NitroWebSocketAdapter — .onX property handlers', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('stores and retrieves onopen handler', () => {
      const handler = jest.fn();
      ws.onopen = handler;

      expect(ws.onopen).toBe(handler);
    });

    it('fires onopen when the native socket opens', () => {
      const handler = jest.fn();
      ws.onopen = handler;

      mockWsInstance.onopen?.();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('stores and retrieves onmessage handler', () => {
      const handler = jest.fn();
      ws.onmessage = handler;

      expect(ws.onmessage).toBe(handler);
    });

    it('fires onmessage with event data when native message arrives', () => {
      const handler = jest.fn();
      ws.onmessage = handler;

      mockWsInstance.onmessage?.({ isBinary: false, data: 'hello' });

      expect(handler).toHaveBeenCalledWith({ data: 'hello' });
    });

    it('stores and retrieves onclose handler', () => {
      const handler = jest.fn();
      ws.onclose = handler;

      expect(ws.onclose).toBe(handler);
    });

    it('fires onclose with close event when native socket closes', () => {
      const handler = jest.fn();
      ws.onclose = handler;
      const closeEvent: MockNitroCloseEvent = {
        code: 1000,
        reason: 'normal',
        wasClean: true,
      };

      mockWsInstance.onclose?.(closeEvent);

      expect(handler).toHaveBeenCalledWith(closeEvent);
    });

    it('stores and retrieves onerror handler', () => {
      const handler = jest.fn();
      ws.onerror = handler;

      expect(ws.onerror).toBe(handler);
    });

    it('fires onerror with error string when native socket errors', () => {
      const handler = jest.fn();
      ws.onerror = handler;

      mockWsInstance.onerror?.('connection refused');

      expect(handler).toHaveBeenCalledWith('connection refused');
    });

    it('does not fire onopen after it is reassigned to null', () => {
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

    it('delivers binaryData for binary frames', () => {
      const handler = jest.fn();
      ws.onmessage = handler;
      const binary = new ArrayBuffer(4);

      mockWsInstance.onmessage?.({
        isBinary: true,
        data: 'ignored',
        binaryData: binary,
      });

      expect(handler).toHaveBeenCalledWith({ data: binary });
    });

    it('falls back to data string when binaryData is undefined on a binary frame', () => {
      const handler = jest.fn();
      ws.onmessage = handler;

      mockWsInstance.onmessage?.({
        isBinary: true,
        data: 'fallback',
        binaryData: undefined,
      });

      expect(handler).toHaveBeenCalledWith({ data: 'fallback' });
    });

    it('falls back to data string when binaryData is null on a binary frame', () => {
      const handler = jest.fn();
      ws.onmessage = handler;

      mockWsInstance.onmessage?.({
        isBinary: true,
        data: 'fallback',
        binaryData: null,
      });

      expect(handler).toHaveBeenCalledWith({ data: 'fallback' });
    });

    it('delivers data string for non-binary frames', () => {
      const handler = jest.fn();
      ws.onmessage = handler;

      mockWsInstance.onmessage?.({ isBinary: false, data: 'text-payload' });

      expect(handler).toHaveBeenCalledWith({ data: 'text-payload' });
    });
  });

  describe('NitroWebSocketAdapter — addEventListener', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('fires open listener added via addEventListener', () => {
      const listener = jest.fn();
      ws.addEventListener('open', listener);

      mockWsInstance.onopen?.();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('fires message listener added via addEventListener with event data', () => {
      const listener = jest.fn();
      ws.addEventListener('message', listener);

      mockWsInstance.onmessage?.({ isBinary: false, data: 'hello' });

      expect(listener).toHaveBeenCalledWith({ data: 'hello' });
    });

    it('fires close listener added via addEventListener with close event', () => {
      const listener = jest.fn();
      ws.addEventListener('close', listener);
      const closeEvent: MockNitroCloseEvent = {
        code: 1001,
        reason: 'going away',
        wasClean: false,
      };

      mockWsInstance.onclose?.(closeEvent);

      expect(listener).toHaveBeenCalledWith(closeEvent);
    });

    it('fires error listener added via addEventListener with error string', () => {
      const listener = jest.fn();
      ws.addEventListener('error', listener);

      mockWsInstance.onerror?.('timeout');

      expect(listener).toHaveBeenCalledWith('timeout');
    });

    it('fires all listeners when multiple are added for the same event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      ws.addEventListener('open', listener1);
      ws.addEventListener('open', listener2);

      mockWsInstance.onopen?.();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('deduplicates identical listeners added more than once', () => {
      const listener = jest.fn();
      ws.addEventListener('open', listener);
      ws.addEventListener('open', listener);

      mockWsInstance.onopen?.();

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('NitroWebSocketAdapter — removeEventListener', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('stops firing open listener after removeEventListener', () => {
      const listener = jest.fn();
      ws.addEventListener('open', listener);
      ws.removeEventListener('open', listener);

      mockWsInstance.onopen?.();

      expect(listener).not.toHaveBeenCalled();
    });

    it('stops firing message listener after removeEventListener', () => {
      const listener = jest.fn();
      ws.addEventListener('message', listener);
      ws.removeEventListener('message', listener);

      mockWsInstance.onmessage?.({ isBinary: false, data: 'hello' });

      expect(listener).not.toHaveBeenCalled();
    });

    it('stops firing close listener after removeEventListener', () => {
      const listener = jest.fn();
      ws.addEventListener('close', listener);
      ws.removeEventListener('close', listener);

      mockWsInstance.onclose?.({ code: 1000, reason: '', wasClean: true });

      expect(listener).not.toHaveBeenCalled();
    });

    it('stops firing error listener after removeEventListener', () => {
      const listener = jest.fn();
      ws.addEventListener('error', listener);
      ws.removeEventListener('error', listener);

      mockWsInstance.onerror?.('error');

      expect(listener).not.toHaveBeenCalled();
    });

    it('only removes the specific listener, leaving others intact', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      ws.addEventListener('open', listener1);
      ws.addEventListener('open', listener2);
      ws.removeEventListener('open', listener1);

      mockWsInstance.onopen?.();

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('NitroWebSocketAdapter — .onX and addEventListener composition', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('fires both .onopen and an open addEventListener listener for the same event', () => {
      const onXHandler = jest.fn();
      const addedListener = jest.fn();
      ws.onopen = onXHandler;
      ws.addEventListener('open', addedListener);

      mockWsInstance.onopen?.();

      expect(onXHandler).toHaveBeenCalledTimes(1);
      expect(addedListener).toHaveBeenCalledTimes(1);
    });

    it('fires both .onmessage and a message addEventListener listener with the same event data', () => {
      const onXHandler = jest.fn();
      const addedListener = jest.fn();
      ws.onmessage = onXHandler;
      ws.addEventListener('message', addedListener);

      mockWsInstance.onmessage?.({ isBinary: false, data: 'hello' });

      expect(onXHandler).toHaveBeenCalledWith({ data: 'hello' });
      expect(addedListener).toHaveBeenCalledWith({ data: 'hello' });
    });

    it('fires both .onclose and a close addEventListener listener with the same close event', () => {
      const onXHandler = jest.fn();
      const addedListener = jest.fn();
      ws.onclose = onXHandler;
      ws.addEventListener('close', addedListener);
      const closeEvent: MockNitroCloseEvent = {
        code: 1000,
        reason: 'done',
        wasClean: true,
      };

      mockWsInstance.onclose?.(closeEvent);

      expect(onXHandler).toHaveBeenCalledWith(closeEvent);
      expect(addedListener).toHaveBeenCalledWith(closeEvent);
    });

    it('fires both .onerror and an error addEventListener listener with the same error', () => {
      const onXHandler = jest.fn();
      const addedListener = jest.fn();
      ws.onerror = onXHandler;
      ws.addEventListener('error', addedListener);

      mockWsInstance.onerror?.('network error');

      expect(onXHandler).toHaveBeenCalledWith('network error');
      expect(addedListener).toHaveBeenCalledWith('network error');
    });
  });

  describe('NitroWebSocketAdapter — send', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('delegates string send to native socket', () => {
      ws.send('hello world');

      expect(mockWsInstance.send).toHaveBeenCalledWith('hello world');
    });

    it('delegates ArrayBuffer send to native socket', () => {
      const buffer = new ArrayBuffer(8);
      ws.send(buffer);

      expect(mockWsInstance.send).toHaveBeenCalledWith(buffer);
    });
  });

  describe('NitroWebSocketAdapter — close', () => {
    let ws: WebSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      ws = new global.WebSocket('wss://example.com');
    });

    it('delegates close to native socket with code and reason', () => {
      ws.close(1000, 'normal closure');

      expect(mockWsInstance.close).toHaveBeenCalledWith(1000, 'normal closure');
    });

    it('delegates close to native socket without arguments', () => {
      ws.close();

      expect(mockWsInstance.close).toHaveBeenCalledWith(undefined, undefined);
    });

    it('delegates close to native socket with code only', () => {
      ws.close(1001);

      expect(mockWsInstance.close).toHaveBeenCalledWith(1001, undefined);
    });
  });
});
