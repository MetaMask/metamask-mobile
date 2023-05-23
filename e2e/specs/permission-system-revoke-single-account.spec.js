'use strict';
import TestHelpers from '../helpers';
import { Regression } from '../tags';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ProtectYourWalletView from '../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../pages/Onboarding/CreatePasswordView';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import Browser from '../pages/Drawer/Browser';
import { BROWSER_SCREEN_ID } from '../../wdio/screen-objects/testIDs/BrowserScreen/BrowserScreen.testIds';

import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';
import TabBarComponent from '../pages/TabBarComponent';

import NetworkListModal from '../pages/modals/NetworkListModal';
import ConnectedAccountsModal from '../pages/modals/ConnectedAccountsModal';
import ConnectModal from '../pages/modals/ConnectModal';
import SkipAccountSecurityModal from '../pages/modals/SkipAccountSecurityModal';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import ProtectYourWalletModal from '../pages/modals/ProtectYourWalletModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';
import {
  acceptTermOfUse,
  testDappConnectButtonCooridinates,
} from '../viewHelper';

const TEST_DAPP = 'https://metamask.github.io/test-dapp/';
const PASSWORD = '12345678';

describe(Regression('Revoke Single Account after connecting to a dapp'), () => {
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
    await acceptTermOfUse();

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

  it('should tap on the close button to dismiss the whats new modal', async () => {
    // dealing with flakiness on bitrise.
    await TestHelpers.delay(2000);
    try {
      await WhatsNewModal.isVisible();
      await WhatsNewModal.tapCloseButton();
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

  it('should navigate to browser', async () => {
    await TabBarComponent.tapBrowser();
    // Check that we are on the browser screen
    await Browser.isVisible();
  });

  it('should connect to the test dapp', async () => {
    await TestHelpers.delay(3000);
    // Tap on search in bottom navbar
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(TEST_DAPP);
    await TestHelpers.delay(3000);
    await TestHelpers.tapAtPoint(
      BROWSER_SCREEN_ID,
      testDappConnectButtonCooridinates,
    );
    await ConnectModal.isVisible();
    await ConnectModal.tapConnectButton();
    await Browser.isAccountToastVisible('Account 1');
  });

  it('should revoke accounts', async () => {
    await Browser.tapNetworkAvatarButtonOnBrowser();
    await ConnectedAccountsModal.tapPermissionsButton();
    await ConnectedAccountsModal.tapRevokeButton();
    await Browser.isAccountToastVisible('Account 1');

    await TestHelpers.delay(3500);
  });

  it('should no longer be connected to the  dapp', async () => {
    await Browser.tapNetworkAvatarButtonOnBrowser();
    await ConnectedAccountsModal.isNotVisible();
    await NetworkListModal.isVisible();
  });
});
