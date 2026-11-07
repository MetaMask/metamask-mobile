import type { Browser } from 'webdriverio';
import TimerHelper from '../TimerHelper.ts';
import TimerStore from '../TimerStore.ts';
import { isOverheadTrackingActive } from '../AppiumUtilities.ts';
import type {
  LocatorRecoveryContext,
  RecoveredLocator,
} from '../ai-locator/SelfHealingLocator.ts';
import {
  configurePerformanceLocatorRecovery,
  getPerformanceLocatorRecovery,
} from '../ai-locator/PerformanceLocatorRecovery.ts';
import { parseScenario, parseScenarioLock } from './ScenarioLoader.ts';
import {
  ScenarioExecutor,
  type BindingRegistry,
  type LocatorActions,
  type ScenarioExecutorOptions,
} from './ScenarioExecutor.ts';
import { parseSimulatedDrift } from './simulateDrift.ts';
import type { LoadedScenario, StepParams } from './types.ts';

const appiumDriver = {} as Browser;
let scenarioCounter = 0;

/**
 * open (tap, trigger) -> opened (expect, until) -> pick (macro)
 * -> menu (untimed tap) -> secret (sensitive tap)
 */
function buildScenario(threshold = { ios: 60_000, android: 60_000 }): {
  loaded: LoadedScenario;
  timerName: string;
} {
  scenarioCounter += 1;
  const timerName = `open timer ${scenarioCounter}`;
  const scenario = parseScenario(`
id: demo
title: Demo ${scenarioCounter}
tags: ['@PerformanceShadow']
team: '@qa-team'
platforms: [android]
steps:
  - id: open
    do: Tap open
  - id: opened
    expect: The screen is open
  - id: pick
    do: Pick a token
    params: { token: USDC }
  - id: menu
    do: Tap the menu
  - id: secret
    do: Enter the secret
    sensitive: true
timers:
  - name: ${timerName}
    after: open
    until: opened
    threshold: { ios: ${threshold.ios}, android: ${threshold.android} }
`);
  const lock = parseScenarioLock(
    JSON.stringify({
      scenario: 'demo',
      generatedFrom: 'test',
      steps: {
        open: {
          text: 'Tap open',
          action: 'tap',
          binding: 'Demo.tapOpen',
          source: 'Demo.ts#tapOpen',
          locators: [
            { strategy: 'testID', value: 'open-button', source: 'ids' },
          ],
        },
        opened: {
          text: 'The screen is open',
          action: 'assertVisible',
          binding: 'Demo.isOpen',
          source: 'Demo.ts#isOpen',
          locators: [
            { strategy: 'testID', value: 'open-screen', source: 'ids' },
          ],
        },
        pick: {
          text: 'Pick a token',
          action: 'macro',
          binding: 'Demo.pick',
          source: 'Demo.ts#pick',
          locators: [],
        },
        menu: {
          text: 'Tap the menu',
          action: 'tap',
          binding: 'Demo.tapMenu',
          source: 'Demo.ts#tapMenu',
          locators: [
            { strategy: 'testID', value: 'menu-button', source: 'ids' },
          ],
        },
        secret: {
          text: 'Enter the secret',
          action: 'tap',
          binding: 'Demo.enterSecret',
          source: 'Demo.ts#enterSecret',
          locators: [
            { strategy: 'testID', value: 'secret-input', source: 'ids' },
          ],
        },
      },
    }),
    scenario,
  );
  return {
    loaded: {
      scenario,
      lock,
      scenarioPath: 'demo.yaml',
      lockPath: 'demo.lock.json',
    },
    timerName,
  };
}

type BindingMock = jest.Mock<Promise<void>, [StepParams]>;

function createBindings(events: string[]): Record<string, BindingMock> {
  const binding = (name: string): BindingMock =>
    jest.fn(async (_params: StepParams) => {
      events.push(`binding:${name}`);
    });
  return {
    'Demo.tapOpen': binding('open'),
    'Demo.isOpen': binding('opened'),
    'Demo.pick': binding('pick'),
    'Demo.tapMenu': binding('menu'),
    'Demo.enterSecret': binding('secret'),
  };
}

function failing(events: string[], name: string): BindingMock {
  return jest.fn(async (_params: StepParams) => {
    events.push(`binding:${name}`);
    throw new Error(`${name} selector not found`);
  });
}

type LocatorActionMock = jest.Mock<Promise<void>, [RecoveredLocator, string]>;

