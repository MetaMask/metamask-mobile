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

/** The module's own public surface, for use with isolated re-requires. */
type StartupTimelineModule = typeof import('./StartupTimeline');

/**
 * Load a fresh copy of the module with the build-time flags forced.
 *
 * The flags cannot be driven through `process.env` here:
 * `transform-inline-environment-variables` replaces those lookups with literals
 * when Babel transforms the file, long before a test runs. Mocking
 * `StartupTimelineFlags` is what makes the enabled paths reachable at all.
 *
 * @param flags - Flag values to force for this load.
 * @param run - Receives the freshly loaded module.
 */
const withFlags = (
  flags: { timeline?: boolean; profile?: boolean },
  run: (startupTimeline: StartupTimelineModule) => void,
) => {
  jest.isolateModules(() => {
    jest.doMock('./StartupTimelineFlags', () => ({
      TIMELINE_ENABLED: flags.timeline ?? false,
      PROFILE_ENABLED: flags.profile ?? false,
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    run(require('./StartupTimeline') as StartupTimelineModule);
  });
};

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
  // statically imported module above is the disabled variant.
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

    it('does not emit ad-hoc lines or native marks', () => {
      withFlags({ timeline: false }, (startupTimeline) => {
        startupTimeline.emitStartupLine('anything');
        startupTimeline.flushNativeStartupMarks();

        expect(logSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('when enabled', () => {
    const enabled = { timeline: true };

    it('records a mark and emits it with epoch and elapsed time', () => {
      withFlags(enabled, (startupTimeline) => {
        startupTimeline.startupMark('js_bundle_evaluated');

        const [entry] = startupTimeline.getStartupTimeline();
        expect(entry.mark).toBe('js_bundle_evaluated');
        expect(entry.sinceFirstMs).toBe(0);
        expect(entry.epochMs).toBeGreaterThan(0);
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringMatching(
            /^MM_STARTUP js_bundle_evaluated epoch=\d+ since_first=0ms$/u,
          ),
          3,
        );
      });
    });

    it('keeps only the first occurrence of a repeated mark', () => {
      withFlags(enabled, (startupTimeline) => {
        startupTimeline.startupMark('unlock_interactive');
        startupTimeline.startupMark('unlock_interactive');
        startupTimeline.startupMark('unlock_interactive');

        expect(startupTimeline.getStartupTimeline()).toHaveLength(1);
      });
    });

    it('measures each mark relative to the first one', () => {
      withFlags(enabled, (startupTimeline) => {
        const nowSpy = jest
          .spyOn(Date, 'now')
          .mockReturnValueOnce(1_000)
          .mockReturnValueOnce(1_250);

        startupTimeline.startupMark('engine_init_start');
        startupTimeline.startupMark('engine_init_end');

        const [first, second] = startupTimeline.getStartupTimeline();
        expect(first.sinceFirstMs).toBe(0);
        expect(second.sinceFirstMs).toBe(250);
        nowSpy.mockRestore();
      });
    });

    it('emits the whole timeline as one parseable JSON line', () => {
      withFlags(enabled, (startupTimeline) => {
        startupTimeline.startupMark('js_bundle_evaluated');
        startupTimeline.startupMark('homepage_ready');
        logSpy.mockClear();

        startupTimeline.flushStartupTimeline('cold_start');

        expect(logSpy).toHaveBeenCalledTimes(1);
        const [line] = logSpy.mock.calls[0];
        const payload = JSON.parse(line.replace('MM_STARTUP_TIMELINE ', ''));
        expect(payload.label).toBe('cold_start');
        expect(payload.entries.map((e: { mark: string }) => e.mark)).toEqual([
          'js_bundle_evaluated',
          'homepage_ready',
        ]);
      });
    });

    it('does not emit a timeline when no marks were recorded', () => {
      withFlags(enabled, (startupTimeline) => {
        startupTimeline.flushStartupTimeline('cold_start');

        expect(logSpy).not.toHaveBeenCalled();
      });
    });

    it('emits ad-hoc lines on the same prefixed channel', () => {
      withFlags(enabled, (startupTimeline) => {
        startupTimeline.emitStartupLine('CUSTOM key=value');

        expect(logSpy).toHaveBeenCalledWith('MM_STARTUP CUSTOM key=value', 3);
      });
    });
  });

  describe('native startup marks', () => {
    it('emits an anchor, every mark in time order, and a count', () => {
      withFlags({ timeline: true }, (startupTimeline) => {
        jest.doMock('react-native-performance', () => ({
          __esModule: true,
          default: {
            timeOrigin: 1_000,
            now: () => 2_000,
            getEntriesByType: () => [
              { name: 'runJsBundleEnd', startTime: 1_930.4 },
              { name: 'nativeLaunchStart', startTime: 0 },
            ],
          },
        }));

        startupTimeline.flushNativeStartupMarks();

        const lines = logSpy.mock.calls.map(([line]) => line);
        expect(lines[0]).toContain(
          'MM_STARTUP_NATIVE _anchor time_origin=1000',
        );
        // Unsorted input, sorted output.
        expect(lines[1]).toBe('MM_STARTUP_NATIVE nativeLaunchStart t=0');
        expect(lines[2]).toBe('MM_STARTUP_NATIVE runJsBundleEnd t=1930');
        expect(lines[3]).toBe('MM_STARTUP_NATIVE _count 2');
      });
    });

    it('reports a failure line instead of throwing when the bridge is unavailable', () => {
      withFlags({ timeline: true }, (startupTimeline) => {
        jest.doMock('react-native-performance', () => {
          throw new Error('no native module');
        });

        expect(() => startupTimeline.flushNativeStartupMarks()).not.toThrow();
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('MM_STARTUP_NATIVE _failed'),
          3,
        );
      });
    });
  });

  describe('startup CPU profile', () => {
    const profiling = { timeline: true, profile: true };

    it('is inert unless MM_STARTUP_PROFILE is set, even with the timeline on', () => {
      withFlags({ timeline: true, profile: false }, (startupTimeline) => {
        const startProfiling = jest.fn();
        jest.doMock('react-native-release-profiler', () => ({
          startProfiling,
          stopProfiling: jest.fn(),
        }));

        startupTimeline.startStartupProfile();

        expect(startProfiling).not.toHaveBeenCalled();
        expect(logSpy).not.toHaveBeenCalled();
      });
    });

    it('starts once and reports it', () => {
      withFlags(profiling, (startupTimeline) => {
        const startProfiling = jest.fn();
        jest.doMock('react-native-release-profiler', () => ({
          startProfiling,
          stopProfiling: jest.fn(),
        }));

        startupTimeline.startStartupProfile();
        startupTimeline.startStartupProfile();

        expect(startProfiling).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith('MM_STARTUP profile_started', 3);
      });
    });

    it('reports a failure instead of throwing when the profiler cannot start', () => {
      withFlags(profiling, (startupTimeline) => {
        jest.doMock('react-native-release-profiler', () => ({
          startProfiling: () => {
            throw new Error('profiler unavailable');
          },
          stopProfiling: jest.fn(),
        }));

        expect(() => startupTimeline.startStartupProfile()).not.toThrow();
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('MM_STARTUP profile_start_failed'),
          3,
        );
      });
    });

    it('stops the profile and logs where the trace was written', async () => {
      let pending: Promise<void> = Promise.resolve();

      withFlags(profiling, (startupTimeline) => {
        const stopProfiling = jest.fn().mockResolvedValue('/sdcard/trace.json');
        jest.doMock('react-native-release-profiler', () => ({
          startProfiling: jest.fn(),
          stopProfiling,
        }));

        startupTimeline.startStartupProfile();
        pending = startupTimeline.stopStartupProfile().then(() => {
          expect(stopProfiling).toHaveBeenCalledWith(true);
          expect(logSpy).toHaveBeenCalledWith(
            'MM_STARTUP profile_saved /sdcard/trace.json',
            3,
          );
        });
      });

      await pending;
    });

    it('does nothing when stopped without having started', async () => {
      let pending: Promise<void> = Promise.resolve();

      withFlags(profiling, (startupTimeline) => {
        pending = startupTimeline.stopStartupProfile();
      });

      await pending;
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('reports a failure instead of rejecting when the profile cannot be written', async () => {
      let pending: Promise<void> = Promise.resolve();

      withFlags(profiling, (startupTimeline) => {
        jest.doMock('react-native-release-profiler', () => ({
          startProfiling: jest.fn(),
          stopProfiling: jest.fn().mockRejectedValue(new Error('disk full')),
        }));

        startupTimeline.startStartupProfile();
        pending = startupTimeline.stopStartupProfile();
      });

      await expect(pending).resolves.toBeUndefined();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('MM_STARTUP profile_stop_failed'),
        3,
      );
    });
  });

  describe('resetStartupTimelineForTesting', () => {
    it('clears recorded marks', () => {
      startupMark('js_bundle_evaluated');
      resetStartupTimelineForTesting();

      expect(getStartupTimeline()).toEqual([]);
    });

    it('allows a mark to be recorded again after a reset', () => {
      withFlags({ timeline: true }, (startupTimeline) => {
        startupTimeline.startupMark('homepage_ready');
        startupTimeline.resetStartupTimelineForTesting();
        startupTimeline.startupMark('homepage_ready');

        expect(startupTimeline.getStartupTimeline()).toHaveLength(1);
      });
    });
  });

  it('tolerates a missing nativeLoggingHook', () => {
    delete getGlobal().nativeLoggingHook;

    expect(() => startupMark('app_services_ready')).not.toThrow();
    expect(() => flushStartupTimeline('cold_start')).not.toThrow();
  });
});
