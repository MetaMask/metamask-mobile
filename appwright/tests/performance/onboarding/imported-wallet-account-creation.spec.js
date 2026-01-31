import { test } from '../../../fixtures/performance-test.js';

import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import TimerHelper from '../../../utils/TimersHelper.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';

import AccountListComponent from '../../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../../wdio/screen-objects/Modals/AddAccountModal.js';
import WalletActionModal from '../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import { onboardingFlowImportSRP } from '../../../utils/Flows.js';
import AddNewHdAccountComponent from '../../../../wdio/screen-objects/Modals/AddNewHdAccountComponent.js';
import {
  PerformanceOnboarding,
  PerformanceAccountList,
} from '../../../tags.js';

/* Scenario 1: Imported wallet with 50+ accounts + account creation */
test.describe(`${PerformanceOnboarding} ${PerformanceAccountList}`, () => {
  test.skip(
    'Account creation with 50+ accounts, SRP 1 + SRP 2 + SRP 3',
    { tag: '@metamask-onboarding-team' },
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
      AddNewHdAccountComponent.device = device;
      await onboardingFlowImportSRP(device, process.env.TEST_SRP_2);

      // await importSRPFlow(device, process.env.TEST_SRP_2);
      // await importSRPFlow(device, process.env.TEST_SRP_3);

      const screen1Timer = new TimerHelper(
        'Time since the user clicks on "Account list" button until the account list is visible',
      );

      const screen3Timer = new TimerHelper(
        'Time since the user clicks on new account created until the Token list is visible',
      );

      await WalletMainScreen.tapIdenticon();
      await screen1Timer.measure(() =>
        AccountListComponent.isComponentDisplayed(),
      );

      await AccountListComponent.tapCreateAccountButton();
      await screen3Timer.measure(async () => {
        await WalletMainScreen.isTokenVisible('SOL');
      });

      performanceTracker.addTimers(screen1Timer, screen3Timer);
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
