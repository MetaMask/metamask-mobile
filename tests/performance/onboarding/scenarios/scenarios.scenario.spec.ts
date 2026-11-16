import { registerScenarioDirectory } from '../../../framework/scenario-agent/scenarioTest';
import { ONBOARDING_SCENARIO_OPTIONS } from './scenarioOptions';

registerScenarioDirectory({
  directory: __dirname,
  include: (file) => !file.startsWith('seedless-'),
  registry: ONBOARDING_SCENARIO_OPTIONS,
});
