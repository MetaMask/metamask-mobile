import {
  consumeSharedSessionRecreate,
  isDeviceHealthError,
  requestSharedSessionRecreate,
  resetSharedSessionRecreateState,
} from './sessionRecovery.ts';

describe('isDeviceHealthError', () => {
  it('returns true for pm clear and MainActivity failures', () => {
    expect(
      isDeviceHealthError(
        new Error('Command failed: adb shell pm clear io.metamask'),
      ),
    ).toBe(true);
    expect(
      isDeviceHealthError(
        new Error(
          'Activity class {io.metamask/io.metamask.MainActivity} does not exist.',
        ),
      ),
    ).toBe(true);
  });

  it('returns true for UiAutomator2 instrumentation crashes', () => {
    expect(
      isDeviceHealthError(
        new Error(
          "'POST /element' cannot be proxied to UiAutomator2 server because the instrumentation process is not running (probably crashed).",
        ),
      ),
    ).toBe(true);
    expect(
      isDeviceHealthError(
        new Error('instrumentation process cannot be initialized'),
      ),
    ).toBe(true);
  });

  it('returns false for ordinary assertion failures', () => {
    expect(
      isDeviceHealthError(
        new Error('Timed out: expected "Connected", got "Not connected"'),
      ),
    ).toBe(false);
    expect(
      isDeviceHealthError(
        new Error(
          'App did not reach login or wallet home within 60000ms. This may indicate rehydration issues or state corruption.',
        ),
      ),
    ).toBe(false);
  });
});

describe('shared session recreate requests', () => {
  afterEach(() => {
    resetSharedSessionRecreateState();
  });

  it('stores and consumes a recreate request once', () => {
    requestSharedSessionRecreate();

    expect(consumeSharedSessionRecreate()).toBe(true);
    expect(consumeSharedSessionRecreate()).toBe(false);
  });
});