function createLocatorActions(events: string[]): {
  tap: LocatorActionMock;
  assertVisible: LocatorActionMock;
} {
  return {
    tap: jest.fn(async (locator: RecoveredLocator, _description: string) => {
      events.push(`tap:${locator.value}`);
    }),
    assertVisible: jest.fn(
      async (locator: RecoveredLocator, _description: string) => {
        events.push(`visible:${locator.value}`);
      },
    ),
  };
}

function aiMock(
  impl: (context: LocatorRecoveryContext) => Promise<RecoveredLocator | null>,
): jest.Mock<Promise<RecoveredLocator | null>, [LocatorRecoveryContext]> {
  return jest.fn(impl);
}

function createExecutor(
  overrides: Partial<ScenarioExecutorOptions> & {
    loaded: LoadedScenario;
    bindings: BindingRegistry;
    locatorActions: LocatorActions;
  },
) {
  const performanceTracker = { addTimer: jest.fn() };
  const executor = new ScenarioExecutor({
    platform: 'android',
    performanceTracker,
    driver: appiumDriver,
    policy: 'report',
    log: jest.fn(),
    ...overrides,
  });
  return { executor, performanceTracker };
}

describe('ScenarioExecutor resolution order', () => {
  it('runs bound Page Object methods only when they succeed', async () => {
    const events: string[] = [];
    const { loaded, timerName } = buildScenario();
    const bindings = createBindings(events);
    const locatorActions = createLocatorActions(events);
    const aiProvider = { recover: jest.fn() };
    const { executor, performanceTracker } = createExecutor({
      loaded,
      bindings,
      locatorActions,
      aiProvider,
    });

    const report = await executor.run();

    expect(events).toEqual([
      'binding:open',
      'binding:opened',
      'binding:pick',
      'binding:menu',
      'binding:secret',
    ]);
    expect(bindings['Demo.pick']).toHaveBeenCalledWith({ token: 'USDC' });
    expect(locatorActions.tap).not.toHaveBeenCalled();
    expect(aiProvider.recover).not.toHaveBeenCalled();
    expect(performanceTracker.addTimer).toHaveBeenCalledTimes(1);
    const [timer] = performanceTracker.addTimer.mock.calls[0];
    expect(timer).toBeInstanceOf(TimerHelper);
    expect(timer.id).toBe(timerName);
    expect(report.status).toBe('PASS');
    expect(report.heals).toEqual([]);
  });

  it('falls back to lockfile alternatives before the AI provider', async () => {
    const events: string[] = [];
    const { loaded } = buildScenario();
    const bindings = createBindings(events);
    bindings['Demo.tapMenu'] = failing(events, 'menu');
    const aiProvider = { recover: jest.fn() };
    const { executor } = createExecutor({
      loaded,
      bindings,
      locatorActions: createLocatorActions(events),
      aiProvider,
    });

    const report = await executor.run();

    expect(events).toContain('tap:menu-button');
    expect(events.indexOf('binding:menu')).toBeLessThan(
      events.indexOf('tap:menu-button'),
    );
    expect(aiProvider.recover).not.toHaveBeenCalled();
    expect(report.status).toBe('PASS_HEALED');
    expect(report.heals).toEqual([
      expect.objectContaining({
        stepId: 'menu',
        role: 'untimed',
        tier: 'alternative',
        locator: { strategy: 'testID', value: 'menu-button' },
        diagnosisOnly: false,
      }),
    ]);
  });

  it('calls the AI provider only after the binding and every alternative fail', async () => {
    const events: string[] = [];
    const { loaded } = buildScenario();
    const bindings = createBindings(events);
    bindings['Demo.tapMenu'] = failing(events, 'menu');
    const locatorActions = createLocatorActions(events);
    locatorActions.tap.mockImplementation(async (locator) => {
      events.push(`tap:${locator.value}`);
      if (locator.value === 'menu-button') {
        throw new Error('menu-button not found');
      }
    });
    const aiProvider = {
      recover: aiMock(async () => {
        events.push('ai');
        return { strategy: 'label' as const, value: 'Menu' };
      }),
    };
    const { executor } = createExecutor({
      loaded,
      bindings,
      locatorActions,
      aiProvider,
    });

    const report = await executor.run();

    expect(
      events.slice(
        events.indexOf('binding:menu'),
        events.indexOf('tap:Menu') + 1,
      ),
    ).toEqual(['binding:menu', 'tap:menu-button', 'ai', 'tap:Menu']);
    const context = aiProvider.recover.mock.calls[0][0];
    expect(context.intent).toContain('Tap the menu');
    expect(context.intent).toContain('Demo.tapMenu');
    expect(context.knownLocators).toEqual([
      { strategy: 'testID', value: 'menu-button' },
    ]);
    expect(report.status).toBe('PASS_HEALED');
    expect(report.ai.calls).toBe(1);
    expect(report.heals[0].proposedLockPatch.locators[0]).toEqual(
      expect.objectContaining({ strategy: 'label', value: 'Menu' }),
    );
  });

  it('fails with a clear error when the lock references an unknown binding', () => {
    const { loaded } = buildScenario();
    const bindings = createBindings([]);
    delete (bindings as BindingRegistry)['Demo.pick'];

    expect(() =>
      createExecutor({
        loaded,
        bindings,
        locatorActions: createLocatorActions([]),
      }),
    ).toThrow('unknown bindings: Demo.pick');
  });
});

