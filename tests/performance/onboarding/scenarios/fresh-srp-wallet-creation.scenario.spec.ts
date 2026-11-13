/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import { scenarioTest } from '../../login/scenarios/scenarioTest';
import { ONBOARDING_CHECKS, ONBOARDING_STEPS } from './onboardingScenarioSteps';

// Tagged @PerformanceShadow in the scenario file; never picked up by scheduled CI.
// The onboarding password comes from TestConstants in a Secret step.
scenarioTest(
  path.join(__dirname, 'fresh-srp-wallet-creation.scenario.md'),
  [],
  { codeSteps: ONBOARDING_STEPS, codeChecks: ONBOARDING_CHECKS },
);
