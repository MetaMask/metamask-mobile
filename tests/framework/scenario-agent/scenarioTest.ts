/* eslint-disable import-x/no-nodejs-modules -- reads the scenario and writes its outcome */
import fs from 'fs';
import path from 'path';
import type TimerHelper from '../TimerHelper';
import { test } from '../fixtures/playwright';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import {
  missingEnv,
  parseScenario,
  requireSecretEnv,
  type AppCommand,
  type Scenario,
} from './scenario';
import { ScenarioAgent } from './ScenarioAgent';
import type { StepCache } from './types';
import {
  buildScenarioOutcome,
  OUTCOME_FILE_PREFIX,
  type ScenarioOutcome,
} from './outcome';
import {
  builtinSecretStep,
  scenarioCoverageProblems,
} from './scenarioCoverage';
import { resolveScenarioHints } from './scenarioHints';
import QualityGatesValidator from '../quality-gates/QualityGatesValidator';
import {
  enableHermesAppProfiling,
  skipHermesCollectionUntilRestart,
} from '../../performance/helpers/appProfiling';
import AppiumGestures from '../AppiumGestures';
import LoginView from '../../page-objects/wallet/LoginView';
import { getPasswordForScenario } from '../utils/TestConstants.js';
import WalletView from '../../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import ImportWalletView from '../../page-objects/Onboarding/ImportWalletView';
import { resolvePerpsGtmOnboardingModalEnabled } from '../../flows/perps.flow.js';
import { fetchProductionFeatureFlags } from '../../performance/feature-flag-helper.js';

/** What a scenario's own code steps get from the Playwright fixture. */
export interface ScenarioCodeContext {
  currentDeviceDetails: { platform: 'android' | 'ios'; deviceName?: string };
  performanceTracker: unknown;
}

/** Per-scenario code paths, keyed by Markdown file name in each area's registry. */
export interface ScenarioTestOptions {
  /**
   * `Secret:` steps this scenario runs with the original spec's helpers,
   * keyed by the exact step text (SRP import, passwords, OAuth, dismissals).
   */
  codeSteps?: Record<
    string,
    (context: ScenarioCodeContext) => Promise<unknown>
  >;
  /** `[check: code=name]` waits for this scenario, next to the shared ones. */
  codeChecks?: Record<string, () => Promise<unknown>>;
  /** Code checks that take the timer, like the original helper does. */
  timedCodeChecks?: Record<string, (timer: TimerHelper) => Promise<unknown>>;
  /** `[if: name]` conditions for this scenario, next to the shared ones. */
  conditions?: Record<string, () => Promise<boolean>>;
  /**
   * Secrets (SRPs, passwords) the code steps need, by env var name. When one
   * is missing the test is registered as skipped with that name in the
   * reason, before any device session; values are never logged.
   */
  requiredEnv?: string[];
  /** Registered as test.skip, like an original that is skipped. */
  skip?: string;
}

/**
 * `[check: code=name]` waits: the original specs' own helpers, for ends that
 * are not one element.
 */
const CODE_CHECKS: Record<string, () => Promise<unknown>> = {
  'balance-stable': () => WalletView.waitForBalanceToStabilize(),
  'account-sync-complete': () =>
    AccountListBottomSheet.waitForAccountSyncToComplete(),
  // ImportWalletView.isScreenTitleVisible(false): "Import a wallet" text.
  'import-srp-screen': () => ImportWalletView.isScreenTitleVisible(false),
};

/** Same environment default as perps-add-funds.spec.ts. */
const testEnvironment = process.env.E2E_PERFORMANCE_BUILD_VARIANT || 'rc';

const REPO_ROOT = path.resolve(__dirname, '../../..');
/** Uploaded by HyperExecute with the performance reports. */
const OUTCOME_DIR = path.resolve(__dirname, '../../reporters/reports');

const readJson = <T>(file: string): T | null => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
};

/** The built-in Secret paths (see scenarioCoverage.builtinSecretStep). */
async function runBuiltinSecretStep(text: string): Promise<void> {
  switch (builtinSecretStep(text)) {
    case 'second-srp':
      // import-multiple-srps: the second SRP from the environment, typed by
      // ImportWalletView; never on a screen sent to the model.
      await ImportWalletView.typeSecretRecoveryPhrase(
        requireSecretEnv('TEST_SRP_2'),
        false,
      );
      await AppiumGestures.hideKeyboard();
      await ImportWalletView.tapContinueButton(false);
      return;
    case 'login-screen':
      // On the login screen already (after a relaunch): the same LoginView
      // calls as the launch-time originals.
      await LoginView.enterPassword(getPasswordForScenario('login'));
      await LoginView.tapLoginButton();
      return;
    case 'login':
      await loginToAppPlaywright();
      // Some originals (cold start) never arm profiling.
      if (!/without profiling/i.test(text)) await enableHermesAppProfiling();
      return;
    default:
      throw new Error(`No code path for secret step "${text}"`);
  }
}

/**
 * Registers one Playwright test for a parsed `*.scenario.md`. The cache sits
 * next to it as `*.scenario.cache.json`.
 */
