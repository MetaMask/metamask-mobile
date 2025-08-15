import { test } from 'appwright';

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
import SendScreen from '../../wdio/screen-objects/SendScreen.js';
import ConfirmationScreen from '../../wdio/screen-objects/ConfirmationScreen.js';
import AmountScreen from '../../wdio/screen-objects/AmountScreen.js';
import NetworkEducationModal from '../../wdio/screen-objects/Modals/NetworkEducationModal.js';
import SendSolanaScreen from '../../wdio/screen-objects/SendSolanaScreen.js';
import SolanaConfirmationScreen from '../../wdio/screen-objects/SolanaConfirmationScreen.js';

const SEEDLESS_ONBOARDING_ENABLED = process.env.SEEDLESS_ONBOARDING_ENABLED === 'true';

test('Send flow - Solana', async ({ device }, testInfo) => {
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
    SendScreen.device = device;
    ConfirmationScreen.device = device;
    AmountScreen.device = device;
    NetworkEducationModal.device = device;
    SendSolanaScreen.device = device;
    SolanaConfirmationScreen.device = device;
    console.log("testInfo", testInfo.project.use.device);
  
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

    await WalletMainScreen.tapIdenticon();
    await AccountListComponent.tapOnAccountByName('Solana Account 1');
    await NetworkEducationModal.tapGotItButton();
    const sendSolanaScreenTimer = new TimerHelper(
        'Time since the user clicks on Send button and sees the send solana screen',
      );
    sendSolanaScreenTimer.start();
    await WalletActionModal.tapSendButton();
    await SendSolanaScreen.isAddressFieldVisible();
    sendSolanaScreenTimer.stop();

    await SendSolanaScreen.fillAddressField('3xTPAZxmpwd8GrNEKApaTw6VH4jqJ31WFXUvQzgwhR7c');
    await SendSolanaScreen.fillAmountField('0.001');

    const sendAmountScreen = new TimerHelper(
        'Time since the user is on the send amount screen until the user gets the confirmation screen',
      );
    sendAmountScreen.start();

    await SendSolanaScreen.tapContinueButton();
    await SolanaConfirmationScreen.isConfirmButtonDisplayed();

    sendAmountScreen.stop();
  
    const performanceTracker = new PerformanceTracker();
    performanceTracker.addTimer(sendSolanaScreenTimer);
    performanceTracker.addTimer(sendAmountScreen);
    await performanceTracker.attachToTest(testInfo);
  });