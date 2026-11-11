import {
  applyRewordings,
  buildHealChanges,
  buildScenarioOutcome,
  classifyOutcome,
  completeSlackNotices,
  healKey,
  healRuleViolations,
  proposedKeys,
  renderHealPr,
  renderHealSlackMessage,
  type FileChange,
  type ScenarioOutcome,
} from './heal.ts';
import { parseScenario } from './scenario.ts';
import type { AgentRunResult } from './ScenarioAgent.ts';

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
  it('repairs a stale cached end element that the agent re-resolved after the window', () => {
    const result = classifyOutcome(outcome());

    expect(result).toEqual(
      expect.objectContaining({
        category: 'repairable',
        repairable: true,
        step: 3,
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
        category: 'pinned-check',
        repairable: false,
        step: 5,
      }),
    );
  });

  it('never repairs when a threshold is exceeded', () => {
    expect(
      classifyOutcome(
        outcome(runResult(), ['Step 1 exceeded: 4000ms > 2875ms']),
      ),
    ).toEqual(
      expect.objectContaining({ category: 'threshold', repairable: false }),
    );
  });

  it('does not repair an invalid timer whose end step was not re-resolved', () => {
    expect(classifyOutcome(outcome(runResult({ changedSteps: [] })))).toEqual(
      expect.objectContaining({ category: 'not-healed', repairable: false }),
    );
  });

  it.each([
    [
      "Step 4: the scenario's check failed: testID=confirm-button: not visible",
      'pinned-check',
    ],
    [
      'refusing to tap "Confirm": only a Confirm/Submit step may submit, and this step is "Tap Review"',
      'submit-guard',
    ],
    ['Step 4: blocked on screen: Insufficient funds', 'blocked'],
    ['Step 4 did not finish within 8 actions', 'no-path'],
    ['WebDriverError: invalid session id', 'timeout-or-crash'],
    ['something new', 'unknown'],
  ])('classifies a FAIL "%s" as %s and never repairs it', (error, category) => {
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

    expect(classifyOutcome(failed)).toEqual(
      expect.objectContaining({ category, repairable: false, step: 4 }),
    );
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

  it('applies a proposed rewording to the step text only and renames the cache key', () => {
    const reworded = {
      ...outcome(),
      rewordings: [
        {
          number: 2,
          from: 'Tap the Swap button on the wallet home',
          to: 'Tap the Trade button on the wallet home',
        },
      ],
    };

    const { changes } = buildHealChanges(reworded, repo(files));
    const md = changes.find((c) => c.path === MD_PATH)?.after ?? '';
    const cache = JSON.parse(
      changes.find((c) => c.path === CACHE_PATH)?.after ?? '{}',
    );

    expect(md).toContain('2. Tap the Trade button on the wallet home\n');
    expect(cache).toHaveProperty(['Tap the Trade button on the wallet home']);
    expect(healRuleViolations(changes, repo(files))).toEqual([]);
  });

  it('keeps pins and the Expect prefix when rewording', () => {
    const { markdown } = applyRewordings(MARKDOWN, [
      { number: 5, from: 'the quote is shown', to: 'the quote appears' },
    ]);

    expect(markdown).toContain(
      '5. Expect: the quote appears [check: testID=quote text=/[1-9]/]',
    );
  });

  it('never rewords Secret steps', () => {
    const { markdown, skipped } = applyRewordings(MARKDOWN, [
      { number: 1, from: 'Log in to the wallet', to: 'Skip login' },
    ]);

    expect(markdown).toBe(MARKDOWN);
    expect(skipped[0]).toContain('never reworded');
  });

  const mdChange = (after: string): FileChange[] => [
    { path: MD_PATH, before: MARKDOWN, after },
  ];

  it.each([
    [
      'a pin',
      MARKDOWN.replace(
        '[check: testID=confirm-button]',
        '[check: testID=other]',
      ),
    ],
    [
      'an [if:] condition',
      MARKDOWN.replace(
        '4. Tap Review',
        '4. Tap Review [if: perps-gtm-onboarding]',
      ),
    ],
    ['a threshold', MARKDOWN.replace('Android 2500 ms', 'Android 9999 ms')],
    [
      'a timer',
      MARKDOWN.replace(
        'from step 2 until step 3',
        'from step 4 until step 5',
      ).replace(
        'from step 4 until step 5 (Android 3000',
        'from step 2 until step 3 (Android 3000',
      ),
    ],
    [
      'a Secret step',
      MARKDOWN.replace(
        'Secret: Log in to the wallet',
        'Secret: Log in with another wallet',
      ),
    ],
    [
      'a step kind',
      MARKDOWN.replace(
        '3. Expect: the swap screen is visible',
        '3. Tap the swap screen',
      ),
    ],
    [
      'the tags',
      MARKDOWN.replace(
        'Tags: @PerformanceShadow',
        'Tags: @PerformanceShadow @Other',
      ),
    ],
    [
      'an added line',
      MARKDOWN.replace('## Timers', '6. Tap Confirm\n\n## Timers'),
    ],
  ])('rejects a Markdown change to %s', (_what, after) => {
    expect(
      healRuleViolations(mdChange(after), repo(files)).length,
    ).toBeGreaterThan(0);
  });

  it.each([
    'tests/performance/login/scenarios/scenarioTest.ts',
    'tests/performance/login/scenarios/demo.scenario.spec.ts',
    'tests/playwright.scenario-shadow.config.ts',
    '.github/workflows/run-performance-e2e.yml',
  ])('rejects any change to %s', (file) => {
    expect(
      healRuleViolations(
        [{ path: file, before: 'a', after: 'b' }],
        repo(files),
      ),
    ).toEqual([
      expect.stringContaining(
        'only *.scenario.cache.json and *.scenario.md may change',
      ),
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
