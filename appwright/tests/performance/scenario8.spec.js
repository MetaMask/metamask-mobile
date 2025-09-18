import { test } from '../../fixtures/performance-test.js';

import TimerHelper from '../../utils/TimersHelper.js';
import WelcomeScreen from '../../../wdio/screen-objects/Onboarding/OnboardingCarousel.js';
import TermOfUseScreen from '../../../wdio/screen-objects/Modals/TermOfUseScreen.js';
import OnboardingScreen from '../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import CreateNewWalletScreen from '../../../wdio/screen-objects/Onboarding/CreateNewWalletScreen.js';
import MetaMetricsScreen from '../../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../../wdio/screen-objects/OnboardingSucessScreen.js';
import OnboardingSheet from '../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import WalletAccountModal from '../../../wdio/screen-objects/Modals/WalletAccountModal.js';
import SkipAccountSecurityModal from '../../../wdio/screen-objects/Modals/SkipAccountSecurityModal.js';
import ImportFromSeedScreen from '../../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
import CreatePasswordScreen from '../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../wdio/screen-objects/Modals/AddAccountModal.js';
import TokenOverviewScreen from '../../../wdio/screen-objects/TokenOverviewScreen.js';
import CommonScreen from '../../../wdio/screen-objects/CommonScreen.js';
import WalletActionModal from '../../../wdio/screen-objects/Modals/WalletActionModal.js';
import NetworksScreen from '../../../wdio/screen-objects/NetworksScreen.js';
import LoginScreen from '../../../wdio/screen-objects/LoginScreen.js';
import { login } from '../../utils/Flows.js';

test('Asset View, SRP 1 + SRP 2 + SRP 3', async ({
  device,
  performanceTracker,
}, testInfo) => {
  WelcomeScreen.device = device;
  TermOfUseScreen.device = device;
  OnboardingScreen.device = device;
  CreateNewWalletScreen.device = device;
  MetaMetricsScreen.device = device;
  OnboardingSucessScreen.device = device;
  OnboardingSheet.device = device;
  WalletAccountModal.device = device;
  SkipAccountSecurityModal.device = device;
  ImportFromSeedScreen.device = device;
  CreatePasswordScreen.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  TokenOverviewScreen.device = device;
  CommonScreen.device = device;
  WalletActionModal.device = device;
  NetworksScreen.device = device;

  LoginScreen.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;

  TokenOverviewScreen.device = device;
  CommonScreen.device = device;
  WalletActionModal.device = device;

  await login(device, 'login');

  // await importSRPFlow(device, process.env.TEST_SRP_2);
  // await importSRPFlow(device, process.env.TEST_SRP_3);

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
