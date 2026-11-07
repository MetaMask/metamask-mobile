/* eslint-disable import-x/no-nodejs-modules */
import path from 'path';
import {
  loadScenario,
  parseScenario,
  parseScenarioLock,
  resolveStepParams,
  ScenarioValidationError,
} from './ScenarioLoader.ts';

const SWAP_SCENARIO_PATH = path.resolve(
  __dirname,
  '../../performance/login/scenarios/eth-swap-flow.scenario.yaml',
);

const VALID_YAML = `
id: demo
title: Demo scenario
tags: ['@PerformanceShadow']
team: '@qa-team'
platforms: [android]
steps:
  - id: open
    do: Tap open
  - id: opened
    expect: The screen is open
timers:
  - name: open timer
    after: open
    until: opened
    threshold: { ios: 1000, android: 1200 }
`;

const VALID_LOCK = {
  scenario: 'demo',
  generatedFrom: 'test',
  steps: {
    open: {
      text: 'Tap open',
      action: 'tap',
      binding: 'Demo.tapOpen',
      source: 'Demo.ts#tapOpen',
      locators: [{ strategy: 'testID', value: 'open-button', source: 'ids' }],
    },
    opened: {
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
  it('parses do/expect steps, timers and defaults', () => {
    const scenario = parseScenario(VALID_YAML);

    expect(scenario.steps).toEqual([
      {
        id: 'open',
        kind: 'do',
        text: 'Tap open',
        params: {},
        sensitive: false,
        allowHeal: true,
      },
      {
        id: 'opened',
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
        after: 'open',
        until: 'opened',
        threshold: { ios: 1000, android: 1200 },
      },
    ]);
    expect(scenario.precondition).toBe('logged-in');
    expect(scenario.profiling).toBe('none');
  });

  it.each(['@Performance', '@System'])(
    'rejects the %s tag so the scenario cannot join scheduled or system runs',
    (tag) => {
      expectIssues(
        () => parseScenario(VALID_YAML.replace('@PerformanceShadow', tag)),
        `tag "${tag}" would enrol the scenario`,
      );
    },
  );

  it('rejects a step with both do and expect', () => {
    expectIssues(
      () =>
        parseScenario(
          VALID_YAML.replace(
            '    do: Tap open',
            '    do: Tap open\n    expect: Also',
          ),
        ),
      'must have exactly one of "do" or "expect"',
    );
  });

  it('rejects duplicate step ids', () => {
    expectIssues(
      () => parseScenario(VALID_YAML.replace('id: opened', 'id: open')),
      'step id "open" is duplicated',
    );
  });

  it('requires timers to start after a do step and end on the next expect step', () => {
    const yaml = VALID_YAML.replace(
      '  - id: opened\n    expect: The screen is open',
      '  - id: other\n    do: Tap something else\n  - id: opened\n    expect: The screen is open',
    );

    expectIssues(
      () => parseScenario(yaml),
      'until step "opened" must directly follow after step "open"',
    );
  });

  it('rejects a timer whose after step is an expect step', () => {
    const yaml = VALID_YAML.replace('after: open', 'after: opened').replace(
      'until: opened',
      'until: open',
    );

    expectIssues(
      () => parseScenario(yaml),
      'after step "opened" must be a "do" step',
      'until step "open" must be an "expect" step',
    );
  });

  it('requires per-platform thresholds', () => {
    expectIssues(
      () =>
        parseScenario(
          VALID_YAML.replace('{ ios: 1000, android: 1200 }', '{ ios: 1000 }'),
        ),
      'threshold must define positive "ios" and "android"',
    );
  });
});

describe('parseScenarioLock', () => {
  const scenario = parseScenario(VALID_YAML);

  it('accepts a lock that binds every step', () => {
    const lock = parseScenarioLock(JSON.stringify(VALID_LOCK), scenario);

    expect(lock.steps.open.binding).toBe('Demo.tapOpen');
    expect(lock.steps.open.locators).toEqual([
      { strategy: 'testID', value: 'open-button', source: 'ids' },
    ]);
  });

  it('rejects a lock with a missing step and a stale entry', () => {
    const { opened: _opened, ...rest } = VALID_LOCK.steps;
    const lock = {
      ...VALID_LOCK,
      steps: { ...rest, removed: VALID_LOCK.steps.open },
    };

    expectIssues(
      () => parseScenarioLock(JSON.stringify(lock), scenario),
      'step "opened" has no lock entry',
      'steps.removed is not a step of the scenario',
    );
  });

  it('rejects a lock whose text no longer matches the step', () => {
    const lock = {
      ...VALID_LOCK,
      steps: {
        ...VALID_LOCK.steps,
        open: { ...VALID_LOCK.steps.open, text: 'Tap open (old wording)' },
      },
    };

    expectIssues(
      () => parseScenarioLock(JSON.stringify(lock), scenario),
      'steps.open.text does not match',
    );
  });

  it('rejects an action that does not fit the step kind', () => {
    const lock = {
      ...VALID_LOCK,
      steps: {
        ...VALID_LOCK.steps,
        opened: { ...VALID_LOCK.steps.opened, action: 'tap' },
      },
    };

    expectIssues(
      () => parseScenarioLock(JSON.stringify(lock), scenario),
      'steps.opened.action must be one of assertVisible',
    );
  });

  it('rejects locators on macro steps', () => {
    const lock = {
      ...VALID_LOCK,
      steps: {
        ...VALID_LOCK.steps,
        open: { ...VALID_LOCK.steps.open, action: 'macro' },
      },
    };

    expectIssues(
      () => parseScenarioLock(JSON.stringify(lock), scenario),
      'macro steps run only through their binding',
    );
  });
});

describe('loadScenario', () => {
  it('loads the committed swap scenario and its lockfile', () => {
    const { scenario, lock } = loadScenario(SWAP_SCENARIO_PATH);

    expect(scenario.id).toBe('swap-eth-to-usdc');
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
