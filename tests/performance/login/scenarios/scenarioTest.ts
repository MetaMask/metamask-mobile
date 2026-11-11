/* eslint-disable import-x/no-nodejs-modules -- reads the scenario next to its spec */
import fs from 'fs';
import path from 'path';
import type TimerHelper from '../../../framework/TimerHelper';
import { test } from '../../../framework/fixtures/playwright';
import { loginToAppPlaywright } from '../../../flows/wallet.flow';
import {
  missingEnv,
  parseScenario,
  requireSecretEnv,
  type AppCommand,
} from '../../../framework/scenario-agent/scenario';
import {
  ScenarioAgent,
  type StepCache,
} from '../../../framework/scenario-agent/ScenarioAgent';
import {
  buildScenarioOutcome,
  OUTCOME_FILE_PREFIX,
  type ScenarioOutcome,
} from '../../../framework/scenario-agent/heal';
import QualityGatesValidator from '../../../framework/quality-gates/QualityGatesValidator';
import {
  enableHermesAppProfiling,
  skipHermesCollectionUntilRestart,
} from '../../helpers/appProfiling';
import AppiumGestures from '../../../framework/AppiumGestures';
import LoginView from '../../../page-objects/wallet/LoginView';
import { getPasswordForScenario } from '../../../framework/utils/TestConstants.js';
import WalletView from '../../../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../../../page-objects/wallet/AccountListBottomSheet';
import ImportWalletView from '../../../page-objects/Onboarding/ImportWalletView';
import { resolvePerpsGtmOnboardingModalEnabled } from '../../../flows/perps.flow.js';
import { fetchProductionFeatureFlags } from '../../feature-flag-helper.js';

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

/**
 * Registers one Playwright test for a `*.scenario.md` file. The cache sits
 * next to it as `*.scenario.cache.json`. `hints` are Page Object testIDs
 * offered to the model.
 */
/** What a scenario's own code steps get from the Playwright fixture. */
export interface ScenarioCodeContext {
  currentDeviceDetails: { platform: 'android' | 'ios'; deviceName?: string };
  performanceTracker: unknown;
}

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

export { missingEnv };

const REPO_ROOT = path.resolve(__dirname, '../../../..');
/** Uploaded by HyperExecute with the performance reports. */
const OUTCOME_DIR = path.resolve(__dirname, '../../../reporters/reports');

/** The outcome an earlier attempt of this job wrote, or null. */
const readOutcome = (outcomePath: string): ScenarioOutcome | null => {
  try {
    return JSON.parse(fs.readFileSync(outcomePath, 'utf8')) as ScenarioOutcome;
  } catch {
    return null;
  }
};

const readCache = (cachePath: string): StepCache | null =>
  fs.existsSync(cachePath)
    ? (JSON.parse(fs.readFileSync(cachePath, 'utf8')) as StepCache)
    : null;

export function scenarioTest(
  scenarioPath: string,
  hints: unknown[],
  options: ScenarioTestOptions = {},
): void {
  const scenario = parseScenario(fs.readFileSync(scenarioPath, 'utf8'));
  const vocabulary = hints.filter(
    (value): value is string => typeof value === 'string',
  );

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

        // perps-add-funds fetches production flags before login, so the
        // network call is not part of any timed window.
        const needsPerpsFlags = scenario.steps.some(
          (s) => s.condition === 'perps-gtm-onboarding',
        );
        const productionFeatureFlags = needsPerpsFlags
          ? await fetchProductionFeatureFlags('main', testEnvironment)
          : null;

        const cachePath = scenarioPath.replace(/\.md$/, '.cache.json');
        const cacheBefore = readCache(cachePath);
        const outcomePath = path.join(
          OUTCOME_DIR,
          `${OUTCOME_FILE_PREFIX}${path.basename(scenarioPath, '.scenario.md')}.json`,
        );
        // A retry replays the cache the failed attempt already healed, so it
        // would report no drift. Keep the cache from before the first attempt.
        const cacheBaseline =
          testInfo.retry > 0
            ? (readOutcome(outcomePath)?.cacheBaseline ?? cacheBefore)
            : cacheBefore;
        const result = await new ScenarioAgent({
          scenario,
          platform: currentDeviceDetails.platform,
          cachePath,
          tracker: performanceTracker,
          hints: vocabulary,
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
            const own = options.conditions?.[name];
            if (own) return own();
            if (name === 'perps-gtm-onboarding') {
              return resolvePerpsGtmOnboardingModalEnabled(
                productionFeatureFlags,
              );
            }
            throw new Error(`No code path for condition "${name}"`);
          },
          runSecretStep: async (text) => {
            const own = options.codeSteps?.[text];
            if (own) {
              await own({
                currentDeviceDetails:
                  currentDeviceDetails as ScenarioCodeContext['currentDeviceDetails'],
                performanceTracker,
              });
              return;
            }
            // import-multiple-srps: the second SRP from the environment, typed
            // by ImportWalletView; never on a screen sent to the model.
            if (/second (?:srp|secret recovery phrase)/i.test(text)) {
              const srp = requireSecretEnv('TEST_SRP_2');
              await ImportWalletView.typeSecretRecoveryPhrase(srp, false);
              await AppiumGestures.hideKeyboard();
              await ImportWalletView.tapContinueButton(false);
              return;
            }
            // On the login screen already (after a relaunch): the same
            // LoginView calls as the launch-time originals.
            if (/login screen/i.test(text) && /password/i.test(text)) {
              await LoginView.enterPassword(getPasswordForScenario('login'));
              await LoginView.tapLoginButton();
              return;
            }
            if (!/log ?in|unlock/i.test(text)) {
              throw new Error(`No code path for secret step "${text}"`);
            }
            await loginToAppPlaywright();
            // Some originals (cold start) never arm profiling.
            if (!/without profiling/i.test(text))
              await enableHermesAppProfiling();
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
          attempt: testInfo.retry,
          cacheAfter: readCache(cachePath),
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

/** In-app amount keypad keys (QuoteView.getKeypadKey / SendView numpad). */
export const KEYPAD_HINTS = [
  ...[...'0123456789'].map((digit) => `keypad-key-${digit}`),
  'keypad-key-dot',
  'keypad-delete-button',
];
