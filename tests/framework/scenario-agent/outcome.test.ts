import {
  buildScenarioOutcome,
  cacheCorrections,
  cacheEntrySnippet,
  classifyOutcome,
  computeCacheDrift,
  type ScenarioOutcome,
} from './outcome.ts';
import { parseScenario } from './scenario.ts';
import type { AgentRunResult } from './types.ts';

const MD_PATH = 'tests/performance/login/scenarios/demo.scenario.md';

const MARKDOWN = `# Demo [scenario shadow]

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
2. Tap the Swap button on the wallet home
3. Expect: the swap screen is visible
4. Tap Review [check: testID=confirm-button]
5. Expect: the quote is shown [check: testID=quote text=/[1-9]/]

## Timers

- Measure from step 2 until step 3 (Android 2500 ms, iOS 2000 ms): swap opens
- Measure from step 4 until step 5 (Android 3000 ms, iOS 9000 ms): quote shows
`;

const OLD_CACHE = {
  'Tap the Swap button on the wallet home': [
    {
      type: 'tap',
      locator: { strategy: 'testID', value: 'wallet-swap-button' },
    },
  ],
  'the swap screen is visible': [
    {
      type: 'expect',
      locator: { strategy: 'testID', value: 'old-swap-screen' },
    },
  ],
};

const HEALED_CACHE = {
  ...OLD_CACHE,
  'the swap screen is visible': [
    {
      type: 'expect',
      locator: { strategy: 'testID', value: 'swap-screen-v2' },
    },
  ],
};

function runResult(overrides: Partial<AgentRunResult> = {}): AgentRunResult {
  return {
    status: 'INVALID_MEASUREMENT',
    steps: [
      {
        number: 2,
        text: 'Tap the Swap button on the wallet home',
        source: 'cache',
        actions: OLD_CACHE['Tap the Swap button on the wallet home'] as never,
      },
      {
        number: 3,
        text: 'the swap screen is visible',
        source: 'agent',
        actions: HEALED_CACHE['the swap screen is visible'] as never,
      },
    ],
    timers: [
      {
        name: 'swap opens',
        valid: false,
        durationMs: null,
        reason: 'end element testID=old-swap-screen did not appear: timeout',
      },
      { name: 'quote shows', valid: true, durationMs: 1200 },
    ],
    changedSteps: [3],
    modelCalls: 2,
    ...overrides,
  };
}

function outcome(
  result: AgentRunResult = runResult(),
  thresholdViolations: string[] = [],
): ScenarioOutcome {
  return buildScenarioOutcome({
    scenario: parseScenario(MARKDOWN),
    scenarioPath: MD_PATH,
    result,
    cacheBefore: OLD_CACHE as never,
    cacheAfter: HEALED_CACHE as never,
    thresholdViolations,
  });
}

describe('classifyOutcome', () => {
  it('heals a stale cached end element that the agent re-resolved after the window', () => {
    const result = classifyOutcome(outcome());

    expect(result).toEqual(
      expect.objectContaining({
        category: 'heal',
        step: 3,
        reason: expect.stringContaining('"swap opens"'),
      }),
    );
  });

  it('never repairs a pinned end check that did not appear', () => {
    const result = classifyOutcome(
      outcome(
        runResult({
          timers: [
            { name: 'swap opens', valid: true, durationMs: 900 },
            {
              name: 'quote shows',
              valid: false,
              durationMs: null,
              reason: 'end element testID=quote did not appear',
            },
          ],
          changedSteps: [5],
        }),
      ),
    );

    expect(result).toEqual(
      expect.objectContaining({
        category: 'report',
        step: 5,
        reason: expect.stringContaining('pinned end check of "quote shows"'),
      }),
    );
  });

  it('never repairs when a threshold is exceeded', () => {
    expect(
      classifyOutcome(
        outcome(runResult(), ['Step 1 exceeded: 4000ms > 2875ms']),
      ),
    ).toEqual(
      expect.objectContaining({
        category: 'report',
        reason: 'threshold exceeded: Step 1 exceeded: 4000ms > 2875ms',
      }),
    );
  });

  it('does not repair an invalid timer whose end step was not re-resolved', () => {
    expect(classifyOutcome(outcome(runResult({ changedSteps: [] })))).toEqual(
      expect.objectContaining({
        category: 'report',
        reason: expect.stringContaining('the end step was not re-resolved'),
      }),
    );
  });

  it.each([
    "Step 4: the scenario's check failed: testID=confirm-button: not visible",
    'refusing to tap "Confirm": only a Confirm/Submit step may submit, and this step is "Tap Review"',
    'Step 4: blocked on screen: Insufficient funds',
    'Step 4 did not finish within 8 actions',
    'WebDriverError: invalid session id',
  ])('only reports a FAIL, with its error as the reason: %s', (error) => {
    const failed = outcome(
      runResult({
        status: 'FAIL',
        steps: [
          {
            number: 4,
            text: 'Tap Review',
            source: 'agent',
            actions: [],
            error,
          },
        ],
      }),
    );

    expect(classifyOutcome(failed)).toEqual({
      category: 'report',
      step: 4,
      reason: error,
    });
  });
});

