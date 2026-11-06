/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario YAML next to this spec */
import path from 'path';
import { test } from '../../../framework/fixtures/playwright';
import { loginToAppPlaywright } from '../../../flows/wallet.flow';
import {
  aiVisualTest,
  createTestConfig,
  type VisualTestConfig,
} from '../../../framework/ai-visual';
import { createClaudeLocatorRecoveryProvider } from '../../../framework/ai-locator/ClaudeLocatorRecoveryProvider';
import { loadScenario, runScenarioInTest } from '../../../framework/scenario';
import { appiumLocatorActions } from '../../../framework/scenario/AppiumLocatorActions';
import { enableHermesAppProfiling } from '../../helpers/appProfiling';
import { swapBindings } from './swapBindings';

const loaded = loadScenario(
  path.join(__dirname, 'eth-swap-flow.scenario.yaml'),
);
const { scenario } = loaded;

const VISUAL_CONFIGS: Record<
  string,
  (overrides: Partial<VisualTestConfig>) => VisualTestConfig
> = {
  swapReview: createTestConfig.swapReview,
};

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
      if (scenario.profiling === 'hermes') {
        await enableHermesAppProfiling();
      }

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

      for (const check of scenario.visual) {
        const config = VISUAL_CONFIGS[check.config];
        if (!config) {
          throw new Error(`Unknown visual config "${check.config}"`);
        }
        await aiVisualTest(
          driver,
          check.baseline,
          currentDeviceDetails.platform,
          config(check.options as Partial<VisualTestConfig>),
          testInfo,
        );
      }
    },
  );
});
