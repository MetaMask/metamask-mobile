import {
  ENABLED,
  flushStartupTimeline,
  getStartupTimeline,
  resetStartupTimelineForTesting,
  startupMark,
} from './StartupTimeline';

interface GlobalWithLoggingHook {
  nativeLoggingHook?: (message: string, logLevel: number) => void;
}

const getGlobal = () => globalThis as typeof globalThis & GlobalWithLoggingHook;

describe('StartupTimeline', () => {
  let logSpy: jest.Mock<void, [string, number]>;
  let originalHook: GlobalWithLoggingHook['nativeLoggingHook'];

  beforeEach(() => {
    resetStartupTimelineForTesting();
    logSpy = jest.fn();
    originalHook = getGlobal().nativeLoggingHook;
    getGlobal().nativeLoggingHook = logSpy;
  });

  afterEach(() => {
    getGlobal().nativeLoggingHook = originalHook;
  });

  // The module is gated on a build-time env var that is inlined by
  // `transform-inline-environment-variables`. Under Jest it is unset, so the
  // disabled path is what the suite can exercise directly.
  it('is disabled unless MM_STARTUP_TIMELINE is set at build time', () => {
    expect(ENABLED).toBe(false);
  });

  describe('when disabled', () => {
    it('records nothing and never touches the platform log', () => {
      startupMark('js_bundle_evaluated');
      startupMark('app_services_ready');

      expect(getStartupTimeline()).toEqual([]);
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('does not emit a timeline on flush', () => {
      flushStartupTimeline('cold_start');

      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('resetStartupTimelineForTesting', () => {
    it('clears recorded marks', () => {
      startupMark('js_bundle_evaluated');
      resetStartupTimelineForTesting();

      expect(getStartupTimeline()).toEqual([]);
    });
  });

  it('tolerates a missing nativeLoggingHook', () => {
    delete getGlobal().nativeLoggingHook;

    expect(() => startupMark('app_services_ready')).not.toThrow();
    expect(() => flushStartupTimeline('cold_start')).not.toThrow();
  });
});