describe('cache drift on a passing run', () => {
  /**
   * Attempt 0 healed the cache and was INVALID_MEASUREMENT; attempt 1 replayed
   * it and passed, so its own run reports no changes. The baseline carried over
   * from attempt 0 is what shows the drift.
   */
  function retriedPass(
    overrides: Partial<ScenarioOutcome> = {},
  ): ScenarioOutcome {
    return {
      ...buildScenarioOutcome({
        scenario: parseScenario(MARKDOWN),
        scenarioPath: MD_PATH,
        result: runResult({
          status: 'PASS',
          timers: [
            { name: 'swap opens', valid: true, durationMs: 900 },
            { name: 'quote shows', valid: true, durationMs: 1200 },
          ],
          changedSteps: [],
          modelCalls: 0,
        }),
        cacheBefore: HEALED_CACHE as never,
        cacheBaseline: OLD_CACHE as never,
        cacheAfter: HEALED_CACHE as never,
        thresholdViolations: [],
        attempt: 1,
      }),
      ...overrides,
    };
  }

  it('records the drift against the first attempt, not the replayed cache', () => {
    const result = retriedPass();

    expect(result.attempt).toBe(1);
    expect(result.changedSteps).toEqual([]);
    expect(result.cacheDrift).toEqual([
      {
        number: 3,
        text: 'the swap screen is visible',
        before: OLD_CACHE['the swap screen is visible'],
        after: HEALED_CACHE['the swap screen is visible'],
      },
    ]);
  });

  it('does not count newly learned or removed entries as drift', () => {
    const scenario = parseScenario(MARKDOWN);

    expect(
      computeCacheDrift(
        scenario,
        OLD_CACHE as never,
        {
          ...OLD_CACHE,
          'Tap Review': [
            { type: 'tap', locator: { strategy: 'testID', value: 'review' } },
          ],
        } as never,
      ),
    ).toEqual([]);
    expect(
      computeCacheDrift(scenario, OLD_CACHE as never, {} as never),
    ).toEqual([]);
    expect(computeCacheDrift(scenario, null, HEALED_CACHE as never)).toEqual(
      [],
    );
  });

  it('heals a valid run with re-resolved steps and says it is cache drift', () => {
    expect(classifyOutcome(retriedPass())).toEqual(
      expect.objectContaining({
        category: 'heal',
        step: 3,
        reason: expect.stringMatching(
          /^cache drift \(run passed\).*3\. the swap screen is visible/,
        ),
      }),
    );
  });

  it('keeps a clean pass and a threshold failure out of the heal', () => {
    expect(classifyOutcome(retriedPass({ cacheDrift: [] })).category).toBe(
      'passed',
    );
    expect(
      classifyOutcome(
        retriedPass({
          thresholdViolations: ['Step 1 exceeded: 4000ms > 2875ms'],
        }),
      ).category,
    ).toBe('report');
  });

  it('never trusts drift from a run that did not pass', () => {
    expect(
      classifyOutcome(
        retriedPass({
          status: 'FAIL',
          failedStep: { number: 3, text: 'x', error: 'boom' },
        }),
      ).category,
    ).toBe('report');
  });

  it('lists a failed-run correction together with drift in other steps', () => {
    const tapDrift = {
      number: 2,
      text: 'Tap the Swap button on the wallet home',
      before: OLD_CACHE['Tap the Swap button on the wallet home'] as never,
      after: [
        {
          type: 'tap',
          locator: { strategy: 'testID', value: 'wallet-trade-button' },
        },
      ] as never,
    };
    const both = {
      ...outcome(),
      cacheDrift: [tapDrift, ...(outcome().cacheDrift ?? [])],
      healedCache: {
        ...HEALED_CACHE,
        'Tap the Swap button on the wallet home': tapDrift.after,
      } as never,
    };
    expect(classifyOutcome(both).category).toBe('heal');
    expect(cacheCorrections(both).map((row) => row.number)).toEqual([2, 3]);
  });
});

describe('cache errors', () => {
  it('keeps why a cached step failed, carried over from an earlier attempt', () => {
    const result = runResult();
    result.steps[1].cacheError = 'testID=old-swap-screen not found';
    const built = buildScenarioOutcome({
      scenario: parseScenario(MARKDOWN),
      scenarioPath: MD_PATH,
      result,
      cacheBefore: OLD_CACHE as never,
      cacheAfter: HEALED_CACHE as never,
      thresholdViolations: [],
      earlierCacheErrors: { 'Tap the Swap button on the wallet home': 'old' },
    });

    expect(built.cacheErrors).toEqual({
      'Tap the Swap button on the wallet home': 'old',
      'the swap screen is visible': 'testID=old-swap-screen not found',
    });
  });

  it('renders a cache entry exactly as it sits in the cache file', () => {
    const snippet = cacheEntrySnippet(
      'the swap screen is visible',
      HEALED_CACHE['the swap screen is visible'] as never,
    );

    expect(JSON.parse(`{${snippet}}`)).toEqual({
      'the swap screen is visible': HEALED_CACHE['the swap screen is visible'],
    });
    expect(snippet.startsWith('"the swap screen is visible": [')).toBe(true);
  });
});
