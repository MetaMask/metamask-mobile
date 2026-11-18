import {
  buildHealChanges,
  buildScenarioOutcome,
  classifyOutcome,
  completeSlackNotices,
  computeCacheDrift,
  healKey,
  healKeys,
  healRuleViolations,
  indexHealPrs,
  renderHealPr,
  renderHealSlackMessage,
  type ScenarioOutcome,
} from './heal.ts';
import { parseScenario } from './scenario.ts';
import type { AgentRunResult } from './types.ts';

/** Keys already proposed by open heal PR bodies. */
const proposedKeys = (bodies: string[]) =>
  new Set(indexHealPrs(bodies.map((body) => ({ body }))).keys());

const MD_PATH = 'tests/performance/login/scenarios/demo.scenario.md';
const CACHE_PATH = MD_PATH.replace('.md', '.cache.json');

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

const repo = (files: Record<string, string>) => (p: string) => files[p] ?? null;

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

describe('heal rules', () => {
  const files = {
    [MD_PATH]: MARKDOWN,
    [CACHE_PATH]: `${JSON.stringify(OLD_CACHE, null, 2)}\n`,
  };

  it('builds a heal that only changes the cache, and it passes the rules', () => {
    const { changes } = buildHealChanges(outcome(), repo(files));

    expect(changes.map((c) => c.path)).toEqual([CACHE_PATH]);
    expect(healRuleViolations(changes, repo(files))).toEqual([]);
  });

  it.each([
    MD_PATH,
    'tests/framework/scenario-agent/scenarioTest.ts',
    'tests/performance/login/scenarios/demo.scenario.spec.ts',
    'tests/playwright.testmu.config.ts',
    '.github/workflows/run-performance-e2e.yml',
  ])('rejects any change to %s', (file) => {
    expect(
      healRuleViolations(
        [{ path: file, before: 'a', after: 'b' }],
        repo(files),
      ),
    ).toEqual([
      expect.stringContaining('only *.scenario.cache.json may change'),
    ]);
  });

  it('rejects cache entries for Secret steps or with unknown actions', () => {
    const bad = JSON.stringify({
      'Log in to the wallet': [
        { type: 'tap', locator: { strategy: 'testID', value: 'x' } },
      ],
      'Tap the Swap button on the wallet home': [
        { type: 'shell', command: 'rm -rf /' },
      ],
    });

    const violations = healRuleViolations(
      [{ path: CACHE_PATH, before: null, after: bad }],
      repo(files),
    );

    expect(violations).toEqual([
      expect.stringContaining('"Log in to the wallet" is not a do/expect step'),
      expect.stringContaining('has an unknown action'),
    ]);
  });
});

describe('heal PR', () => {
  it('lists old vs new actions and a dedupe marker, and dedupes by scenario and step', () => {
    const healedOutcome = outcome();
    const { changes } = buildHealChanges(
      healedOutcome,
      repo({ [MD_PATH]: MARKDOWN }),
    );
    const { title, body } = renderHealPr(
      [
        {
          outcome: healedOutcome,
          classification: classifyOutcome(healedOutcome),
          changes,
          notes: [],
        },
      ],
      {
        runUrl: 'https://github.com/run/1',
        heJobUrls: ['https://he/job'],
        baseRef: 'main',
      },
    );

    expect(title).toBe('test(perf): heal scenario cache for demo');
    expect(body).toContain(
      '| 3. the swap screen is visible | expect testID=old-swap-screen | expect testID=swap-screen-v2 |',
    );
    expect(body).toContain('https://github.com/run/1');
    expect(body).toContain('https://he/job');
    expect(proposedKeys([body])).toEqual(new Set([healKey(healedOutcome, 3)]));
  });
});

describe('renderHealSlackMessage', () => {
  const notice = {
    scenario: 'Predict Available Balance [scenario shadow]',
    drift: false,
    step: 2,
    reason: 'end element testID=old did not appear',
    runUrl: 'https://github.com/org/repo/actions/runs/1',
    heJobUrls: ['https://hyperexecute.example/job/1'],
    prUrl: '',
    commitSha: '',
    commitUrl: '',
  };

  it('names the scenario, step, reason, run, HyperExecute job, PR and commit', () => {
    const [ready] = completeSlackNotices([notice], {
      prUrl: 'https://github.com/org/repo/pull/9',
      commitSha: 'abc1234',
      repositoryUrl: 'https://github.com/org/repo',
    });

    expect(renderHealSlackMessage([ready])).toBe(
      [
        'Repairable performance scenario: Predict Available Balance [scenario shadow]',
        'Failed step: 2',
        'Reason: end element testID=old did not appear',
        'Run: https://github.com/org/repo/actions/runs/1',
        'HyperExecute: https://hyperexecute.example/job/1',
        'Heal PR: https://github.com/org/repo/pull/9',
        'Commit: abc1234 (https://github.com/org/repo/commit/abc1234)',
      ].join('\n'),
    );
  });

  it('keeps an existing heal PR and drops a notice whose PR was never opened', () => {
    const existing = {
      ...notice,
      prUrl: 'https://github.com/org/repo/pull/8',
      commitSha: 'def5678',
      commitUrl: 'https://github.com/org/repo/commit/def5678',
    };

    expect(completeSlackNotices([notice, existing])).toEqual([existing]);
  });
});

