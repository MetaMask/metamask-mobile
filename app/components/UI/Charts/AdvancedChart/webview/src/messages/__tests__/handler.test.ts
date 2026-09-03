/**
 * @jest-environment jsdom
 */
import {
  __resetHandlersForTests,
  dispatchInboundMessage,
  registerHandler,
} from '../handler';

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

describe('messages/handler', () => {
  beforeEach(() => {
    __resetHandlersForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('routes a typed message to the registered handler', () => {
    const handler = jest.fn();
    registerHandler('SET_THEME_COLORS', handler);

    dispatchInboundMessage({
      type: 'SET_THEME_COLORS',
      payload: { lineColor: 'rgb(255,255,255)' },
    });

    expect(handler).toHaveBeenCalledWith({ lineColor: 'rgb(255,255,255)' });
  });

  it('silently drops messages with no registered handler', () => {
    expect(() =>
      dispatchInboundMessage({
        type: 'SET_THEME_COLORS',
        payload: {},
      }),
    ).not.toThrow();
  });

  it('forwards handler errors to the ERROR channel', () => {
    const bridge = installRNBridge();
    registerHandler('SET_THEME_COLORS', () => {
      throw new Error('handler boom');
    });

    dispatchInboundMessage({
      type: 'SET_THEME_COLORS',
      payload: {},
    });

    expect(bridge.postMessage).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'ERROR',
        payload: { message: 'handler boom' },
      }),
    );
  });

  it('replacing a handler keeps the latest one only', () => {
    const first = jest.fn();
    const second = jest.fn();
    registerHandler('SET_THEME_COLORS', first);
    registerHandler('SET_THEME_COLORS', second);

    dispatchInboundMessage({ type: 'SET_THEME_COLORS', payload: {} });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
