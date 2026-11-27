import { missingEnv, parseScenario, requireSecretEnv } from './scenario';

const header = `# Demo

Tags: @PerformanceShadow
Team: @qa
Platforms: Android
`;

describe('parseScenario hints', () => {
  it('reads a Hints section as tokens and leaves steps alone', () => {
    const scenario = parseScenario(`${header}
## Hints

- WalletViewSelectorsIDs
- WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE("tokens")
- asset-ETH

## Steps

1. Tap the Swap button
`);

    expect(scenario.hints).toEqual([
      'WalletViewSelectorsIDs',
      'WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE("tokens")',
      'asset-ETH',
    ]);
    expect(scenario.steps.map((step) => step.text)).toEqual([
      'Tap the Swap button',
    ]);
  });

  it('allows a scenario with no Hints section', () => {
    const scenario = parseScenario(`${header}
## Steps

1. Tap the Swap button
`);

    expect(scenario.hints).toEqual([]);
  });

  it('rejects a hint line that is not a bullet', () => {
    expect(() =>
      parseScenario(`${header}
## Hints

WalletViewSelectorsIDs

## Steps

1. Tap the Swap button
`),
    ).toThrow('Not a hint');
  });
});

let counter = 0;
function plainScenario(steps: string) {
  counter += 1;
  return parseScenario(`# Plain ${counter}

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
${steps}
`);
}

/** This repo's ProcessEnv typing requires keys a test env does not need. */
const testEnv = (vars: Record<string, string>): NodeJS.ProcessEnv =>
  vars as unknown as NodeJS.ProcessEnv;

