import type { Browser } from 'webdriverio';
import type { LocatorRecoveryProvider } from '../ai-locator/SelfHealingLocator.ts';
import {
  ScenarioExecutor,
  type BindingRegistry,
  type LocatorActions,
  type ScenarioTimerTracker,
} from './ScenarioExecutor.ts';
import { formatScenarioReport } from './formatScenarioReport.ts';
import { getStatusFailureReason, resolveHealPolicy } from './runStatus.ts';
import { parseSimulatedDrift } from './simulateDrift.ts';
import type {
  LoadedScenario,
  ScenarioPlatform,
  ScenarioRunReport,
} from './types.ts';

/** Subset of Playwright's TestInfo used here, so the glue is unit-testable. */
export interface ScenarioTestInfo {
  annotations: { type: string; description?: string }[];
  attach(
    name: string,
    options: { body: string; contentType: string },
  ): Promise<void>;
}

export class ScenarioRunError extends Error {
  readonly report: ScenarioRunReport;

  constructor(report: ScenarioRunReport, reason: string) {
    super(`Scenario "${report.scenarioId}" ${report.status}: ${reason}`);
    this.name = 'ScenarioRunError';
    this.report = report;
  }
}

export interface RunScenarioInTestOptions {
  loaded: LoadedScenario;
  platform: ScenarioPlatform;
  bindings: BindingRegistry;
  locatorActions: LocatorActions;
  performanceTracker: ScenarioTimerTracker;
  driver: Browser;
  testInfo: ScenarioTestInfo;
  aiProvider?: LocatorRecoveryProvider;
  env?: Record<string, string | undefined>;
}

/**
 * Runs a scenario inside a performance Playwright test: prints the run block,
 * adds a `scenario-status` annotation, attaches `scenario-run-report` (and
 * `scenario-heal-report` when anything healed), then fails the test when the
 * status and `PERF_HEAL_POLICY` require it.
 */
export async function runScenarioInTest(
  options: RunScenarioInTestOptions,
): Promise<ScenarioRunReport> {
  const env = options.env ?? process.env;
  const policy = resolveHealPolicy(env.PERF_HEAL_POLICY);
  const executor = new ScenarioExecutor({
    loaded: options.loaded,
    platform: options.platform,
    bindings: options.bindings,
    locatorActions: options.locatorActions,
    performanceTracker: options.performanceTracker,
    driver: options.driver,
    aiProvider: options.aiProvider,
    policy,
    simulatedDrift: parseSimulatedDrift(env.SCENARIO_SIMULATE_DRIFT),
    env,
  });

  const report = await executor.run();

  console.log(formatScenarioReport(report));
  options.testInfo.annotations.push({
    type: 'scenario-status',
    description: report.status,
  });
  await options.testInfo.attach('scenario-run-report', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });
  if (report.heals.length > 0) {
    await options.testInfo.attach('scenario-heal-report', {
      body: JSON.stringify(
        {
          scenarioId: report.scenarioId,
          status: report.status,
          lockfile: options.loaded.lockPath,
          heals: report.heals,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
  }

  const failureReason = getStatusFailureReason(report.status, policy);
  if (failureReason) {
    throw new ScenarioRunError(report, failureReason);
  }
  return report;
}