describe('cache drift on a passing run', () => {
  const files = {
    [MD_PATH]: MARKDOWN,
    [CACHE_PATH]: `${JSON.stringify(
      {
        ...OLD_CACHE,
        'Tap Review': [
          { type: 'tap', locator: { strategy: 'testID', value: 'review' } },
        ],
      },
      null,
      2,
    )}\n`,
  };

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

  it('writes only the re-resolved entry onto the committed cache and never touches the Markdown', () => {
    const { changes } = buildHealChanges(retriedPass(), repo(files));
    const cache = JSON.parse(changes[0].after);

    expect(changes.map((c) => c.path)).toEqual([CACHE_PATH]);
    expect(cache['the swap screen is visible']).toEqual(
      HEALED_CACHE['the swap screen is visible'],
    );
    expect(cache['Tap the Swap button on the wallet home']).toEqual(
      OLD_CACHE['Tap the Swap button on the wallet home'],
    );
    expect(cache['Tap Review']).toBeDefined();
    expect(healRuleViolations(changes, repo(files))).toEqual([]);
  });

  it('reports a note instead of a change when the branch has no such cached step', () => {
    const { changes, notes } = buildHealChanges(
      retriedPass(),
      repo({ [MD_PATH]: MARKDOWN, [CACHE_PATH]: '{}\n' }),
    );

    expect(changes).toEqual([]);
    expect(notes[0]).toContain('no cached entry');
  });

  it('puts the run status, old vs new resolution, run and a marker per step in the PR body', () => {
    const drift = retriedPass();
    const { changes } = buildHealChanges(drift, repo(files));
    const { body } = renderHealPr(
      [
        {
          outcome: drift,
          classification: classifyOutcome(drift),
          changes,
          notes: [],
        },
      ],
      { runUrl: 'https://github.com/run/2', heJobUrls: [], baseRef: 'main' },
    );

    expect(body).toContain('Run status: PASS');
    expect(body).toContain('passed on retry 1');
    expect(body).toContain(
      '| 3. the swap screen is visible | expect testID=old-swap-screen | expect testID=swap-screen-v2 |',
    );
    expect(body).toContain('https://github.com/run/2');
    expect(body).toContain('Only `*.scenario.cache.json` files change');
    expect(proposedKeys([body])).toEqual(
      new Set(healKeys(drift, classifyOutcome(drift))),
    );
  });

  it('combines a failed-run heal with drift in other steps in one heal', () => {
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
    const classification = classifyOutcome(both);

    expect(classification.category).toBe('heal');
    expect(healKeys(both, classification)).toEqual([
      healKey(both, 3),
      healKey(both, 2),
    ]);
    const { changes } = buildHealChanges(both, repo(files));
    expect(
      JSON.parse(changes[0].after)['Tap the Swap button on the wallet home'],
    ).toEqual(tapDrift.after);
  });
});

describe('cache-drift Slack notice', () => {
  it('says the run passed and the cache was stale', () => {
    const [ready] = completeSlackNotices(
      [
        {
          scenario: 'Predict [scenario shadow]',
          drift: true,
          step: 3,
          reason:
            're-resolved 1 cached step: 3. the Predict home screen is visible',
          runUrl: 'https://github.com/run/3',
          heJobUrls: [],
          prUrl: '',
          commitSha: '',
          commitUrl: '',
        },
      ],
      {
        prUrl: 'https://github.com/org/repo/pull/10',
        commitSha: 'abc1234',
        repositoryUrl: 'https://github.com/org/repo',
      },
    );

    const text = renderHealSlackMessage([ready]);

    expect(text).toContain(
      'Cache drift in performance scenario (run passed, cache was stale): Predict [scenario shadow]',
    );
    expect(text).toContain('First re-resolved step: 3');
  });
});
