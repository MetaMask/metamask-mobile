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

  it('returns false for ordinary assertion failures', () => {
    expect(
      isDeviceHealthError(
        new Error('Timed out: expected "Connected", got "Not connected"'),
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