describe('ScenarioExecutor timed windows', () => {
  it('measures the until binding inside the timer', async () => {
    const events: string[] = [];
    const { loaded } = buildScenario();
    const bindings = createBindings(events);
    let timerActiveDuringEndCondition = false;
    bindings['Demo.isOpen'] = jest.fn(async (_params: StepParams) => {
      timerActiveDuringEndCondition = TimerStore.hasActiveTimer();
    });
    const { executor } = createExecutor({
      loaded,
      bindings,
      locatorActions: createLocatorActions(events),
    });

    const report = await executor.run();

    expect(timerActiveDuringEndCondition).toBe(true);
    expect(report.timers[0]).toEqual(
      expect.objectContaining({ valid: true, reason: null }),
    );
  });

  it('heals a trigger before its timer starts and reports PASS_HEALED_TRIGGER', async () => {
    const events: string[] = [];
    const { loaded } = buildScenario();
    const bindings = createBindings(events);
    bindings['Demo.tapOpen'] = failing(events, 'open');
    const locatorActions = createLocatorActions(events);
    let timerActiveDuringHeal: boolean | null = null;
    locatorActions.tap.mockImplementation(async () => {
      timerActiveDuringHeal = TimerStore.hasActiveTimer();
    });
    const { executor, performanceTracker } = createExecutor({
      loaded,
      bindings,
      locatorActions,
    });

    const report = await executor.run();

    expect(timerActiveDuringHeal).toBe(false);
    expect(performanceTracker.addTimer).toHaveBeenCalledTimes(1);
    expect(report.status).toBe('PASS_HEALED_TRIGGER');
    expect(report.heals[0]).toEqual(
      expect.objectContaining({ stepId: 'open', role: 'trigger' }),
    );
  });

  it('never heals inside a timed window: a failing end condition invalidates the timer', async () => {
    const events: string[] = [];
    const { loaded, timerName } = buildScenario();
    const bindings = createBindings(events);
    bindings['Demo.isOpen'] = failing(events, 'opened');
    const locatorActions = createLocatorActions(events);
    let timerActiveDuringDiagnosis: boolean | null = null;
    locatorActions.assertVisible.mockImplementation(async (locator) => {
      timerActiveDuringDiagnosis = TimerStore.hasActiveTimer();
      events.push(`visible:${locator.value}`);
    });
    const { executor, performanceTracker } = createExecutor({
      loaded,
      bindings,
      locatorActions,
    });

    const report = await executor.run();

    expect(timerActiveDuringDiagnosis).toBe(false);
    expect(performanceTracker.addTimer).not.toHaveBeenCalled();
    expect(report.status).toBe('INVALID_MEASUREMENT');
    expect(report.timers).toEqual([
      expect.objectContaining({
        name: timerName,
        valid: false,
        durationMs: null,
      }),
    ]);
    expect(report.heals[0]).toEqual(
      expect.objectContaining({
        stepId: 'opened',
        role: 'until',
        diagnosisOnly: true,
      }),
    );
    // The flow continues after diagnosis so later drift is found in the same run.
    expect(events).toContain('binding:secret');
    // Later timers must not inherit overhead tracking from the failed window.
    expect(isOverheadTrackingActive()).toBe(false);
  });

  it('calls the AI for a failed end condition only after the timer has stopped', async () => {
    const events: string[] = [];
    const { loaded } = buildScenario();
    const bindings = createBindings(events);
    bindings['Demo.isOpen'] = failing(events, 'opened');
    const locatorActions = createLocatorActions(events);
    locatorActions.assertVisible.mockImplementation(async (locator) => {
      if (locator.value === 'open-screen') {
        throw new Error('open-screen not found');
      }
    });
    let timerActiveDuringAiCall: boolean | null = null;
    const aiProvider = {
      recover: aiMock(async () => {
        timerActiveDuringAiCall = TimerStore.hasActiveTimer();
        return { strategy: 'testID' as const, value: 'open-screen-v2' };
      }),
    };
    const { executor, performanceTracker } = createExecutor({
      loaded,
      bindings,
      locatorActions,
      aiProvider,
    });

    const report = await executor.run();

    expect(timerActiveDuringAiCall).toBe(false);
    expect(performanceTracker.addTimer).not.toHaveBeenCalled();
    expect(report.status).toBe('INVALID_MEASUREMENT');
    expect(report.heals[0]).toEqual(
      expect.objectContaining({
        tier: 'ai',
        role: 'until',
        diagnosisOnly: true,
      }),
    );
  });

  it('refuses alternatives and AI while any performance timer is running', async () => {
    const events: string[] = [];
    const { loaded } = buildScenario();
    const bindings = createBindings(events);
    bindings['Demo.tapMenu'] = failing(events, 'menu');
    const locatorActions = createLocatorActions(events);
    const aiProvider = { recover: jest.fn() };
    const { executor } = createExecutor({
      loaded,
      bindings,
      locatorActions,
      aiProvider,
    });
    const outerTimer = new TimerHelper(`outer timer ${scenarioCounter}`);
    outerTimer.start();

    let report;
    try {
      report = await executor.run();
    } finally {
      outerTimer.stop();
    }

    expect(locatorActions.tap).not.toHaveBeenCalled();
    expect(aiProvider.recover).not.toHaveBeenCalled();
    expect(report.status).toBe('FAIL_FUNCTIONAL');
    const menu = report.steps.find((step) => step.id === 'menu');
    expect(menu?.skippedTiers).toContain('ai: a performance timer is running');
  });

  it('reports FAIL_THRESHOLD from the quality gate pre-check', async () => {
    const events: string[] = [];
    const { loaded } = buildScenario({ ios: 1, android: 1 });
    const bindings = createBindings(events);
    // testSetup.js freezes Date.now; advance it inside the measured binding.
    let now = 1_000;
    const dateNow = jest.mocked(Date.now);
    dateNow.mockImplementation(() => now);
    bindings['Demo.isOpen'] = jest.fn(async (_params: StepParams) => {
      now += 50;
    });
    const { executor, performanceTracker } = createExecutor({
      loaded,
      bindings,
      locatorActions: createLocatorActions(events),
    });

    let report;
    try {
      report = await executor.run();
    } finally {
      dateNow.mockImplementation(() => 123);
    }

    expect(performanceTracker.addTimer).toHaveBeenCalledTimes(1);
    expect(report.status).toBe('FAIL_THRESHOLD');
    expect(report.qualityGates.passed).toBe(false);
    expect(report.qualityGates.violations[0]).toContain('exceeded');
  });
});

