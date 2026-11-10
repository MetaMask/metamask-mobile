/* eslint-disable import-x/no-nodejs-modules -- reads the scenario next to this spec */
import fs from 'fs';
import path from 'path';
import { test } from '../../../framework/fixtures/playwright';
import { loginToAppPlaywright } from '../../../flows/wallet.flow';
import { parseScenario } from '../../../framework/scenario-agent/scenario';
import { ScenarioAgent } from '../../../framework/scenario-agent/ScenarioAgent';
import { WalletViewSelectorsIDs } from '../../../../app/components/Views/Wallet/WalletView.testIds';
import { QuoteViewSelectorIDs } from '../../../selectors/Bridge/QuoteView.selectors';
import { enableHermesAppProfiling } from '../../helpers/appProfiling';

const SCENARIO_PATH = path.join(__dirname, 'eth-swap-flow.scenario.md');
const scenario = parseScenario(fs.readFileSync(SCENARIO_PATH, 'utf8'));

const HINTS = [
  ...Object.values(WalletViewSelectorsIDs),
  ...Object.values(QuoteViewSelectorIDs),
  // In-app amount keypad keys (QuoteView.getKeypadKey on Android).
  ...[...'0123456789'].map((digit) => `keypad-key-${digit}`),
  'keypad-key-dot',
].filter((value): value is string => typeof value === 'string');

test.describe(scenario.tags.join(' '), () => {
  test(
    scenario.title,
    { tag: scenario.team },
    async ({ currentDeviceDetails, performanceTracker }, testInfo) => {
      test.skip(
        !scenario.platforms.includes(currentDeviceDetails.platform),
        `Runs on ${scenario.platforms.join(', ')} only`,
      );

      const result = await new ScenarioAgent({
        scenario,
        platform: currentDeviceDetails.platform,
        cachePath: SCENARIO_PATH.replace(/\.md$/, '.cache.json'),
        tracker: performanceTracker,
        hints: HINTS,
        runSecretStep: async (text) => {
          if (!/log ?in|unlock/i.test(text)) {
            throw new Error(`No code path for secret step "${text}"`);
          }
          await loginToAppPlaywright();
          await enableHermesAppProfiling();
        },
      }).run();

      await testInfo.attach('scenario-agent-run', {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      });
      if (result.status !== 'PASS') {
        throw new Error(
          `Scenario ${result.status}: ${JSON.stringify(
            result.timers.filter((t) => !t.valid),
          )} ${result.steps.find((s) => s.error)?.error ?? ''}`,
        );
      }
    },
  );
});
