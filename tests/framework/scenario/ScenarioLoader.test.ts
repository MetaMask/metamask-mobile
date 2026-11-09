/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import path from 'path';
import { bindingCatalog } from './bindingCatalog.ts';
import { buildLock } from './matchSteps.ts';
import {
  loadScenario,
  parseScenario,
  parseScenarioLock,
  resolveStepParams,
  ScenarioValidationError,
} from './ScenarioLoader.ts';

const SWAP_SCENARIO_PATH = path.resolve(
  __dirname,
  '../../performance/login/scenarios/eth-swap-flow.scenario.md',
);

const VALID_MARKDOWN = `# Demo scenario

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Tap open
2. Expect: The screen is open

## Timers

- Measure from step 1 until step 2 (Android 1200 ms, iOS 1000 ms): open timer
`;

const VALID_LOCK = {
  scenario: 'demo',
  generatedFrom: 'test',
  steps: {
    '1': {
      text: 'Tap open',
      action: 'tap',
      binding: 'Demo.tapOpen',
      source: 'Demo.ts#tapOpen',
      locators: [{ strategy: 'testID', value: 'open-button', source: 'ids' }],
    },
    '2': {
      text: 'The screen is open',
      action: 'assertVisible',
      binding: 'Demo.isOpen',
      source: 'Demo.ts#isOpen',
      locators: [],
    },
  },
};

function expectIssues(fn: () => unknown, ...fragments: string[]): void {
  let thrown: unknown;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(ScenarioValidationError);
  const { issues } = thrown as ScenarioValidationError;
  for (const fragment of fragments) {
    expect(issues.some((issue) => issue.includes(fragment))).toBe(true);
  }
}

describe('parseScenario', () => {
  it('reads a title, metadata, numbered steps and timers', () => {
    const scenario = parseScenario(VALID_MARKDOWN, 'demo.scenario.md');

    expect(scenario.id).toBe('demo');
    expect(scenario.title).toBe('Demo scenario');
    expect(scenario.tags).toEqual(['@PerformanceShadow']);
    expect(scenario.team).toBe('@qa-team');
    expect(scenario.platforms).toEqual(['android']);
    expect(scenario.steps).toEqual([
      {
        id: '1',
        kind: 'do',
        text: 'Tap open',
        params: {},
        sensitive: false,
        allowHeal: true,
      },
      {
        id: '2',
        kind: 'expect',
        text: 'The screen is open',
        params: {},
        sensitive: false,
        allowHeal: true,
      },
    ]);
    expect(scenario.timers).toEqual([
      {
        name: 'open timer',
        after: '1',
        until: '2',
        threshold: { ios: 1000, android: 1200 },
      },
    ]);
  });

  it('accepts bullets, either threshold order, and a Secret step', () => {
    const scenario = parseScenario(
      `# Demo

- Tags: @PerformanceShadow
- Team: @qa-team
- Platforms: iOS and Android

## Steps

1) Tap open
2) Expect: the wallet is visible
3) Secret: Enter the phrase

## Timers

Measure from step 1 until step 2 (iOS 1000 ms, Android 1200 ms): open timer
`,
      'demo.scenario.md',
    );

    expect(scenario.platforms).toEqual(['ios', 'android']);
    expect(scenario.steps[2]).toEqual(
      expect.objectContaining({
        id: '3',
        kind: 'do',
        text: 'Enter the phrase',
        sensitive: true,
      }),
    );
    expect(scenario.timers[0].threshold).toEqual({ ios: 1000, android: 1200 });
  });

  it.each(['@Performance', '@System'])(
    'rejects the %s tag so the scenario cannot join scheduled or system runs',
    (tag) => {
      expectIssues(
        () => parseScenario(VALID_MARKDOWN.replace('@PerformanceShadow', tag)),
        `Tag "${tag}" would run this scenario`,
      );
    },
  );

  it('explains a missing title, missing metadata and a missing Steps section', () => {
    expectIssues(
      () => parseScenario('just some notes'),
      'Start the file with a title',
      'Add `Tags: @PerformanceShadow`',
      'Add `Team: @your-team`',
      'Add `Platforms: Android`',
      'Add a "## Steps" section',
    );
  });

  it('explains a gap in step numbers', () => {
    expectIssues(
      () =>
        parseScenario(
          VALID_MARKDOWN.replace(
            '2. Expect: The screen is open',
            '4. Expect: The screen is open',
          ),
        ),
      'Expected step 2, found step 4',
    );
  });

  it('explains a line that is not a numbered step', () => {
    expectIssues(
      () =>
        parseScenario(
          VALID_MARKDOWN.replace(
            '2. Expect: The screen is open',
            'then the screen opens\n2. Expect: The screen is open',
          ),
        ),
      'Not a numbered step: "then the screen opens"',
    );
  });

  it('explains a timer that does not end on the next step', () => {
    const markdown = VALID_MARKDOWN.replace(
      '2. Expect: The screen is open',
      '2. Tap something else\n3. Expect: The screen is open',
    ).replace('until step 2', 'until step 3');

    expectIssues(
      () => parseScenario(markdown, 'demo.scenario.md'),
      'step 3 must be the step right after step 1',
    );
  });

  it('explains a timer that starts on an expectation', () => {
    expectIssues(
      () =>
        parseScenario(
          VALID_MARKDOWN.replace(
            'from step 1 until step 2',
            'from step 2 until step 1',
          ),
          'demo.scenario.md',
        ),
      'step 2 is an expectation',
      'step 1 ("Tap open") is an action',
    );
  });

  it('shows the expected timer shape when a timer line cannot be read', () => {
    expectIssues(
      () =>
        parseScenario(
          VALID_MARKDOWN.replace(
            '- Measure from step 1 until step 2 (Android 1200 ms, iOS 1000 ms): open timer',
            '- this took too long',
          ),
        ),
      'could not be read',
      'Measure from step 1 until step 2 (Android 2500 ms, iOS 2000 ms)',
    );
  });

  it('rejects an unknown section', () => {
    expectIssues(
      () => parseScenario(VALID_MARKDOWN.replace('## Timers', '## Notes')),
      'Unknown section "## Notes"',
    );
  });
});

