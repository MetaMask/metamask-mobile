import { test, expect } from 'appwright';

import { PerformanceTracker } from '../../reporters/PerformanceTracker.js';

import FixtureBuilder from '../../../e2e/framework/fixtures/FixtureBuilder.js';

import LoginScreen from '../../../wdio/screen-objects/LoginScreen.js';
import TimerHelper from '../../utils/TimersHelper.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';

import { withFixtures } from '../../../e2e/framework/fixtures/FixtureHelper.js';
import { launchApp, importSRPFlow } from '../../utils/Flows.js';

import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../wdio/screen-objects/Modals/AddAccountModal.js';
import WalletActionModal from '../../../wdio/screen-objects/Modals/WalletActionModal.js';
import SwapScreen from '../../../wdio/screen-objects/SwapScreen.js';
import TabBarModal from '../../../wdio/screen-objects/Modals/TabBarModal.js';
test('Import SRP with +50 accounts, SRP 1, SRP 2, SRP 3', async ({
  device,
}, testInfo) => {
  await withFixtures(
    'appwright', // Specifying the framework as a parameter
    {
      fixture: new FixtureBuilder().build(),
    },
    async () => {
      LoginScreen.device = device;
      WalletMainScreen.device = device;
      AccountListComponent.device = device;
      AddAccountModal.device = device;
      WalletActionModal.device = device;
      SwapScreen.device = device;
      TabBarModal.device = device;

      await launchApp(device);
      await LoginScreen.typePassword('123123123');
      await LoginScreen.tapUnlockButton();

      await WalletMainScreen.isTokenVisible('Ethereum');
      await importSRPFlow(device, process.env.TEST_SRP_2);

      const timers = await importSRPFlow(device, process.env.TEST_SRP_3);
      await WalletMainScreen.isTokenVisible('Ethereum');

      await WalletMainScreen.tapIdenticon();
      const performanceTracker = new PerformanceTracker();
      timers.forEach((timer) => performanceTracker.addTimer(timer));
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