describe('parseScenario steps, checks and timers', () => {
  const md = (steps: string, timers = '') => `# App ${Math.random()}

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
${steps}
${timers ? `\n## Timers\n\n${timers}\n` : ''}`;

  it('parses [check: ...] markers off the step text', () => {
    const scenario = plainScenario(
      '2. Open the Activity tab [check: testID=activity-screen-safe-area-view] [check: testID=activity-list]\n' +
        '3. Tap Confirm [check: gone testID=confirm-button]\n' +
        '4. Expect: a quote is displayed [check: testID=dest-token-area-input text=/^\\s*\\+?(?:\\d*[1-9]|\\d*\\.\\d*[1-9])/]',
    );
    expect(scenario.steps[1]).toEqual({
      number: 2,
      kind: 'do',
      text: 'Open the Activity tab',
      checks: [
        {
          locator: {
            strategy: 'testID',
            value: 'activity-screen-safe-area-view',
          },
        },
        { locator: { strategy: 'testID', value: 'activity-list' } },
      ],
    });
    expect(scenario.steps[2].checks).toEqual([
      { locator: { strategy: 'testID', value: 'confirm-button' }, gone: true },
    ]);
    const pattern = new RegExp(scenario.steps[3].checks?.[0].textPattern ?? '');
    // Same as QuoteView.waitForQuoteReady: a digit and parseFloat(text) > 0.
    for (const [text, ok] of [
      ['21.08', true],
      ['0', false],
      ['0.00', false],
      ['0.0001', true],
      ['', false],
      ['.5', true],
    ] as const) {
      expect(pattern.test(text)).toBe(ok);
    }
  });

  it('rejects a timer that ends on a "gone" check', () => {
    expect(() =>
      parseScenario(`# T

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Tap Swap
2. Expect: done [check: gone testID=x]

## Timers

- Measure from step 1 until step 2 (Android 1 ms, iOS 1 ms): t
`),
    ).toThrow(/exactly one element check/);
  });

  it('parses alternatives, quoted values included', () => {
    const scenario = plainScenario(
      '2. Expect: rewards content [check: any testID=onboarding-step-container | testID=rewards-view-title | label="Add accounts"]',
    );
    expect(scenario.steps[1].text).toBe('rewards content');
    expect(scenario.steps[1].checks?.[0].anyOf).toEqual([
      { strategy: 'testID', value: 'onboarding-step-container' },
      { strategy: 'testID', value: 'rewards-view-title' },
      { strategy: 'label', value: 'Add accounts' },
    ]);
  });

  it('parses App commands, a pinned tap, and timers that start on an App step', () => {
    const s = parseScenario(
      md(
        `2. App: terminate the app
3. App: activate the app
4. Expect: login [check: testID=login]
5. App: background the app for 35 s
6. App: start the clock
7. Expect: wallet [check: any testID=wallet-account-name-button | testID=account-picker]
8. Tap the Rewards tab [tap: testID=tab-bar-item-Rewards]`,
        `- Measure from step 3 until step 4 (Android 3000 ms, iOS 3000 ms): launch
- Measure from step 6 until step 7 (Android 3000 ms, iOS 2500 ms): unlock`,
      ),
    );
    expect(s.steps.map((x) => x.app?.command ?? null)).toEqual([
      null,
      'terminate',
      'activate',
      null,
      'background',
      'startClock',
      null,
      null,
    ]);
    expect(s.steps[4].app).toEqual({ command: 'background', seconds: 35 });
    expect(s.steps[7]).toMatchObject({
      text: 'Tap the Rewards tab',
      tap: { strategy: 'testID', value: 'tab-bar-item-Rewards' },
    });
  });

  it('rejects unknown App commands and App timers without a pinned end on the next step', () => {
    expect(() => parseScenario(md('2. App: reinstall the app'))).toThrow(
      /unknown App command/,
    );
    expect(() =>
      parseScenario(
        md(
          '2. App: activate the app\n3. Expect: login',
          '- Measure from step 2 until step 3 (Android 1 ms, iOS 1 ms): t',
        ),
      ),
    ).toThrow(/needs a pinned/);
    expect(() =>
      parseScenario(
        md(
          '2. App: activate the app\n3. Tap x\n4. Expect: login [check: testID=login]',
          '- Measure from step 2 until step 4 (Android 1 ms, iOS 1 ms): t',
        ),
      ),
    ).toThrow(/very next step/);
  });

  it('parses code checks and conditions, and keeps a timer inside one condition', () => {
    const s = parseScenario(
      md(
        `2. App: start the clock [if: perps-gtm-onboarding]
3. Expect: tutorial [if: perps-gtm-onboarding] [check: any text="What are perps?"]
4. Expect: balance stable [check: code=balance-stable]`,
        '- Measure from step 2 until step 3 (Android 1 ms, iOS 1 ms): t',
      ),
    );
    expect(s.steps[1]).toMatchObject({
      kind: 'app',
      condition: 'perps-gtm-onboarding',
    });
    expect(s.steps[2].checks?.[0].anyOf).toEqual([
      { strategy: 'text', value: 'What are perps?' },
    ]);
    expect(s.steps[3].checks?.[0].code).toBe('balance-stable');
    expect(() =>
      parseScenario(
        md(
          `2. App: start the clock [if: x]\n3. Expect: e [check: testID=a]`,
          '- Measure from step 2 until step 3 (Android 1 ms, iOS 1 ms): t',
        ),
      ),
    ).toThrow(/same \[if/);
    expect(() =>
      parseScenario(md('2. Tap a [check: code=balance-stable]')),
    ).toThrow(/code check/);
  });

  it('parses "(no threshold)" timers (originals without a threshold)', () => {
    const s = parseScenario(
      md(
        '2. App: start the clock\n3. Expect: list [check: code=account-list]',
        '- Measure from step 2 until step 3 (no threshold): account list',
      ),
    );
    expect(s.timers[0]).toMatchObject({
      name: 'account list',
      from: 2,
      until: 3,
    });
    expect(s.timers[0].threshold).toBeUndefined();
  });

  it('names a missing secret without its value, and lists only missing names', () => {
    const env = testEnv({
      TEST_SRP_2: 'alpha beta gamma',
      TEST_SRP_3: '',
    });
    expect(missingEnv(['TEST_SRP_2', 'TEST_SRP_3', 'TEST_SRP_4'], env)).toEqual(
      ['TEST_SRP_3', 'TEST_SRP_4'],
    );
    expect(requireSecretEnv('TEST_SRP_2', env)).toBe('alpha beta gamma');
    expect(() => requireSecretEnv('TEST_SRP_3', env)).toThrow(
      'TEST_SRP_3 environment variable is required for this scenario',
    );
  });
});
