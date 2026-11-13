/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import { WalletViewSelectorsIDs } from '../../../../app/components/Views/Wallet/WalletView.testIds';
import { QuoteViewSelectorIDs } from '../../../selectors/Bridge/QuoteView.selectors';
import { KEYPAD_HINTS, scenarioTest } from './scenarioTest';

scenarioTest(path.join(__dirname, 'cross-chain-swap-flow.scenario.md'), [
  ...Object.values(WalletViewSelectorsIDs),
  ...Object.values(QuoteViewSelectorIDs),
  ...KEYPAD_HINTS,
]);
