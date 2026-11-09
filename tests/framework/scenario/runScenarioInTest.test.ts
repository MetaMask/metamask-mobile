import type { Browser } from 'webdriverio';
import { parseScenario, parseScenarioLock } from './ScenarioLoader.ts';
import { runScenarioInTest, ScenarioRunError } from './runScenarioInTest.ts';
import type { LocatorActions } from './ScenarioExecutor.ts';
import type { LoadedScenario } from './types.ts';

let counter = 0;

function buildLoaded(): LoadedScenario {
  counter += 1;
  const scenario = parseScenario(
    `# Glue ${counter}

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Tap open
2. Expect: The screen is open

## Timers

- Measure from step 1 until step 2 (Android 60000 ms, iOS 60000 ms): glue timer ${counter}
`,
    'glue.scenario.md',
  );
  const lock = parseScenarioLock(
    JSON.stringify({
      scenario: 'glue',
      generatedFrom: 'test',
      steps: {
        '1': {
          text: 'Tap open',
          action: 'tap',
          binding: 'Glue.tapOpen',
          source: 'Glue.ts',
          locators: [
            { strategy: 'testID', value: 'open-button', source: 'ids' },
          ],
        },
        '2': {
          text: 'The screen is open',
          action: 'assertVisible',
          binding: 'Glue.isOpen',
          source: 'Glue.ts',
          locators: [
            { strategy: 'testID', value: 'open-screen', source: 'ids' },
          ],
        },
      },
    }),
    scenario,
  );
  return {
    scenario,
    lock,
    scenarioPath: 'glue.scenario.md',
    lockPath: 'glue.scenario.lock.json',
  };
}

function createTestInfo() {
  return {
    annotations: [] as { type: string; description?: string }[],
    attach: jest.fn().mockResolvedValue(undefined),
  };
}

const locatorActions: LocatorActions = {
  tap: jest.fn().mockResolvedValue(undefined),
  assertVisible: jest.fn().mockResolvedValue(undefined),
};

describe('runScenarioInTest', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('annotates the status and attaches the run report without a heal report on PASS', async () => {
    const testInfo = createTestInfo();

    const report = await runScenarioInTest({
      loaded: buildLoaded(),
      platform: 'android',
      bindings: {
        'Glue.tapOpen': jest.fn().mockResolvedValue(undefined),
        'Glue.isOpen': jest.fn().mockResolvedValue(undefined),
      },
      locatorActions,
      performanceTracker: { addTimer: jest.fn() },
      driver: {} as Browser,
      testInfo,
      env: {},
    });

    expect(report.status).toBe('PASS');
    expect(testInfo.annotations).toEqual([
      { type: 'scenario-status', description: 'PASS' },
    ]);
    expect(testInfo.attach.mock.calls.map(([name]) => name)).toEqual([
      'scenario-run-report',
    ]);
  });

  it('attaches the heal report and passes PASS_HEALED_TRIGGER under the report policy', async () => {
    const testInfo = createTestInfo();

    const report = await runScenarioInTest({
      loaded: buildLoaded(),
      platform: 'android',
      bindings: {
        'Glue.tapOpen': jest.fn().mockResolvedValue(undefined),
        'Glue.isOpen': jest.fn().mockResolvedValue(undefined),
      },
      locatorActions,
      performanceTracker: { addTimer: jest.fn() },
      driver: {} as Browser,
      testInfo,
      env: { SCENARIO_SIMULATE_DRIFT: '1:binding' },
    });

    expect(report.status).toBe('PASS_HEALED_TRIGGER');
    const healAttachment = testInfo.attach.mock.calls.find(
      ([name]) => name === 'scenario-heal-report',
    );
    expect(JSON.parse(healAttachment?.[1].body)).toEqual(
      expect.objectContaining({
        lockfile: 'glue.scenario.lock.json',
        heals: [expect.objectContaining({ stepId: '1', role: 'trigger' })],
      }),
    );
  });

  it('fails the test for healed runs under PERF_HEAL_POLICY=fail', async () => {
    await expect(
      runScenarioInTest({
        loaded: buildLoaded(),
        platform: 'android',
        bindings: {
          'Glue.tapOpen': jest.fn().mockResolvedValue(undefined),
          'Glue.isOpen': jest.fn().mockResolvedValue(undefined),
        },
        locatorActions,
        performanceTracker: { addTimer: jest.fn() },
        driver: {} as Browser,
        testInfo: createTestInfo(),
        env: {
          PERF_HEAL_POLICY: 'fail',
          SCENARIO_SIMULATE_DRIFT: '1:binding',
        },
      }),
    ).rejects.toBeInstanceOf(ScenarioRunError);
  });

  it('fails the test with INVALID_MEASUREMENT after attaching the reports', async () => {
    const testInfo = createTestInfo();

    await expect(
      runScenarioInTest({
        loaded: buildLoaded(),
        platform: 'android',
        bindings: {
          'Glue.tapOpen': jest.fn().mockResolvedValue(undefined),
          'Glue.isOpen': jest.fn().mockResolvedValue(undefined),
        },
        locatorActions,
        performanceTracker: { addTimer: jest.fn() },
        driver: {} as Browser,
        testInfo,
        env: { SCENARIO_SIMULATE_DRIFT: '2:binding' },
      }),
    ).rejects.toThrow('INVALID_MEASUREMENT');
    expect(testInfo.annotations).toEqual([
      { type: 'scenario-status', description: 'INVALID_MEASUREMENT' },
    ]);
    expect(testInfo.attach.mock.calls.map(([name]) => name)).toEqual([
      'scenario-run-report',
      'scenario-heal-report',
    ]);
  });
});
