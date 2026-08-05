/**
 * @jest-environment jsdom
 */
import { onFromRN, postToRN, reportErrorToRN } from '../bridge';
import type { InboundMessage } from '../../messages/contract';

interface MockBridge {
  postMessage: jest.Mock<void, [string]>;
}

const installRNBridge = (): MockBridge => {
  const bridge: MockBridge = { postMessage: jest.fn() };
  (
    window as unknown as { ReactNativeWebView?: MockBridge }
  ).ReactNativeWebView = bridge;
  return bridge;
};

const clearRNBridge = (): void => {
  delete (window as unknown as { ReactNativeWebView?: MockBridge })
    .ReactNativeWebView;
};

describe('core/bridge', () => {
  afterEach(() => {
    clearRNBridge();
  });

  describe('postToRN', () => {
    it('serializes type + payload via window.ReactNativeWebView.postMessage', () => {
      const bridge = installRNBridge();
      postToRN('CHART_READY', {});
      expect(bridge.postMessage).toHaveBeenCalledTimes(1);
      expect(bridge.postMessage).toHaveBeenCalledWith(
        JSON.stringify({ type: 'CHART_READY', payload: {} }),
      );
    });

    it('no-ops when ReactNativeWebView is unavailable', () => {
      expect(() => postToRN('DEBUG', { message: 'x' })).not.toThrow();
    });

    it('swallows postMessage failures (cannot report bridge errors)', () => {
      const bridge = installRNBridge();
      bridge.postMessage.mockImplementation(() => {
        throw new Error('bridge dead');
      });
      expect(() => postToRN('DEBUG', { message: 'x' })).not.toThrow();
    });
  });

  describe('reportErrorToRN', () => {
    it('extracts Error.message and posts to ERROR channel', () => {
      const bridge = installRNBridge();
      reportErrorToRN(new Error('kaboom'));
      expect(bridge.postMessage).toHaveBeenCalledWith(
        JSON.stringify({ type: 'ERROR', payload: { message: 'kaboom' } }),
      );
    });

    it('stringifies non-Error values', () => {
      const bridge = installRNBridge();
      reportErrorToRN('oops');
      expect(bridge.postMessage).toHaveBeenCalledWith(
        JSON.stringify({ type: 'ERROR', payload: { message: 'oops' } }),
      );
    });
  });

  describe('onFromRN', () => {
    let listeners: { window: EventListener[]; document: EventListener[] };

    beforeEach(() => {
      listeners = { window: [], document: [] };
      jest
        .spyOn(window, 'addEventListener')
        .mockImplementation(
          (type: string, listener: EventListenerOrEventListenerObject) => {
            if (type === 'message')
              listeners.window.push(listener as EventListener);
          },
        );
      jest
        .spyOn(document, 'addEventListener')
        .mockImplementation(
          (type: string, listener: EventListenerOrEventListenerObject) => {
            if (type === 'message')
              listeners.document.push(listener as EventListener);
          },
        );
      jest.spyOn(window, 'removeEventListener').mockImplementation();
      jest.spyOn(document, 'removeEventListener').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('subscribes to both window and document message events', () => {
      onFromRN(() => undefined);
      expect(listeners.window).toHaveLength(1);
      expect(listeners.document).toHaveLength(1);
    });

    it('parses JSON string payloads and forwards typed messages', () => {
      const handler = jest.fn();
      onFromRN(handler);
      const evt = {
        data: JSON.stringify({
          type: 'SET_THEME_COLORS',
          payload: { lineColor: 'rgb(170,187,204)' },
        }),
      } as MessageEvent;
      listeners.window[0](evt);
      expect(handler).toHaveBeenCalledWith({
        type: 'SET_THEME_COLORS',
        payload: { lineColor: 'rgb(170,187,204)' },
      } as InboundMessage);
    });

    it('reports JSON parse errors via the ERROR channel', () => {
      const bridge = installRNBridge();
      onFromRN(() => undefined);
      listeners.window[0]({ data: '{not json' } as MessageEvent);
      expect(bridge.postMessage).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ERROR"'),
      );
    });

    it('drops messages missing a string `type` field', () => {
      const handler = jest.fn();
      onFromRN(handler);
      listeners.window[0]({
        data: JSON.stringify({ noType: true }),
      } as MessageEvent);
      listeners.window[0]({ data: '"a string"' } as MessageEvent);
      listeners.window[0]({ data: 'null' } as MessageEvent);
      expect(handler).not.toHaveBeenCalled();
    });

    it('rejects messages from real web origins', () => {
      const handler = jest.fn();
      onFromRN(handler);
      listeners.window[0]({
        origin: 'https://evil.com',
        data: JSON.stringify({ type: 'SET_THEME_COLORS', payload: {} }),
      } as MessageEvent);
      expect(handler).not.toHaveBeenCalled();
    });

    it('returns an unsubscribe that removes both listeners', () => {
      const unsubscribe = onFromRN(() => undefined);
      unsubscribe();
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
      expect(document.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });
  });
});
