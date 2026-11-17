import {
  endTrace,
  getPerformanceTimestamp,
  trace,
  TraceName,
  TraceOperation,
} from '../trace';
import Performance from '../../core/Performance/Performance';
import {
  recordPreUnlockLoginVisible,
  recordPreUnlockPersistControllerLoad,
  resetPreUnlockStartupTelemetryForTests,
  tracePreUnlockInitFunction,
  utf8ByteLength,
  getPreUnlockProcessStartEpochMs,
  markPreUnlockMilestone,
} from './preUnlockStartupTelemetry';

jest.mock('../trace', () => {
  const actual = jest.requireActual('../trace');
  return {
    ...actual,
    trace: jest.fn(actual.trace),
    endTrace: jest.fn(actual.endTrace),
    getPerformanceTimestamp: jest.fn(actual.getPerformanceTimestamp),
    annotateTraceByRequest: jest.fn(),
    getTraceContext: jest.fn(),
    setTraceMeasurement: jest.fn(),
  };
});

jest.mock('../../core/Performance/Performance', () => ({
  __esModule: true,
  default: { appLaunchTime: undefined as number | undefined },
}));

describe('preUnlockStartupTelemetry', () => {
  beforeEach(() => {
    resetPreUnlockStartupTelemetryForTests();
    jest.clearAllMocks();
    (Performance as { appLaunchTime: number | undefined }).appLaunchTime =
      undefined;
  });

  describe('utf8ByteLength', () => {
    it('returns UTF-8 byte length for ASCII', () => {
      expect(utf8ByteLength('persist')).toBe(7);
    });

    it('counts multibyte code points', () => {
      expect(utf8ByteLength('é')).toBeGreaterThan(1);
    });
  });

  describe('getPreUnlockProcessStartEpochMs', () => {
    it('prefers native app launch time when available', () => {
      Performance.appLaunchTime = 1_700_000_000_000;

      expect(getPreUnlockProcessStartEpochMs()).toBe(1_700_000_000_000);
    });

    it('falls back to performance timestamp once when launch time is unknown', () => {
      jest.mocked(getPerformanceTimestamp).mockReturnValue(99);

      expect(getPreUnlockProcessStartEpochMs()).toBe(99);
      expect(getPreUnlockProcessStartEpochMs()).toBe(99);
    });
  });

  describe('recordPreUnlockPersistControllerLoad', () => {
    it('emits child span with bytes and parse_ms tags', () => {
      recordPreUnlockPersistControllerLoad('KeyringController', {
        bytes: 4096,
        parseMs: 12.5,
        hadFile: true,
      });

      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.PreUnlockPersistControllerLoad,
          id: 'KeyringController',
          op: TraceOperation.PreUnlockPersistControllerLoad,
          tags: expect.objectContaining({
            controller: 'KeyringController',
            bytes: 4096,
            parse_ms: 12.5,
            had_file: true,
          }),
        }),
      );
      expect(endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.PreUnlockPersistControllerLoad,
          id: 'KeyringController',
        }),
      );
    });
  });

  describe('markPreUnlockMilestone', () => {
    it('annotates UIStartup with milestone duration', () => {
      const { annotateTraceByRequest } = jest.requireMock('../trace');
      Performance.appLaunchTime = 1_000;
      jest.mocked(getPerformanceTimestamp).mockReturnValue(1_250);

      markPreUnlockMilestone('M1');

      expect(annotateTraceByRequest).toHaveBeenCalledWith(
        { name: TraceName.UIStartup },
        { 'pre_unlock.milestone.M1_ms': 250 },
      );
    });
  });

  describe('recordPreUnlockLoginVisible', () => {
    it('logs milestones and init function durations in dev', () => {
      const infoSpy = jest.spyOn(console, 'info').mockImplementation();
      const devGlobal = global as unknown as { __DEV__: boolean };
      devGlobal.__DEV__ = true;
      Performance.appLaunchTime = 1_000;
      jest.mocked(getPerformanceTimestamp).mockReturnValue(1_250);

      const result = tracePreUnlockInitFunction('ExampleController', () => 7);
      recordPreUnlockLoginVisible();
      devGlobal.__DEV__ = false;

      const summary = JSON.parse(
        String(infoSpy.mock.calls[0][0]).replace(
          '[pre-unlock telemetry] summary ',
          '',
        ),
      );
      expect(result).toBe(7);
      expect(summary.milestones.M7.ms).toBe(250);
      expect(summary.init_functions.count).toBe(1);
      expect(summary.init_functions.top[0][0]).toBe('ExampleController');
      infoSpy.mockRestore();
    });
  });
});
