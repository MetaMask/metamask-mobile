/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import { WalletViewSelectorsIDs } from '../../../../app/components/Views/Wallet/WalletView.testIds';
import { scenarioTest } from './scenarioTest';

// Tagged @PerformanceShadow in the scenario file; never picked up by scheduled CI.
scenarioTest(path.join(__dirname, 'rewards-tab-time-to-content.scenario.md'), [
  ...Object.values(WalletViewSelectorsIDs),
  'tab-bar-item-Rewards',
]);
