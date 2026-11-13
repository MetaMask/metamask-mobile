/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import { scenarioTest } from '../../login/scenarios/scenarioTest';
import { ONBOARDING_CHECKS, ONBOARDING_STEPS } from './onboardingScenarioSteps';

// Tagged @PerformanceShadow in the scenario file; never picked up by scheduled CI.
// Every step is code (Secret / App / code checks): no model calls expected.
scenarioTest(
  path.join(__dirname, 'cold-start-after-wallet-import.scenario.md'),
  [],
  {
    codeSteps: ONBOARDING_STEPS,
    codeChecks: ONBOARDING_CHECKS,
    requiredEnv: ['TEST_SRP_3'],
  },
);
