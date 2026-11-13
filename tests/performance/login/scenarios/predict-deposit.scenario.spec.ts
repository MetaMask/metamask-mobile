/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import { WalletViewSelectorsIDs } from '../../../../app/components/Views/Wallet/WalletView.testIds';
import { KEYPAD_HINTS, scenarioTest } from './scenarioTest';

// Tagged @PerformanceShadow in the scenario file; never picked up by scheduled CI.
scenarioTest(path.join(__dirname, 'predict-deposit.scenario.md'), [
  ...Object.values(WalletViewSelectorsIDs),
  'homepage-section-title-predictions',
  'predict-home-container',
  'predict-portfolio-action-add-funds',
  'custom-amount-input',
  'custom-amount-input-value',
  ...KEYPAD_HINTS,
]);
