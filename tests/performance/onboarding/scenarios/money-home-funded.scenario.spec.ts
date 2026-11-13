/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import { scenarioTest } from '../../login/scenarios/scenarioTest';
import { ONBOARDING_CHECKS, ONBOARDING_STEPS } from './onboardingScenarioSteps';

// Tagged @PerformanceShadow in the scenario file; never picked up by scheduled CI.
// TEST_SRP_3 is imported by onboardingFlowImportSRPPlaywright in a Secret step.
scenarioTest(path.join(__dirname, 'money-home-funded.scenario.md'), [], {
  codeSteps: ONBOARDING_STEPS,
  codeChecks: ONBOARDING_CHECKS,
  requiredEnv: ['TEST_SRP_3'],
});
