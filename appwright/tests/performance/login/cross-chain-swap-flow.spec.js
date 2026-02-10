import { test } from '../../../fixtures/performance-test.js';

import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import TimerHelper from '../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';

import AccountListComponent from '../../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../../wdio/screen-objects/Modals/AddAccountModal.js';
import WalletActionModal from '../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import NetworkEducationModal from '../../../../wdio/screen-objects/Modals/NetworkEducationModal.js';
import NetworksScreen from '../../../../wdio/screen-objects/NetworksScreen.js';
import BridgeScreen from '../../../../wdio/screen-objects/BridgeScreen.js';
import { login } from '../../../utils/Flows.js';
import { PerformanceLogin, PerformanceSwaps } from '../../../tags.js';

/* Scenario 7: Cross-chain swap flow - ETH to SOL - 50+ accounts, SRP 1 + SRP 2 + SRP 3 */
test.describe(`${PerformanceLogin} ${PerformanceSwaps}`, () => {
  test(
    'Cross-chain swap flow - ETH to SOL - 50+ accounts, SRP 1 + SRP 2 + SRP 3',
    { tag: '@swap-bridge-dev-team' },
    async ({ device, performanceTracker }, testInfo) => {
      LoginScreen.device = device;
      WalletMainScreen.device = device;
      AccountListComponent.device = device;
      AddAccountModal.device = device;
      WalletActionModal.device = device;
      TabBarModal.device = device;
      WalletMainScreen.device = device;
      AccountListComponent.device = device;
      AddAccountModal.device = device;
      NetworkEducationModal.device = device;
      NetworksScreen.device = device;
      BridgeScreen.device = device;
      await login(device);

      const timer1 = new TimerHelper(
        'Time since the user clicks on the "Swap" button until the swap page is loaded',
        { ios: 1100, android: 2200 },
        device,
      );

      await WalletMainScreen.tapSwapButton();
      await timer1.measure(() => BridgeScreen.isVisible());

      await BridgeScreen.selectNetworkAndTokenTo('Solana', 'SOL');
      await BridgeScreen.enterSourceTokenAmount('1');

      const timer2 = new TimerHelper(
        'Time since the user enters the amount until the quote is displayed',
        { ios: 9000, android: 7000 },
        device,
      );

      await timer2.measure(() => BridgeScreen.isQuoteDisplayed());

      performanceTracker.addTimers(timer1, timer2);
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
