import type { Browser } from 'webdriverio';
import { parseScenario, parseScenarioLock } from './ScenarioLoader.ts';
import { runScenarioInTest, ScenarioRunError } from './runScenarioInTest.ts';
import type { LocatorActions } from './ScenarioExecutor.ts';
import type { LoadedScenario } from './types.ts';

let counter = 0;

function buildLoaded(): LoadedScenario {
  counter += 1;
  const scenario = parseScenario(`
id: glue
title: Glue ${counter}
tags: ['@PerformanceShadow']
team: '@qa-team'
platforms: [android]
steps:
  - id: open
    do: Tap open
  - id: opened
    expect: The screen is open
timers:
  - name: glue timer ${counter}
    after: open
    until: opened
    threshold: { ios: 60000, android: 60000 }
`);
  const lock = parseScenarioLock(
    JSON.stringify({
      scenario: 'glue',
      generatedFrom: 'test',
      steps: {
        open: {
          text: 'Tap open',
          action: 'tap',
          binding: 'Glue.tapOpen',
          source: 'Glue.ts',
          locators: [
            { strategy: 'testID', value: 'open-button', source: 'ids' },
          ],
        },
        opened: {
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
    scenarioPath: 'glue.yaml',
    lockPath: 'glue.lock.json',
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
      env: { SCENARIO_SIMULATE_DRIFT: 'open:binding' },
    });

    expect(report.status).toBe('PASS_HEALED_TRIGGER');
    const healAttachment = testInfo.attach.mock.calls.find(
      ([name]) => name === 'scenario-heal-report',
    );
    expect(JSON.parse(healAttachment?.[1].body)).toEqual(
      expect.objectContaining({
        lockfile: 'glue.lock.json',
        heals: [expect.objectContaining({ stepId: 'open', role: 'trigger' })],
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
          SCENARIO_SIMULATE_DRIFT: 'open:binding',
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
        env: { SCENARIO_SIMULATE_DRIFT: 'opened:binding' },
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
