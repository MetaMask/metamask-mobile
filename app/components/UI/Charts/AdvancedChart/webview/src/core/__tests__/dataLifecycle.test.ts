/**
 * @jest-environment jsdom
 */
import {
  onDataLifecycle,
  notifyDataLifecycle,
  __resetDataLifecycleForTests,
} from '../dataLifecycle';

describe('core/dataLifecycle', () => {
  beforeEach(() => {
    __resetDataLifecycleForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('notifies listeners when an event fires', () => {
    const listener = jest.fn();
    onDataLifecycle('ohlcvReset', listener);
    notifyDataLifecycle('ohlcvReset');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('supports multiple listeners on the same event', () => {
    const a = jest.fn();
    const b = jest.fn();
    onDataLifecycle('ohlcvPrepended', a);
    onDataLifecycle('ohlcvPrepended', b);
    notifyDataLifecycle('ohlcvPrepended');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('does not cross-fire between events', () => {
    const listener = jest.fn();
    onDataLifecycle('ohlcvReset', listener);
    notifyDataLifecycle('ohlcvPrepended');
    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribe removes the listener', () => {
    const listener = jest.fn();
    const unsub = onDataLifecycle('visibleRangeChanged', listener);
    unsub();
    notifyDataLifecycle('visibleRangeChanged');
    expect(listener).not.toHaveBeenCalled();
  });

  it('reports listener errors to RN without stopping other listeners', () => {
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;

    const bad = jest.fn(() => {
      throw new Error('boom');
    });
    const good = jest.fn();
    onDataLifecycle('ohlcvReset', bad);
    onDataLifecycle('ohlcvReset', good);

    notifyDataLifecycle('ohlcvReset');

    expect(good).toHaveBeenCalledTimes(1);
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ERROR"'),
    );
  });

  it('__resetDataLifecycleForTests clears all listeners', () => {
    const listener = jest.fn();
    onDataLifecycle('ohlcvReset', listener);
    onDataLifecycle('ohlcvPrepended', listener);
    onDataLifecycle('visibleRangeChanged', listener);
    __resetDataLifecycleForTests();
    notifyDataLifecycle('ohlcvReset');
    notifyDataLifecycle('ohlcvPrepended');
    notifyDataLifecycle('visibleRangeChanged');
    expect(listener).not.toHaveBeenCalled();
  });
});
