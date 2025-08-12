import { test, expect } from 'appwright';

import TimerHelper from '../utils/TimersHelper.js';
import { PerformanceTracker } from '../reporters/PerformanceTracker.js';
import WelcomeScreen from '../../wdio/screen-objects/Onboarding/OnboardingCarousel.js';
import TermOfUseScreen from '../../wdio/screen-objects/Modals/TermOfUseScreen.js';
import OnboardingScreen from '../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import CreateNewWalletScreen from '../../wdio/screen-objects/Onboarding/CreateNewWalletScreen.js';
import MetaMetricsScreen from '../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../wdio/screen-objects/OnboardingSucessScreen.js';
import OnboardingSheet from '../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import SolanaFeatureSheet from '../../wdio/screen-objects/Modals/SolanaFeatureSheet.js';
import WalletAccountModal from '../../wdio/screen-objects/Modals/WalletAccountModal.js';
import SkipAccountSecurityModal from '../../wdio/screen-objects/Modals/SkipAccountSecurityModal.js';
import ImportFromSeedScreen from '../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
import CreatePasswordScreen from '../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import WalletMainScreen from '../../wdio/screen-objects/WalletMainScreen.js';
import AccountListComponent from '../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../wdio/screen-objects/Modals/AddAccountModal.js';
import CommonScreen from '../../wdio/screen-objects/CommonScreen.js';
import TokenOverviewScreen from '../../wdio/screen-objects/TokenOverviewScreen.js';
const SEEDLESS_ONBOARDING_ENABLED = process.env.SEEDLESS_ONBOARDING_ENABLED === 'true';

test('Asset View', async ({ device }, testInfo) => {
  WelcomeScreen.device = device;
  TermOfUseScreen.device = device;
  OnboardingScreen.device = device;
  CreateNewWalletScreen.device = device;
  MetaMetricsScreen.device = device;
  OnboardingSucessScreen.device = device;
  OnboardingSheet.device = device;
  SolanaFeatureSheet.device = device;
  WalletAccountModal.device = device;
  SkipAccountSecurityModal.device = device;
  ImportFromSeedScreen.device = device;
  CreatePasswordScreen.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  TokenOverviewScreen.device = device;
  CommonScreen.device = device;

  device.webDriverClient.capabilities["appium:settings[snapshotMaxDepth]"] = 80;

  await WelcomeScreen.clickGetStartedButton();

  await TermOfUseScreen.isDisplayed();
  await TermOfUseScreen.tapAgreeCheckBox();
  await TermOfUseScreen.tapScrollEndButton();
  await TermOfUseScreen.tapAcceptButton();

  await OnboardingScreen.isScreenTitleVisible();
  await OnboardingScreen.tapHaveAnExistingWallet();
  if (SEEDLESS_ONBOARDING_ENABLED) {
    await OnboardingSheet.tapImportSeedButton();
  }
  await ImportFromSeedScreen.isScreenTitleVisible();
  await ImportFromSeedScreen.typeSecretRecoveryPhrase(
    process.env.TEST_SRP_1,
    true,
  );
  await ImportFromSeedScreen.tapImportScreenTitleToDismissKeyboard();
  await ImportFromSeedScreen.tapContinueButton();

  await CreatePasswordScreen.enterPassword('123456789');
  await CreatePasswordScreen.reEnterPassword('123456789');
  await CreatePasswordScreen.tapIUnderstandCheckBox();
  await CreatePasswordScreen.tapCreatePasswordButton();
  await MetaMetricsScreen.isScreenTitleVisible();
  await MetaMetricsScreen.tapIAgreeButton();

  await OnboardingSucessScreen.tapDone();
  await SolanaFeatureSheet.isVisible();
  await SolanaFeatureSheet.tapNotNowButton();
  await WalletMainScreen.isMainWalletViewVisible();

  const assetViewScreen = new TimerHelper(
    'Time since the user clicks on the asset view button until the user sees the token overview screen',
  );
  assetViewScreen.start();
  await WalletMainScreen.tapOnToken('Ethereum');
  await TokenOverviewScreen.isTokenOverviewVisible();
  assetViewScreen.stop();

  const performanceTracker = new PerformanceTracker();
  performanceTracker.addTimer(assetViewScreen);
  await performanceTracker.attachToTest(testInfo);
});
