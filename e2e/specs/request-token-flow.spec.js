'use strict';
import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ProtectYourWalletView from '../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../pages/Onboarding/CreatePasswordView';

import SendLinkView from '../pages/SendLinkView';
import RequestPaymentView from '../pages/RequestPaymentView';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import DrawerView from '../pages/Drawer/DrawerView';
import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';

import SkipAccountSecurityModal from '../pages/modals/SkipAccountSecurityModal';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import ProtectYourWalletModal from '../pages/modals/ProtectYourWalletModal';
import RequestPaymentModal from '../pages/modals/RequestPaymentModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';

import TestHelpers from '../helpers';
const SAI_CONTRACT_ADDRESS = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';
const PASSWORD = '12345678';

describe('Request Token Flow', () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should create new wallet', async () => {
    await OnboardingCarouselView.isVisible();
    await OnboardingCarouselView.tapOnGetStartedButton();

    await OnboardingView.isVisible();
    await OnboardingView.tapCreateWallet();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapAgreeButton();

    await CreatePasswordView.isVisible();
    await CreatePasswordView.enterPassword(PASSWORD);
    await CreatePasswordView.reEnterPassword(PASSWORD);
    await CreatePasswordView.tapIUnderstandCheckBox();
    await CreatePasswordView.tapCreatePasswordButton();
  });

  it('Should skip backup check', async () => {
    // Check that we are on the Secure your wallet screen
    await ProtectYourWalletView.isVisible();
    await ProtectYourWalletView.tapOnRemindMeLaterButton();

    await SkipAccountSecurityModal.tapIUnderstandCheckBox();
    await SkipAccountSecurityModal.tapSkipButton();
    await WalletView.isVisible();
  });

  it('Should dismiss Automatic Security checks screen', async () => {
    await TestHelpers.delay(3500);
    await EnableAutomaticSecurityChecksView.isVisible();
    await EnableAutomaticSecurityChecksView.tapNoThanks();
  });

  it('should tap on the close button in the whats new modal', async () => {
    // dealing with flakiness on bitrise.
    await TestHelpers.delay(2500);
    try {
      await WhatsNewModal.isVisible();
      await WhatsNewModal.tapCloseButton();
    } catch {
      //
    }
  });

  it('should dismiss the onboarding wizard', async () => {
    // dealing with flakiness on bitrise.
    await TestHelpers.delay(1000);
    try {
      await OnboardingWizardModal.isVisible();
      await OnboardingWizardModal.tapNoThanksButton();
      await OnboardingWizardModal.isNotVisible();
    } catch {
      //
    }
  });

  it('should dismiss the protect your wallet modal', async () => {
    await ProtectYourWalletModal.isCollapsedBackUpYourWalletModalVisible();
    await TestHelpers.delay(1000);

    await ProtectYourWalletModal.tapRemindMeLaterButton();

    await SkipAccountSecurityModal.tapIUnderstandCheckBox();
    await SkipAccountSecurityModal.tapSkipButton();

    await WalletView.isVisible();
  });

  it('should go to send view', async () => {
    await WalletView.tapDrawerButton();

    await DrawerView.isVisible();
    await DrawerView.tapOnAddFundsButton();
    // Check that we see  the receive modal
    await RequestPaymentModal.isVisible();
  });

  it('should go to the request view', async () => {
    await RequestPaymentModal.tapRequestPaymentButton();
    await RequestPaymentView.tapETH();

    await RequestPaymentView.isRequestTitleVisible();

    await RequestPaymentView.tapBackButton();

    await RequestPaymentView.isVisible();
  });

  it('should request DAI', async () => {
    // Search by SAI contract address
    await RequestPaymentView.searchForToken(SAI_CONTRACT_ADDRESS);
    await RequestPaymentView.isTokenVisibleInSearchResults('SAI');

    await RequestPaymentView.searchForToken('DAI');
    await RequestPaymentView.tapOnToken('DAI');
    await RequestPaymentView.typeInTokenAmount(5.5);

    await SendLinkView.isVisible();
    // Tap on QR Code Button
    await SendLinkView.tapQRCodeButton();
    // Check that the QR code is visible
    await SendLinkView.isQRModalVisible();
    // Close QR Code
    await SendLinkView.tapQRCodeCloseButton();
    // Close view
    await SendLinkView.tapCloseSendLinkButton();
    // Ensure protect your wallet modal is visible
    await ProtectYourWalletModal.isVisible();
  });
});
