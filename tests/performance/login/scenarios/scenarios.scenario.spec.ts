import { registerScenarioDirectory } from '../../../framework/scenario-agent/scenarioTest';
import { LOGIN_SCENARIO_OPTIONS } from './scenarioOptions';

registerScenarioDirectory({
  directory: __dirname,
  include: () => true,
  registry: LOGIN_SCENARIO_OPTIONS,
});
