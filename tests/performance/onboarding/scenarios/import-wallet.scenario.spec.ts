/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import { scenarioTest } from '../../login/scenarios/scenarioTest';
import { ONBOARDING_CHECKS, ONBOARDING_STEPS } from './onboardingScenarioSteps';

// Tagged @PerformanceShadow in the scenario file; never picked up by scheduled CI.
// TEST_SRP_3 is typed by ImportWalletView in a Secret step; missing -> skipped with its name.
scenarioTest(path.join(__dirname, 'import-wallet.scenario.md'), [], {
  codeSteps: ONBOARDING_STEPS,
  codeChecks: ONBOARDING_CHECKS,
  requiredEnv: ['TEST_SRP_3'],
});