describe('ScenarioExecutor heal guards', () => {
  it('never sends a sensitive step to the AI provider', async () => {
    const events: string[] = [];
    const { loaded } = buildScenario();
    const bindings = createBindings(events);
    bindings['Demo.enterSecret'] = failing(events, 'secret');
    const locatorActions = createLocatorActions(events);
    locatorActions.tap.mockRejectedValue(new Error('secret-input not found'));
    const aiProvider = { recover: jest.fn() };
    const { executor } = createExecutor({
      loaded,
      bindings,
      locatorActions,
      aiProvider,
    });

    const report = await executor.run();

    expect(aiProvider.recover).not.toHaveBeenCalled();
    expect(report.status).toBe('FAIL_FUNCTIONAL');
    const secret = report.steps.find((step) => step.id === 'secret');
    expect(secret?.skippedTiers.join(' ')).toContain('step is sensitive');
  });

  it('runs macro steps only through their binding and skips the rest of the flow on failure', async () => {
    const events: string[] = [];
    const { loaded } = buildScenario();
    const bindings = createBindings(events);
    bindings['Demo.pick'] = failing(events, 'pick');
    const locatorActions = createLocatorActions(events);
    const aiProvider = { recover: jest.fn() };
    const { executor } = createExecutor({
      loaded,
      bindings,
      locatorActions,
      aiProvider,
    });

    const report = await executor.run();

    expect(locatorActions.tap).not.toHaveBeenCalled();
    expect(aiProvider.recover).not.toHaveBeenCalled();
    expect(report.status).toBe('FAIL_FUNCTIONAL');
    expect(
      report.steps.filter((step) => step.status === 'skipped').map((s) => s.id),
    ).toEqual(['menu', 'secret']);
  });

  it('runs bindings only under PERF_HEAL_POLICY=off', async () => {
    const events: string[] = [];
    const { loaded } = buildScenario();
    const bindings = createBindings(events);
    bindings['Demo.tapMenu'] = failing(events, 'menu');
    const locatorActions = createLocatorActions(events);
    const aiProvider = { recover: jest.fn() };
    const { executor } = createExecutor({
      loaded,
      bindings,
      locatorActions,
      aiProvider,
      policy: 'off',
    });

    const report = await executor.run();

    expect(locatorActions.tap).not.toHaveBeenCalled();
    expect(aiProvider.recover).not.toHaveBeenCalled();
    expect(report.status).toBe('FAIL_FUNCTIONAL');
  });

  it('stops calling the AI once the per-run budget is used', async () => {
    const events: string[] = [];
    const { loaded } = buildScenario();
    const bindings = createBindings(events);
    bindings['Demo.tapMenu'] = failing(events, 'menu');
    const locatorActions = createLocatorActions(events);
    locatorActions.tap.mockRejectedValue(new Error('not found'));
    const aiProvider = { recover: jest.fn() };
    const { executor } = createExecutor({
      loaded,
      bindings,
      locatorActions,
      aiProvider,
      maxAiCalls: 0,
    });

    const report = await executor.run();

    expect(aiProvider.recover).not.toHaveBeenCalled();
    const menu = report.steps.find((step) => step.id === 'menu');
    expect(menu?.skippedTiers.join(' ')).toContain('budget');
  });

  it('suspends the per-tap Gestures recovery during the run and restores it', async () => {
    const events: string[] = [];
    const { loaded } = buildScenario();
    const bindings = createBindings(events);
    const perTapRecovery = {
      provider: { recover: jest.fn() },
      onRecovered: jest.fn(),
    };
    configurePerformanceLocatorRecovery(perTapRecovery);
    let recoveryDuringRun: unknown = 'unset';
    bindings['Demo.tapMenu'] = jest.fn(async (_params: StepParams) => {
      recoveryDuringRun = getPerformanceLocatorRecovery();
    });
    const { executor } = createExecutor({
      loaded,
      bindings,
      locatorActions: createLocatorActions(events),
    });

    try {
      await executor.run();
      expect(recoveryDuringRun).toBeUndefined();
      expect(getPerformanceLocatorRecovery()).toBe(perTapRecovery);
    } finally {
      configurePerformanceLocatorRecovery(undefined);
    }
  });
});

