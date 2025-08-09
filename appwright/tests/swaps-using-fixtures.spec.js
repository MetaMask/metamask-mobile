import { test, expect } from 'appwright';

import { PerformanceTracker } from '../reporters/PerformanceTracker.js';

import FixtureBuilder from '../../e2e/framework/fixtures/FixtureBuilder.js';

import LoginScreen from '../../wdio/screen-objects/LoginScreen.js';
import TimerHelper from '../utils/TimersHelper.js';
import WalletMainScreen from '../../wdio/screen-objects/WalletMainScreen.js';
import AppLaunchHelper from '../utils/AppLaunchHelper.js';

import { withFixtures } from '../../e2e/framework/fixtures/FixtureHelper.js';

import AccountListComponent from '../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../wdio/screen-objects/Modals/AddAccountModal.js';
import WalletActionModal from '../../wdio/screen-objects/Modals/WalletActionModal.js';
import SwapScreen from '../../wdio/screen-objects/SwapScreen.js';
import TabBarModal from '../../wdio/screen-objects/Modals/TabBarModal.js';
test('Swap flow - Etherem with Fixtures ', async ({
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
      // Initialize the app launch helper
      const appLauncher = new AppLaunchHelper();
      appLauncher.setDevice(device);

      // Launch the app with auto-detected environment and platform
      await appLauncher.launchAppAuto();

      const getStartedScreenTimer = new TimerHelper('loginTimer');
      getStartedScreenTimer.start();

      // const commonScreen = new CommonScreen(device);
      await LoginScreen.typePassword('123123123');
      await LoginScreen.tapUnlockButton();

      await WalletMainScreen.isMainWalletViewVisible();
      // await WalletMainScreen.tapIdenticon();
      await TabBarModal.tapActionButton();
      getStartedScreenTimer.stop();
      const swapLoadTimer = new TimerHelper(
        'Time since the user clicks on the "Swap" button until the swap page is loaded',
      );
      swapLoadTimer.start();
      await WalletActionModal.tapSwapButton();
      swapLoadTimer.stop();
      const swapTimer = new TimerHelper(
        'Time since the user enters the amount until the quote is displayed',
      );
      await SwapScreen.enterSourceTokenAmount('1');
      swapTimer.start();
      await SwapScreen.isQuoteDisplayed();
      swapTimer.stop();
      const performanceTracker = new PerformanceTracker();
      performanceTracker.addTimer(swapLoadTimer);
      performanceTracker.addTimer(swapTimer);
      await performanceTracker.attachToTest(testInfo);
    },
  );
});

test('Swap flow - Etherem - Solana with Fixtures ', async ({
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
      // Initialize the app launch helper
      const appLauncher = new AppLaunchHelper();
      appLauncher.setDevice(device);

      // Launch the app with auto-detected environment and platform
      // await appLauncher.launchAppAuto();

          // await device.activateApp('io.metamask.MetaMask-QA'); // ios CI

          await device.activateApp('io.metamask.MetaMask-QA'); // ios Local

          // await device.activateApp('io.metamask'); // android CI
          // await device.activateApp('io.metamask.MetaMask'); // android Local


      const getStartedScreenTimer = new TimerHelper('loginTimer');
      getStartedScreenTimer.start();

      // const commonScreen = new CommonScreen(device);
      await LoginScreen.typePassword('123123123');
      await LoginScreen.tapUnlockButton();

      await WalletMainScreen.isMainWalletViewVisible();
      // await WalletMainScreen.tapIdenticon();
      await TabBarModal.tapActionButton();
      const swapLoadTimer = new TimerHelper(
        'Time since the user clicks on the "Swap" button until the swap page is loaded',
      );
      swapLoadTimer.start();
      await WalletActionModal.tapSwapButton();
      swapLoadTimer.stop();
      const swapTimer = new TimerHelper(
        'Time since the user enters the amount until the quote is displayed',
      );
      await SwapScreen.selectNetworkAndTokenTo('Solana', 'SOL');
      await SwapScreen.enterSourceTokenAmount('1');
      swapTimer.start();
      await SwapScreen.isQuoteDisplayed();
      swapTimer.stop();
      const performanceTracker = new PerformanceTracker();
      performanceTracker.addTimer(swapLoadTimer);
      performanceTracker.addTimer(swapTimer);
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
