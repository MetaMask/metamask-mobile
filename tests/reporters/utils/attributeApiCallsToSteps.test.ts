import type { MetricStep, NetworkLogEntry } from '../types';
import {
  AFTER_MAX_MS,
  attributeApiCallsToSteps,
  getTestWindow,
  networkLogOverlapsSteps,
  PRE_ROLL_MS,
  summarizeApiCallsByStep,
  TEST_WINDOW_TOLERANCE_MS,
  UNATTRIBUTED_STEP,
} from './attributeApiCallsToSteps';

const step = (
  name: string,
  startedAt: number,
  endedAt: number,
): MetricStep => ({
  name,
  duration: endedAt - startedAt,
  baseThreshold: null,
  threshold: null,
  startedAt,
  endedAt,
});

const call = (
  startedAt: number | undefined,
  url = 'https://api.example.com/a',
  status = 200,
): NetworkLogEntry => ({ method: 'GET', url, status, startedAt });

describe('attributeApiCallsToSteps', () => {
  it('assigns calls to the step window that contains their start time (inclusive)', () => {
    const { steps, attribution } = attributeApiCallsToSteps(
      [call(1_000), call(1_500), call(2_000), call(2_500, undefined, 500)],
      [step('open TDP', 1_000, 2_000), step('tap Add Funds', 2_200, 3_000)],
    );

    expect(steps).toEqual([
      expect.objectContaining({ step: 'open TDP', total: 3, failed: 0 }),
      expect.objectContaining({ step: 'tap Add Funds', total: 1, failed: 1 }),
    ]);
    expect(attribution).toMatchObject({
      status: 'ok',
      attributed: 4,
      unattributed: 0,
    });
  });

  it('puts calls outside every step, or without a timestamp, in unattributed', () => {
    const { steps, attribution } = attributeApiCallsToSteps(
      [call(1_500), call(20_000), call(undefined)],
      [step('open TDP', 1_000, 2_000)],
    );

    expect(steps.map(({ step: name, total }) => [name, total])).toEqual([
      ['open TDP', 1],
      [UNATTRIBUTED_STEP, 2],
    ]);
    expect(attribution).toMatchObject({
      attributed: 1,
      unattributed: 2,
      missingTimestamp: 1,
    });
  });

  describe('pre-roll and after phases', () => {
    const phaseTotals = (
      calls: NetworkLogEntry[],
      steps: MetricStep[],
    ): Record<string, number> =>
      Object.fromEntries(
        attributeApiCallsToSteps(calls, steps).steps.map((summary) => [
          `${summary.step}:${summary.phase}`,
          summary.total,
        ]),
      );

    it('counts calls up to the pre-roll before a step start as during', () => {
      const steps = [step('tap Add Funds', 10_000, 11_000)];

      expect(
        phaseTotals(
          [call(10_000 - PRE_ROLL_MS), call(10_000 - PRE_ROLL_MS - 1)],
          steps,
        ),
      ).toEqual({ 'tap Add Funds:during': 1, 'unattributed:none': 1 });
    });

    it('keeps calls after a step end in a separate after bucket, capped at AFTER_MAX_MS', () => {
      const steps = [step('tap Add Funds', 10_000, 11_000)];

      expect(
        phaseTotals(
          [
            call(11_001),
            call(11_000 + AFTER_MAX_MS),
            call(11_000 + AFTER_MAX_MS + 1),
          ],
          steps,
        ),
      ).toEqual({ 'tap Add Funds:after': 2, 'unattributed:none': 1 });
    });

    it('resolves during > pre-roll > after without double counting', () => {
      const steps = [step('A', 1_000, 2_000), step('B', 3_000, 4_000)];
      const calls = [
        call(1_500), // A during
        call(2_100), // A after (B pre-roll starts at 2_250)
        call(2_300), // B pre-roll beats A after
        call(3_500), // B during
        call(4_500), // B after
      ];

      const totals = phaseTotals(calls, steps);

      expect(totals).toEqual({
        'A:during': 1,
        'B:during': 2,
        'A:after': 1,
        'B:after': 1,
      });
      expect(Object.values(totals).reduce((sum, n) => sum + n, 0)).toBe(
        calls.length,
      );
    });

    it('lets an enclosing step own its inner step after phase', () => {
      const steps = [step('outer', 0, 10_000), step('inner', 4_000, 5_000)];

      expect(phaseTotals([call(5_500)], steps)).toEqual({
        'outer:during': 1,
      });
    });

    it('gives an after call to the most recently ended step, independent of order', () => {
      const first = step('first', 1_000, 2_000);
      const second = step('second', 1_500, 2_500);

      for (const ordered of [
        [first, second],
        [second, first],
      ]) {
        expect(phaseTotals([call(3_000)], ordered)).toEqual({
          'second:after': 1,
        });
      }
    });

    it('counts after-only calls as attributed', () => {
      const { attribution } = attributeApiCallsToSteps(
        [call(11_500)],
        [step('tap', 10_000, 11_000)],
      );

      expect(attribution).toMatchObject({ status: 'ok', attributed: 1 });
    });
  });

  it('picks the shortest window for overlapping timers regardless of order', () => {
    const outer = step('whole flow', 0, 10_000);
    const inner = step('tap Add Funds', 4_000, 5_000);
    const calls = [call(4_500), call(8_000)];

    for (const ordered of [
      [outer, inner],
      [inner, outer],
    ]) {
      const { steps } = attributeApiCallsToSteps(calls, ordered);
      expect(
        Object.fromEntries(steps.map(({ step: name, total }) => [name, total])),
      ).toEqual({ 'tap Add Funds': 1, 'whole flow': 1 });
    }
  });

  it('breaks equal-length ties by latest start', () => {
    const { steps } = attributeApiCallsToSteps(
      [call(1_500)],
      [step('earlier', 1_000, 2_000), step('later', 1_500, 2_500)],
    );

    expect(steps).toEqual([expect.objectContaining({ step: 'later' })]);
  });

  it('caps top endpoints per step', () => {
    const calls = Array.from({ length: 15 }, (_, index) =>
      call(1_500, `https://api.example.com/e${index}`),
    );

    const { steps } = attributeApiCallsToSteps(
      calls,
      [step('open TDP', 1_000, 2_000)],
      null,
      10,
    );

    expect(steps[0].total).toBe(15);
    expect(steps[0].topEndpoints).toHaveLength(10);
  });

  it('is unavailable without step windows or request timestamps', () => {
    expect(
      attributeApiCallsToSteps(
        [call(1_000)],
        [
          {
            name: 'running',
            duration: 1,
            baseThreshold: null,
            threshold: null,
          },
        ],
      ),
    ).toEqual({
      steps: [],
      attribution: expect.objectContaining({ status: 'unavailable' }),
    });
    expect(
      attributeApiCallsToSteps([call(undefined)], [step('s', 0, 1)]).attribution
        .status,
    ).toBe('unavailable');
  });

  describe('clock skew', () => {
    const steps = [step('s', 100_000, 110_000)];
    const testWin = { start: 40_000, end: 130_000 };
    const many = (count: number, time: number) =>
      Array.from({ length: count }, () => call(time));

    it('flags skewed when many calls fall outside the real test window', () => {
      const late = testWin.end + TEST_WINDOW_TOLERANCE_MS + 60_000;
      const calls = [...many(6, late), ...many(6, 105_000)];

      const { attribution } = attributeApiCallsToSteps(calls, steps, testWin);

      expect(attribution).toMatchObject({
        status: 'skewed',
        outsideTestWindow: 6,
      });
      expect(attribution.reason).toContain('outside the test window');
    });

    it('does not flag unattributed calls inside the test window (launch, login)', () => {
      const calls = [...many(416, 50_000), ...many(68, 105_000)];

      expect(
        attributeApiCallsToSteps(calls, steps, testWin).attribution,
      ).toMatchObject({
        status: 'ok',
        outsideTestWindow: 0,
        unattributed: 416,
      });
    });

    it('allows HAR start before and teardown after the test within the tolerance', () => {
      const calls = [
        ...many(5, testWin.start - TEST_WINDOW_TOLERANCE_MS),
        ...many(5, testWin.end + TEST_WINDOW_TOLERANCE_MS),
        ...many(5, 105_000),
      ];

      expect(
        attributeApiCallsToSteps(calls, steps, testWin).attribution.status,
      ).toBe('ok');
    });

    it('never flags outside-window skew without a real test window', () => {
      expect(
        attributeApiCallsToSteps(
          [...many(20, 50_000), call(105_000)],
          steps,
          null,
        ).attribution,
      ).toMatchObject({ status: 'ok', outsideTestWindow: 0 });
    });

    it('does not judge the outside-window share on very few calls', () => {
      expect(
        attributeApiCallsToSteps([call(1_000_000)], steps, testWin).attribution
          .status,
      ).toBe('no_overlap');
      expect(
        attributeApiCallsToSteps(
          [call(1_000_000), call(105_000)],
          steps,
          testWin,
        ).attribution.status,
      ).toBe('ok');
    });

    it('reports no_overlap when the HAR ends before the first step', () => {
      const { attribution } = attributeApiCallsToSteps(
        [call(10_000), call(20_000)],
        steps,
        testWin,
      );

      expect(attribution).toMatchObject({
        status: 'no_overlap',
        attributed: 0,
      });
    });

    it('uses the request duration when checking HAR / step overlap', () => {
      const slow = { ...call(99_000), time: 5_000 };

      expect(
        attributeApiCallsToSteps([slow], steps, testWin).attribution.status,
      ).toBe('ok');
    });

    it('stays ok when steps are quiet but the HAR spans them', () => {
      const calls = [call(50_000), call(120_000)];

      expect(
        attributeApiCallsToSteps(calls, steps, testWin).attribution,
      ).toMatchObject({ status: 'ok', attributed: 0 });
    });
  });
});

