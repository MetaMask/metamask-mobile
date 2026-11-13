/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import { scenarioTest } from '../../login/scenarios/scenarioTest';
import { ONBOARDING_CHECKS, ONBOARDING_STEPS } from './onboardingScenarioSteps';

// Tagged @PerformanceShadow in the scenario file; never picked up by scheduled CI.
// The original is test.skip: registered as skipped, no device session.
scenarioTest(
  path.join(__dirname, 'imported-wallet-account-creation.scenario.md'),
  [],
  {
    codeSteps: ONBOARDING_STEPS,
    codeChecks: ONBOARDING_CHECKS,
    requiredEnv: ['TEST_SRP_2'],
    skip: 'Skipped like the original (test.skip in imported-wallet-account-creation.spec.ts)',
  },
);