describe('ScenarioExecutor simulated drift', () => {
  it('breaks the binding so a lockfile alternative heals the step', async () => {
    const events: string[] = [];
    const { loaded } = buildScenario();
    const bindings = createBindings(events);
    const { executor } = createExecutor({
      loaded,
      bindings,
      locatorActions: createLocatorActions(events),
      simulatedDrift: parseSimulatedDrift('open:binding'),
    });

    const report = await executor.run();

    expect(bindings['Demo.tapOpen']).not.toHaveBeenCalled();
    expect(events[0]).toBe('tap:open-button');
    expect(report.status).toBe('PASS_HEALED_TRIGGER');
  });

  it('breaks the alternatives too so only the AI can heal the step', async () => {
    const events: string[] = [];
    const { loaded } = buildScenario();
    const locatorActions = createLocatorActions(events);
    locatorActions.tap.mockImplementation(async (locator) => {
      events.push(`tap:${locator.value}`);
      if (locator.value.endsWith('__simulated_drift')) {
        throw new Error(`${locator.value} not found`);
      }
    });
    const aiProvider = {
      recover: aiMock(async () => ({
        strategy: 'testID' as const,
        value: 'menu-button',
      })),
    };
    const { executor } = createExecutor({
      loaded,
      bindings: createBindings(events),
      locatorActions,
      aiProvider,
      simulatedDrift: parseSimulatedDrift('menu:locators'),
    });

    const report = await executor.run();

    expect(aiProvider.recover.mock.calls[0][0].knownLocators).toEqual([
      { strategy: 'testID', value: 'menu-button__simulated_drift' },
    ]);
    expect(report.heals[0]).toEqual(
      expect.objectContaining({ stepId: 'menu', tier: 'ai' }),
    );
    expect(report.status).toBe('PASS_HEALED');
  });

  it('rejects unknown drift modes', () => {
    expect(() => parseSimulatedDrift('menu:everything')).toThrow(
      'must use mode "binding" or "locators"',
    );
  });
});