describe('networkLogOverlapsSteps', () => {
  const steps = [step('s', 100_000, 110_000)];

  it('is true when the HAR timespan intersects the steps', () => {
    expect(networkLogOverlapsSteps([call(50_000), call(105_000)], steps)).toBe(
      true,
    );
  });

  it('is false for a HAR entirely before the steps or without data', () => {
    expect(networkLogOverlapsSteps([call(10_000)], steps)).toBe(false);
    expect(networkLogOverlapsSteps([], steps)).toBe(false);
    expect(networkLogOverlapsSteps(null, steps)).toBe(false);
    expect(networkLogOverlapsSteps([call(105_000)], undefined)).toBe(false);
  });
});

describe('getTestWindow', () => {
  it('uses the recorded test start and end', () => {
    expect(getTestWindow({ testStartedAt: 1_000, testEndedAt: 5_000 })).toEqual(
      { start: 1_000, end: 5_000 },
    );
  });

  it('returns null when either bound is missing or invalid', () => {
    expect(getTestWindow({ testStartedAt: 1_000 })).toBeNull();
    expect(getTestWindow({ testEndedAt: 5_000 })).toBeNull();
    expect(
      getTestWindow({ testStartedAt: Number.NaN, testEndedAt: 5_000 }),
    ).toBeNull();
  });
});

describe('summarizeApiCallsByStep', () => {
  it('adds steps and attribution to a captured summary', () => {
    const summary = summarizeApiCallsByStep({
      apiCalls: [call(1_500)],
      steps: [step('open TDP', 1_000, 2_000)],
      testStartedAt: 0,
      testEndedAt: 3_000,
    });

    expect(summary).toMatchObject({
      status: 'captured',
      total: 1,
      steps: [{ step: 'open TDP', total: 1 }],
      stepAttribution: { status: 'ok' },
    });
  });

  it('passes through capture errors and missing captures', () => {
    expect(
      summarizeApiCallsByStep({ apiCalls: null, apiCallsError: 'boom' }),
    ).toEqual({ status: 'error', error: 'boom' });
    expect(summarizeApiCallsByStep({ apiCalls: null })).toBeNull();
  });
});