function scenarioTest(
  scenarioPath: string,
  scenario: Scenario,
  options: ScenarioTestOptions = {},
): void {
  const hints = resolveScenarioHints(scenario.hints);

  test.describe(scenario.tags.join(' '), () => {
    // Model calls and code checks between steps take longer than the
    // original specs' own budget; timers are unaffected.
    test.setTimeout(15 * 60 * 1000);
    // A skipped original stays skipped: registered as test.skip, so no
    // device session is ever created for it.
    const missing = missingEnv(options.requiredEnv);
    const skipReason =
      options.skip ??
      (missing.length > 0
        ? `Missing required secret env var(s): ${missing.join(', ')}`
        : undefined);
    if (skipReason)
      console.warn(
        `[scenario-agent] ${scenario.title}: skipped (${skipReason})`,
      );
    const register = skipReason ? test.skip : test;
    register(
      scenario.title,
      { tag: scenario.team },
      async ({ currentDeviceDetails, performanceTracker }, testInfo) => {
        test.skip(
          !scenario.platforms.includes(currentDeviceDetails.platform),
          `Runs on ${scenario.platforms.join(', ')} only`,
        );
        const context: ScenarioCodeContext = {
          currentDeviceDetails:
            currentDeviceDetails as ScenarioCodeContext['currentDeviceDetails'],
          performanceTracker,
        };

        // perps-add-funds fetches production flags before login, so the
        // network call is not part of any timed window.
        const productionFeatureFlags = scenario.steps.some(
          (s) => s.condition === 'perps-gtm-onboarding',
        )
          ? await fetchProductionFeatureFlags('main', testEnvironment)
          : null;
        const conditions: Record<string, () => Promise<boolean>> = {
          'perps-gtm-onboarding': async () =>
            resolvePerpsGtmOnboardingModalEnabled(productionFeatureFlags),
          ...options.conditions,
        };

        const cachePath = scenarioPath.replace(/\.md$/, '.cache.json');
        const cacheBefore = readJson<StepCache>(cachePath);
        const outcomePath = path.join(
          OUTCOME_DIR,
          `${OUTCOME_FILE_PREFIX}${path.basename(scenarioPath, '.scenario.md')}.json`,
        );
        // A retry replays the cache the failed attempt already corrected, so it
        // would report no drift. Keep the cache (and why it failed) from the
        // first attempt.
        const earlier =
          testInfo.retry > 0 ? readJson<ScenarioOutcome>(outcomePath) : null;
        const cacheBaseline = earlier?.cacheBaseline ?? cacheBefore;
        const result = await new ScenarioAgent({
          scenario,
          platform: currentDeviceDetails.platform,
          cachePath,
          tracker: performanceTracker,
          hints,
          runCodeCheck: async (name) => {
            const check = options.codeChecks?.[name] ?? CODE_CHECKS[name];
            if (!check) throw new Error(`No code path for check "${name}"`);
            await check();
          },
          runTimedCodeCheck: async (name, timer) => {
            const own = options.timedCodeChecks?.[name];
            if (!own) return false;
            await own(timer);
            return true;
          },
          evaluateCondition: async (name) => {
            const condition = conditions[name];
            if (!condition)
              throw new Error(`No code path for condition "${name}"`);
            return condition();
          },
          runSecretStep: async (text) => {
            const own = options.codeSteps?.[text];
            if (own) await own(context);
            else await runBuiltinSecretStep(text);
          },
          runAppStep: async (app: AppCommand) => {
            switch (app.command) {
              case 'terminate':
                return AppiumGestures.terminateApp(currentDeviceDetails);
              case 'activate':
                return AppiumGestures.activateApp(currentDeviceDetails);
              case 'background':
                return AppiumGestures.backgroundApp(app.seconds);
              case 'armProfiling':
                return enableHermesAppProfiling();
              case 'skipProfilingUntilRestart':
                return skipHermesCollectionUntilRestart();
              default:
                throw new Error(`No code path for App step "${app.command}"`);
            }
          },
        }).run();

        await testInfo.attach('scenario-agent-run', {
          body: JSON.stringify(result, null, 2),
          contentType: 'application/json',
        });
        // Read by the CI heal job; gates are pre-checked here because the
        // fixture only validates them after the test body.
        const gates = new QualityGatesValidator().validateTimers(
          scenario.title,
          performanceTracker.timers,
        );
        const outcome = buildScenarioOutcome({
          scenario,
          scenarioPath: path.relative(REPO_ROOT, scenarioPath),
          result,
          cacheBefore,
          cacheBaseline,
          earlierCacheErrors: earlier?.cacheErrors,
          attempt: testInfo.retry,
          cacheAfter: readJson<StepCache>(cachePath),
          thresholdViolations: gates.violations.map((v) => v.message),
        });
        fs.mkdirSync(OUTCOME_DIR, { recursive: true });
        fs.writeFileSync(outcomePath, `${JSON.stringify(outcome, null, 2)}\n`);
        if (result.status !== 'PASS') {
          throw new Error(
            `Scenario ${result.status}: ${JSON.stringify(
              result.timers.filter((t) => !t.valid),
            )} ${result.steps.find((s) => s.error)?.error ?? ''}`,
          );
        }
      },
    );
  });
}

/**
 * Registers every matching `*.scenario.md` in a directory. Throws when the
 * registry names a missing file or a Secret step has no code path.
 */
export function registerScenarioDirectory(options: {
  directory: string;
  /** Which markdown files this Playwright project runs. */
  include: (file: string) => boolean;
  registry: Record<string, ScenarioTestOptions>;
}): void {
  const scenarios = new Map(
    fs
      .readdirSync(options.directory)
      .filter((file) => file.endsWith('.scenario.md'))
      .sort()
      .map((file) => [
        file,
        parseScenario(
          fs.readFileSync(path.join(options.directory, file), 'utf8'),
        ),
      ]),
  );
  const problems = scenarioCoverageProblems(
    [...scenarios.keys()],
    options.registry,
    (file) => scenarios.get(file) as Scenario,
  );
  if (problems.length > 0) {
    throw new Error(`Scenario registry:\n  - ${problems.join('\n  - ')}`);
  }
  for (const [file, scenario] of scenarios) {
    if (!options.include(file)) continue;
    scenarioTest(
      path.join(options.directory, file),
      scenario,
      options.registry[file],
    );
  }
}
