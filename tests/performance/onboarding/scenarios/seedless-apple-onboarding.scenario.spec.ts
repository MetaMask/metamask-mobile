/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import { scenarioTest } from '../../login/scenarios/scenarioTest';
import {
  ONBOARDING_CHECKS,
  ONBOARDING_STEPS,
  seedlessOptions,
} from './onboardingScenarioSteps';

// Tagged @PerformanceShadow in the scenario file; never picked up by scheduled CI.
// OAuth is mocked by the seedless TestMu build; the password comes from TestConstants.
scenarioTest(
  path.join(__dirname, 'seedless-apple-onboarding.scenario.md'),
  [],
  {
    ...seedlessOptions('apple'),
    skip: 'known app failure',
  },
);
