import { trackPendingTimers } from './timerLeakGuard';

describe('trackPendingTimers', () => {
  const createTarget = () => ({
    setTimeout: jest.fn(() => 'timeout-id'),
    clearTimeout: jest.fn(),
    setInterval: jest.fn(() => 'interval-id'),
    clearInterval: jest.fn(),
    setImmediate: jest.fn(() => 'immediate-id'),
    clearImmediate: jest.fn(),
  });

  it.each([
    ['setTimeout', 'clearTimeout', 'timeout-id'],
    ['setInterval', 'clearInterval', 'interval-id'],
    ['setImmediate', 'clearImmediate', 'immediate-id'],
  ])('cancels a pending %s', (schedule, cancel, id) => {
    const target = createTarget();
    const originalCancel = target[cancel];

    const clearPendingTimers = trackPendingTimers(target);
    target[schedule](jest.fn(), 100);
    clearPendingTimers();

    expect(originalCancel).toHaveBeenCalledWith(id);
  });

  it('stops tracking a timeout once it fires', () => {
    const target = createTarget();
    const originalClearTimeout = target.clearTimeout;
    const handler = jest.fn();

    const clearPendingTimers = trackPendingTimers(target);
    target.setTimeout(handler, 100);
    const [scheduledCallback] = target.setTimeout.mock.calls[0];
    scheduledCallback('arg');
    clearPendingTimers();

    expect(handler).toHaveBeenCalledWith('arg');
    expect(originalClearTimeout).not.toHaveBeenCalled();
  });

  it('keeps tracking an interval once it fires', () => {
    const target = createTarget();
    const originalClearInterval = target.clearInterval;

    const clearPendingTimers = trackPendingTimers(target);
    target.setInterval(jest.fn(), 100);
    const [scheduledCallback] = target.setInterval.mock.calls[0];
    scheduledCallback();
    clearPendingTimers();

    expect(originalClearInterval).toHaveBeenCalledWith('interval-id');
  });

  it('stops tracking a timeout once it is cleared', () => {
    const target = createTarget();
    const originalClearTimeout = target.clearTimeout;

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

  it('ignores timer kinds the environment does not provide', () => {
    const target = createTarget();
    delete target.setImmediate;
    delete target.clearImmediate;

    expect(() => trackPendingTimers(target)()).not.toThrow();
  });
});
