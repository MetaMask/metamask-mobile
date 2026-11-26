import type { MetricStep, NetworkLogEntry } from '../types';
import {
  attributeApiCallsToSteps,
  getTestWindow,
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
      [call(1_500), call(5_000), call(undefined)],
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
    const testWin = { start: 90_000, end: 120_000 };

    it('flags skewed when many calls fall outside the test window', () => {
      const offset = testWin.end + TEST_WINDOW_TOLERANCE_MS + 60_000;
      const calls = [
        ...Array.from({ length: 6 }, () => call(offset)),
        ...Array.from({ length: 6 }, () => call(105_000)),
      ];

      const { attribution } = attributeApiCallsToSteps(calls, steps, testWin);

      expect(attribution).toMatchObject({
        status: 'skewed',
        outsideTestWindow: 6,
      });
      expect(attribution.reason).toContain('outside the test window');
    });

    it('flags skewed when nearly all calls match no step', () => {
      const calls = [
        ...Array.from({ length: 11 }, () => call(95_000)),
        call(105_000),
      ];

      const { attribution } = attributeApiCallsToSteps(calls, steps, testWin);

      expect(attribution.status).toBe('skewed');
      expect(attribution.reason).toContain('match no step');
    });

    it('stays ok when calls before the first step are inside the test window', () => {
      const calls = [
        ...Array.from({ length: 5 }, () => call(95_000)),
        ...Array.from({ length: 6 }, () => call(105_000)),
      ];

      expect(
        attributeApiCallsToSteps(calls, steps, testWin).attribution,
      ).toEqual(
        expect.objectContaining({ status: 'ok', outsideTestWindow: 0 }),
      );
    });

    it('does not judge skew on very few calls', () => {
      expect(
        attributeApiCallsToSteps([call(1)], steps, testWin).attribution.status,
      ).toBe('ok');
    });
  });
});

describe('getTestWindow', () => {
  it('derives the window from the end timestamp and test duration', () => {
    expect(
      getTestWindow({
        timestamp: '2026-11-26T11:00:10.000Z',
        testDuration: 10_000,
      }),
    ).toEqual({
      start: Date.parse('2026-11-26T11:00:00.000Z'),
      end: Date.parse('2026-11-26T11:00:10.000Z'),
    });
  });

  it('returns null when timestamp or duration is missing or invalid', () => {
    expect(getTestWindow({ testDuration: 1 })).toBeNull();
    expect(getTestWindow({ timestamp: 'nope', testDuration: 1 })).toBeNull();
    expect(getTestWindow({ timestamp: '2026-11-26T11:00:10Z' })).toBeNull();
  });
});

describe('summarizeApiCallsByStep', () => {
  it('adds steps and attribution to a captured summary', () => {
    const summary = summarizeApiCallsByStep({
      apiCalls: [call(1_500)],
      steps: [step('open TDP', 1_000, 2_000)],
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
