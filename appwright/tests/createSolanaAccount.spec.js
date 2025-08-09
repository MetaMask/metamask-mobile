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
import AddAccountModal from '../../wdio/screen-objects/Modals/AddAccountModal.js';
import AccountListComponent from '../../wdio/screen-objects/AccountListComponent.js';
import WalletMainScreen from '../../wdio/screen-objects/WalletMainScreen.js';
import NetworkEducationModal from '../../wdio/screen-objects/Modals/NetworkEducationModal.js';
import AddNewHdAccountComponent from '../../wdio/screen-objects/Modals/AddNewHdAccountComponent.js';
const SEEDLESS_ONBOARDING_ENABLED = process.env.SEEDLESS_ONBOARDING_ENABLED === 'true';

test('User creates a new Solana account after onboarding', async ({
  device,
}, testInfo) => {
  const screen1Timer = new TimerHelper(
    'Time until the user clicks on the "Get Started" button',
  );
  screen1Timer.start();
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
  NetworkEducationModal.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  AddNewHdAccountComponent.device = device;
  //await WelcomeScreen.waitForScreenToDisplay();
  await WelcomeScreen.clickGetStartedButton();

  await TermOfUseScreen.isDisplayed();
  await TermOfUseScreen.tapAgreeCheckBox();
  await TermOfUseScreen.tapScrollEndButton();
  await TermOfUseScreen.tapAcceptButton();

  await OnboardingScreen.isScreenTitleVisible();
  await OnboardingScreen.tapCreateNewWalletButton();
  if (SEEDLESS_ONBOARDING_ENABLED) {
    await OnboardingSheet.tapImportSeedButton();
  }
  await CreateNewWalletScreen.isNewAccountScreenFieldsVisible();

  await CreateNewWalletScreen.inputPasswordInFirstField('123456789');
  await CreateNewWalletScreen.inputConfirmPasswordField('123456789');
  await CreateNewWalletScreen.tapSubmitButton();
  await CreateNewWalletScreen.tapRemindMeLater();
  await SkipAccountSecurityModal.proceedWithoutWalletSecure();
  
  await MetaMetricsScreen.isScreenTitleVisible();
  await MetaMetricsScreen.tapIAgreeButton();

  await OnboardingSucessScreen.tapDone();
  
  await SolanaFeatureSheet.isVisible();
  await SolanaFeatureSheet.tapNotNowButton();
  await WalletMainScreen.isMainWalletViewVisible();
  await WalletMainScreen.tapIdenticon();
  await AccountListComponent.tapAddAccountButton();
  await AddAccountModal.tapCreateSolanaAccountButton();
  const solanaAccountTimer = new TimerHelper('Time since the moment the user clicks on Create Solana account until account is created');
  solanaAccountTimer.start();
  await AddNewHdAccountComponent.tapConfirm();
  await NetworkEducationModal.tapGotItButton();
  await WalletMainScreen.isMainWalletViewVisible();
  solanaAccountTimer.stop();
  const performanceTracker = new PerformanceTracker();
  performanceTracker.addTimer(solanaAccountTimer);
  await performanceTracker.attachToTest(testInfo);
});
