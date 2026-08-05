import {
  consumeSharedSessionRecreate,
  isDeviceHealthError,
  requestSharedSessionRecreate,
  resetSharedSessionRecreateState,
} from './sessionRecovery.ts';

describe('isDeviceHealthError', () => {
  it('returns true for pm clear failures', () => {
    const error = new Error(
      'Command failed: adb -s emulator-5554 shell pm clear io.metamask',
    );

    expect(isDeviceHealthError(error)).toBe(true);
  });

  it('returns true for MainActivity missing failures', () => {
    const error = new Error(
      'Activity class {io.metamask/io.metamask.MainActivity} does not exist.',
    );

    expect(isDeviceHealthError(error)).toBe(true);
  });

  it('returns true for cannot start application failures', () => {
    const error = new Error(
      "Cannot start the 'io.metamask' application. Consider checking the driver's troubleshooting documentation.",
    );

    expect(isDeviceHealthError(error)).toBe(true);
  });

  it('returns true for terminated session failures', () => {
    const error = new Error(
      'A session is either terminated or not started when running "elements"',
    );

    expect(isDeviceHealthError(error)).toBe(true);
  });

  it('returns true for UiAutomation disconnect failures', () => {
    const error = new Error(
      'java.lang.IllegalStateException: UiAutomation not connected',
    );

    expect(isDeviceHealthError(error)).toBe(true);
  });

  it('returns false for ordinary assertion failures', () => {
    const error = new Error('Timed out: expected "Connected", got "Not connected"');

    expect(isDeviceHealthError(error)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isDeviceHealthError(undefined)).toBe(false);
  });
});

describe('shared session recreate requests', () => {
  afterEach(() => {
    resetSharedSessionRecreateState();
  });

  it('stores and consumes a recreate request once', () => {
    requestSharedSessionRecreate('pm clear failed');

    const first = consumeSharedSessionRecreate();
    const second = consumeSharedSessionRecreate();

    expect(first).toEqual({
      requested: true,
      reason: 'pm clear failed',
    });
    expect(second).toEqual({ requested: false });
  });

  it('keeps the first reason when multiple requests are made', () => {
    requestSharedSessionRecreate('first');
    requestSharedSessionRecreate('second');

    expect(consumeSharedSessionRecreate()).toEqual({
      requested: true,
      reason: 'first',
    });
  });
});
