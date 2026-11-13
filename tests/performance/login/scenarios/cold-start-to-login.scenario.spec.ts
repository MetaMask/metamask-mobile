/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import { WalletViewSelectorsIDs } from '../../../../app/components/Views/Wallet/WalletView.testIds';
import { scenarioTest } from './scenarioTest';

// Tagged @PerformanceShadow in the scenario file; never picked up by scheduled CI.
// Every step is code (Secret / App / pinned checks): no model calls expected.
scenarioTest(path.join(__dirname, 'cold-start-to-login.scenario.md'), [
  ...Object.values(WalletViewSelectorsIDs),
]);
