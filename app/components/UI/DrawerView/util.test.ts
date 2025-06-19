import safePromiseHandler from './utils';

describe('safePromiseHandler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useFakeTimers({ legacyFakeTimers: true });
    jest.clearAllMocks();
  });

  it('should return a function', () => {
    const toggleFunction = jest.fn();
    const handler = safePromiseHandler(toggleFunction);
    expect(typeof handler).toBe('function');
  });

  it('should call toggleFunction after the default delay (100ms)', () => {
    const toggleFunction = jest.fn();
    const handler = safePromiseHandler(toggleFunction);
    handler();
    // Initially, the toggleFunction should not have been called.
    expect(toggleFunction).not.toHaveBeenCalled();
    // Advance time by 100ms
    jest.advanceTimersByTime(100);
    expect(toggleFunction).toHaveBeenCalledTimes(1);
  });

  it('should call toggleFunction after a custom delay', () => {
    const customDelay = 250;
    const toggleFunction = jest.fn();
    const handler = safePromiseHandler(toggleFunction, customDelay);
    handler();
    // Advance time by less than customDelay; function should not have been called yet.
    jest.advanceTimersByTime(customDelay - 1);
    expect(toggleFunction).not.toHaveBeenCalled();
    // Advance by the remaining time.
    jest.advanceTimersByTime(1);
    expect(toggleFunction).toHaveBeenCalledTimes(1);
  });

  it('should call toggleFunction for each invocation of the handler', () => {
    const toggleFunction = jest.fn();
    const handler = safePromiseHandler(toggleFunction);
    // Call the returned function twice.
    handler();
    handler();
    jest.advanceTimersByTime(100);
    expect(toggleFunction).toHaveBeenCalledTimes(2);
  });
});