describe('parseScenarioLock', () => {
  const scenario = parseScenario(VALID_MARKDOWN, 'demo.scenario.md');

  it('accepts a lock that binds every step', () => {
    const lock = parseScenarioLock(JSON.stringify(VALID_LOCK), scenario);

    expect(lock.steps['1'].binding).toBe('Demo.tapOpen');
    expect(lock.steps['1'].locators).toEqual([
      { strategy: 'testID', value: 'open-button', source: 'ids' },
    ]);
  });

  it('tells the author to regenerate when a step was added or removed', () => {
    const { '2': _removed, ...rest } = VALID_LOCK.steps;
    const lock = {
      ...VALID_LOCK,
      steps: { ...rest, '9': VALID_LOCK.steps['1'] },
    };

    expectIssues(
      () => parseScenarioLock(JSON.stringify(lock), scenario),
      'step 2 ("The screen is open") has no lock entry',
      'steps.9 is not a step of the scenario',
    );
  });

  it('tells the author to regenerate when the step text changed', () => {
    const lock = {
      ...VALID_LOCK,
      steps: {
        ...VALID_LOCK.steps,
        '1': { ...VALID_LOCK.steps['1'], text: 'Tap open (old wording)' },
      },
    };

    expectIssues(
      () => parseScenarioLock(JSON.stringify(lock), scenario),
      'steps.1.text does not match the scenario anymore',
    );
  });

  it('rejects an action that does not fit the step kind', () => {
    const lock = {
      ...VALID_LOCK,
      steps: {
        ...VALID_LOCK.steps,
        '2': { ...VALID_LOCK.steps['2'], action: 'tap' },
      },
    };

    expectIssues(
      () => parseScenarioLock(JSON.stringify(lock), scenario),
      'steps.2.action must be one of assertVisible',
    );
  });
});

describe('loadScenario', () => {
  it('loads the committed swap scenario and its generated lockfile', () => {
    const { scenario, lock } = loadScenario(SWAP_SCENARIO_PATH);

    expect(scenario.id).toBe('eth-swap-flow');
    expect(scenario.timers.map((timer) => timer.name)).toEqual([
      'Time since the user clicks on the "Swap" button until the swap page is loaded',
      'Time since the user enters the amount until the quote is displayed',
    ]);
    expect(scenario.timers.map((timer) => timer.threshold)).toEqual([
      { ios: 2000, android: 2500 },
      { ios: 9000, android: 3000 },
    ]);
    expect(Object.keys(lock.steps)).toEqual(
      scenario.steps.map((step) => step.id),
    );
  });

  it('keeps the committed lock equal to what yarn scenario:lock writes', () => {
    const markdown = fs.readFileSync(SWAP_SCENARIO_PATH, 'utf8');
    const scenario = parseScenario(markdown, 'eth-swap-flow.scenario.md');
    const generated = `${JSON.stringify(buildLock(scenario, bindingCatalog), null, 2)}\n`;

    expect(
      fs.readFileSync(
        SWAP_SCENARIO_PATH.replace(/\.md$/, '.lock.json'),
        'utf8',
      ),
    ).toBe(generated);
  });
});

describe('resolveStepParams', () => {
  it('substitutes env placeholders and keeps literals', () => {
    expect(
      resolveStepParams(
        { srp: '${env.TEST_SRP_2}', amount: '0.01' },
        { TEST_SRP_2: 'secret words' },
      ),
    ).toEqual({ srp: 'secret words', amount: '0.01' });
  });

  it('fails clearly when the env variable is missing', () => {
    expect(() => resolveStepParams({ srp: '${env.TEST_SRP_2}' }, {})).toThrow(
      'Scenario param "srp" needs environment variable TEST_SRP_2',
    );
  });
});
