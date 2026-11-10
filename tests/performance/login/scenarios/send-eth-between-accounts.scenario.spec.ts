/* eslint-disable import-x/no-nodejs-modules -- resolves the scenario next to this spec */
import path from 'path';
import { WalletViewSelectorsIDs } from '../../../../app/components/Views/Wallet/WalletView.testIds';
import { RedesignedSendViewSelectorsIDs } from '../../../../app/components/Views/confirmations/components/send/RedesignedSendView.testIds';
import { SendActionViewSelectorsIDs } from '../../../selectors/SendFlow/SendActionView.selectors';
import { KEYPAD_HINTS, scenarioTest } from './scenarioTest';

scenarioTest(path.join(__dirname, 'send-eth-between-accounts.scenario.md'), [
  ...Object.values(WalletViewSelectorsIDs),
  ...Object.values(RedesignedSendViewSelectorsIDs),
  ...Object.values(SendActionViewSelectorsIDs),
  'asset-ETH',
  ...KEYPAD_HINTS,
]);
