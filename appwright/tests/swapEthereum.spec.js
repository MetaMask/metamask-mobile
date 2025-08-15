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
import WalletActionModal from '../../wdio/screen-objects/Modals/WalletActionModal.js';
import SwapScreen from '../../wdio/screen-objects/SwapScreen.js';
import TabBarModal from '../../wdio/screen-objects/Modals/TabBarModal.js';
const SEEDLESS_ONBOARDING_ENABLED =
  process.env.SEEDLESS_ONBOARDING_ENABLED === 'true';

test('Swap flow - Etherem <> Solana', async ({ device }, testInfo) => {
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
  WalletActionModal.device = device;
  SwapScreen.device = device;
  TabBarModal.device = device;

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

  // Not sure if this is a bug, but the solana sheet does not appear on builds based off
  // current main.

  // await SolanaFeatureSheet.isVisible();
  // await SolanaFeatureSheet.tapNotNowButton();
  const swapLoadTimer = new TimerHelper(
    'Time since the user clicks on the "Swap" button until the swap page is loaded',
  );
  swapLoadTimer.start();
  // await TabBarModal.tapActionButton();
  await WalletActionModal.tapSwapButton();
  swapLoadTimer.stop();
  const swapTimer = new TimerHelper(
    'Time since the user enters the amount until the quote is displayed',
  );
  await SwapScreen.selectNetworkAndTokenTo('Ethereum', 'SOL Wormhole');
  await SwapScreen.enterSourceTokenAmount('1');
  await SwapScreen.tapGetQuotes('Ethereum');
  swapTimer.start();
  await SwapScreen.isQuoteDisplayed('Ethereum');
  swapTimer.stop();
  const performanceTracker = new PerformanceTracker();
  performanceTracker.addTimer(swapLoadTimer);
  performanceTracker.addTimer(swapTimer);
  await performanceTracker.attachToTest(testInfo);
});
