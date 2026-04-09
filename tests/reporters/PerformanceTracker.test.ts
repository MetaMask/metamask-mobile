jest.mock('../framework/logger.ts', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

import { PerformanceTracker } from './PerformanceTracker';

function makeTimer(
  overrides: Partial<{
    id: string;
    threshold: number | null;
    baseThreshold: number | null;
    duration: number | null;
    durationInSeconds: number;
    hasThresholdVal: boolean;
  }> = {},
) {
  const {
    id = 'step-1',
    threshold = 1000,
    baseThreshold = 900,
    duration = 500,
    durationInSeconds = 0.5,
    hasThresholdVal = threshold !== null,
  } = overrides;
  return {
    id,
    threshold,
    baseThreshold,
    getDuration: jest.fn(() => duration),
    getDurationInSeconds: jest.fn(() => durationInSeconds),
    hasThreshold: jest.fn(() => hasThresholdVal),
  };
}

describe('PerformanceTracker', () => {
  let tracker: PerformanceTracker;

  beforeEach(() => {
    tracker = new PerformanceTracker();
  });

  describe('addTimer', () => {
    it('adds a timer', () => {
      const timer = makeTimer();
      tracker.addTimer(timer);
      expect(tracker.timers).toHaveLength(1);
      expect(tracker.timers[0].id).toBe('step-1');
    });

    it('prevents duplicates by id', () => {
      const timer1 = makeTimer({ id: 'dup' });
      const timer2 = makeTimer({ id: 'dup', threshold: 2000 });
      tracker.addTimer(timer1);
      tracker.addTimer(timer2);
      expect(tracker.timers).toHaveLength(1);
    });
  });

  describe('addTimers', () => {
    it('adds multiple timers', () => {
      tracker.addTimers(makeTimer({ id: 'a' }), makeTimer({ id: 'b' }));
      expect(tracker.timers).toHaveLength(2);
    });

    it('skips duplicates', () => {
      tracker.addTimers(
        makeTimer({ id: 'x' }),
        makeTimer({ id: 'x' }),
        makeTimer({ id: 'y' }),
      );
      expect(tracker.timers).toHaveLength(2);
    });
  });

  describe('setTeamInfo', () => {
    it('stores team info', () => {
      const teamInfo = { teamId: 't1', teamName: 'Team One' };
      tracker.setTeamInfo(teamInfo);
      expect(tracker.teamInfo).toBe(teamInfo);
    });
  });

  describe('attachToTest', () => {
    function makeTestInfo(overrides: Record<string, unknown> = {}) {
      return {
        title: 'Test Title',
        attach: jest.fn().mockResolvedValue(undefined),
        project: {
          use: {
            device: {
              name: 'Pixel 6',
              osVersion: '12',
              provider: 'browserstack',
            },
          },
        },
        ...overrides,
      };
    }

    it('creates MetricsOutput with steps, totals, thresholds, and validations', async () => {
      tracker.addTimer(
        makeTimer({
          id: 'step-1',
          threshold: 1000,
          duration: 500,
          durationInSeconds: 0.5,
        }),
      );
      tracker.addTimer(
        makeTimer({
          id: 'step-2',
          threshold: 2000,
          duration: 1500,
          durationInSeconds: 1.5,
        }),
      );
      tracker.setTeamInfo({ teamId: 't1', teamName: 'Team' });

      const testInfo = makeTestInfo();
      const result = await tracker.attachToTest(testInfo);

      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].name).toBe('step-1');
      expect(result.steps[0].duration).toBe(500);
      expect(result.steps[0].validation?.passed).toBe(true);
      expect(result.steps[1].name).toBe('step-2');
      expect(result.steps[1].validation?.passed).toBe(true);
      expect(result.total).toBe(2);
      expect(result.totalThreshold).toBe(3000);
      expect(result.hasThresholds).toBe(true);
      expect(result.totalValidation?.passed).toBe(true);
      expect(result.team).toEqual({ teamId: 't1', teamName: 'Team' });
      expect(result.device).toEqual({
        name: 'Pixel 6',
        osVersion: '12',
        provider: 'browserstack',
      });
    });

    it('calls testInfo.attach with correct arguments', async () => {
      tracker.addTimer(makeTimer());
      const testInfo = makeTestInfo();
      await tracker.attachToTest(testInfo);

      expect(testInfo.attach).toHaveBeenCalledWith(
        'performance-metrics-Test Title',
        expect.objectContaining({ contentType: 'application/json' }),
      );
    });

    it('skips timers with null duration', async () => {
      tracker.addTimer(
        makeTimer({ id: 'null-dur', duration: null, durationInSeconds: 0 }),
      );
      const testInfo = makeTestInfo();
      const result = await tracker.attachToTest(testInfo);
      expect(result.steps).toHaveLength(0);
    });

    it('skips timers with NaN duration', async () => {
      tracker.addTimer(
        makeTimer({ id: 'nan-dur', duration: NaN, durationInSeconds: 0 }),
      );
      const testInfo = makeTestInfo();
      const result = await tracker.attachToTest(testInfo);
      expect(result.steps).toHaveLength(0);
    });

    it('skips timers with zero duration', async () => {
      tracker.addTimer(
        makeTimer({ id: 'zero-dur', duration: 0, durationInSeconds: 0 }),
      );
      const testInfo = makeTestInfo();
      const result = await tracker.attachToTest(testInfo);
      expect(result.steps).toHaveLength(0);
    });

    it('handles attach failure by rethrowing', async () => {
      tracker.addTimer(makeTimer());
      const testInfo = makeTestInfo({
        attach: jest.fn().mockRejectedValue(new Error('attach failed')),
      });

      await expect(tracker.attachToTest(testInfo)).rejects.toThrow(
        'attach failed',
      );
    });

    it('sets device info to Unknown defaults when testInfo has no device', async () => {
      tracker.addTimer(makeTimer());
      const testInfo = makeTestInfo({ project: undefined });
      const result = await tracker.attachToTest(testInfo);
      expect(result.device).toEqual({
        name: 'Unknown',
        osVersion: 'Unknown',
        provider: 'unknown',
      });
    });

    it('marks totalValidation as failed when total exceeds threshold', async () => {
      tracker.addTimer(
        makeTimer({
          id: 's1',
          threshold: 500,
          duration: 800,
          durationInSeconds: 0.8,
        }),
      );
      const testInfo = makeTestInfo();
      const result = await tracker.attachToTest(testInfo);

      expect(result.totalValidation?.passed).toBe(false);
      expect(result.totalValidation?.exceeded).toBeGreaterThan(0);
      expect(result.totalValidation?.percentOver).toMatch(/%$/);
    });

    it('sets totalThreshold to null when not all timers have thresholds', async () => {
      tracker.addTimer(
        makeTimer({
          id: 's1',
          threshold: 1000,
          duration: 500,
          durationInSeconds: 0.5,
        }),
      );
      tracker.addTimer(
        makeTimer({
          id: 's2',
          threshold: null,
          duration: 300,
          durationInSeconds: 0.3,
          hasThresholdVal: false,
        }),
      );
      const testInfo = makeTestInfo();
      const result = await tracker.attachToTest(testInfo);

      expect(result.totalThreshold).toBeNull();
      expect(result.totalValidation).toBeNull();
    });

    it('marks step validation as failed when duration exceeds threshold', async () => {
      tracker.addTimer(
        makeTimer({
          id: 'slow',
          threshold: 100,
          duration: 200,
          durationInSeconds: 0.2,
        }),
      );
      const testInfo = makeTestInfo();
      const result = await tracker.attachToTest(testInfo);

      expect(result.steps[0].validation?.passed).toBe(false);
      expect(result.steps[0].validation?.exceeded).toBe(100);
      expect(result.steps[0].validation?.percentOver).toBe('100.0%');
    });
  });
});
