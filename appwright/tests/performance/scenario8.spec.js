import { test } from '../../fixtures/performance-test.js';

import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../wdio/screen-objects/Modals/AddAccountModal.js';
import TokenOverviewScreen from '../../../wdio/screen-objects/TokenOverviewScreen.js';
import CommonScreen from '../../../wdio/screen-objects/CommonScreen.js';
import WalletActionModal from '../../../wdio/screen-objects/Modals/WalletActionModal.js';
import { importSRPFlow } from '../../utils/Flows.js';

import { PerformanceTracker } from '../../reporters/PerformanceTracker.js';

import LoginScreen from '../../../wdio/screen-objects/LoginScreen.js';
import TimerHelper from '../../utils/TimersHelper.js';

test('Asset View, SRP 1 + SRP 2 + SRP 3', async ({ device }, testInfo) => {
  LoginScreen.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;

  TokenOverviewScreen.device = device;
  CommonScreen.device = device;
  WalletActionModal.device = device;

  await LoginScreen.typePassword('123123123');
  await LoginScreen.tapUnlockButton();
  // await importSRPFlow(device, process.env.TEST_SRP_2);
  await WalletMainScreen.isMainWalletViewVisible();
  await WalletMainScreen.tapNetworkNavBar();
  await NetworksScreen.selectNetwork('Ethereum Mainnet');

  const assetViewScreen = new TimerHelper(
    'Time since the user clicks on the asset view button until the user sees the token overview screen',
  );
  assetViewScreen.start();
  await WalletMainScreen.tapOnToken('Ethereum');
  await TokenOverviewScreen.isTokenOverviewVisible();
  await TokenOverviewScreen.isTodaysChangeVisible();
  assetViewScreen.stop();

  performanceTracker.addTimer(assetViewScreen);

  await performanceTracker.attachToTest(testInfo);
});
