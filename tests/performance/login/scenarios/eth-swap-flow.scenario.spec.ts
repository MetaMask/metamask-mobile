/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario Markdown next to this spec */
import path from 'path';
import { test } from '../../../framework/fixtures/playwright';
import { loginToAppPlaywright } from '../../../flows/wallet.flow';
import { createClaudeLocatorRecoveryProvider } from '../../../framework/ai-locator/ClaudeLocatorRecoveryProvider';
import { loadScenario, runScenarioInTest } from '../../../framework/scenario';
import { appiumLocatorActions } from '../../../framework/scenario/AppiumLocatorActions';
import { enableHermesAppProfiling } from '../../helpers/appProfiling';
import { swapBindings } from './swapBindings';

const loaded = loadScenario(path.join(__dirname, 'eth-swap-flow.scenario.md'));
const { scenario } = loaded;

test.describe(scenario.tags.join(' '), () => {
  test(
    scenario.title,
    { tag: scenario.team },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      test.skip(
        !scenario.platforms.includes(currentDeviceDetails.platform),
        `Scenario ${scenario.id} runs on ${scenario.platforms.join(', ')} only`,
      );

      await loginToAppPlaywright();
      await enableHermesAppProfiling();

      await runScenarioInTest({
        loaded,
        platform: currentDeviceDetails.platform,
        bindings: swapBindings,
        locatorActions: appiumLocatorActions,
        performanceTracker,
        driver,
        testInfo,
        aiProvider: createClaudeLocatorRecoveryProvider(),
      });
    },
  );
});
