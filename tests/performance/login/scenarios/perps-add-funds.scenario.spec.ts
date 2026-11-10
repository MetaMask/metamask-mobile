/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import { WalletViewSelectorsIDs } from '../../../../app/components/Views/Wallet/WalletView.testIds';
import { scenarioTest, KEYPAD_HINTS } from './scenarioTest';

// Tagged @PerformanceShadow in the scenario file; never picked up by scheduled CI.
scenarioTest(path.join(__dirname, 'perps-add-funds.scenario.md'), [
  ...Object.values(WalletViewSelectorsIDs),
  WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('perps'),
  'perps-tutorial-skip-button',
  'custom-amount-input',
  ...KEYPAD_HINTS,
]);
