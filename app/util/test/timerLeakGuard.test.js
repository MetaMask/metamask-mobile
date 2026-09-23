import { trackPendingTimers } from './timerLeakGuard';

describe('trackPendingTimers', () => {
  const createTarget = () => ({
    setTimeout: jest.fn(() => 'timeout-id'),
    clearTimeout: jest.fn(),
    setInterval: jest.fn(() => 'interval-id'),
    clearInterval: jest.fn(),
  });

  it('cancels timeouts that are still pending', () => {
    const target = createTarget();
    const { clearTimeout: originalClearTimeout } = target;

    const clearPendingTimers = trackPendingTimers(target);
    target.setTimeout(jest.fn(), 100);
    clearPendingTimers();

    expect(originalClearTimeout).toHaveBeenCalledWith('timeout-id');
  });

  it('cancels intervals that are still pending', () => {
    const target = createTarget();
    const { clearInterval: originalClearInterval } = target;

    const clearPendingTimers = trackPendingTimers(target);
    target.setInterval(jest.fn(), 100);
    clearPendingTimers();

    expect(originalClearInterval).toHaveBeenCalledWith('interval-id');
  });

  it('stops tracking a timeout once it fires', () => {
    const target = createTarget();
    const { clearTimeout: originalClearTimeout } = target;
    const handler = jest.fn();

    const clearPendingTimers = trackPendingTimers(target);
    target.setTimeout(handler, 100);
    const [scheduledCallback] = target.setTimeout.mock.calls[0];
    scheduledCallback('arg');
    clearPendingTimers();

    expect(handler).toHaveBeenCalledWith('arg');
    expect(originalClearTimeout).not.toHaveBeenCalled();
  });

  it('stops tracking a timeout once it is cleared', () => {
    const target = createTarget();
    const { clearTimeout: originalClearTimeout } = target;

    const clearPendingTimers = trackPendingTimers(target);
    const id = target.setTimeout(jest.fn(), 100);
    target.clearTimeout(id);
    originalClearTimeout.mockClear();
    clearPendingTimers();

    expect(originalClearTimeout).not.toHaveBeenCalled();
  });

  it('keeps the properties Node exposes on the timer functions', () => {
    const target = createTarget();
    const promisifySymbol = Symbol('promisify');
    target.setTimeout[promisifySymbol] = 'custom';

    trackPendingTimers(target);

    expect(target.setTimeout[promisifySymbol]).toBe('custom');
  });
});
