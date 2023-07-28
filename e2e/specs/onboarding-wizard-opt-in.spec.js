'use strict';
import TestHelpers from '../helpers';
import { Regression } from '../tags';

import ProtectYourWalletView from '../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../pages/Onboarding/CreatePasswordView';
import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';

import SettingsView from '../pages/Drawer/Settings/SettingsView';
import SecurityAndPrivacy from '../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';

import LoginView from '../pages/LoginView';

import SkipAccountSecurityModal from '../pages/modals/SkipAccountSecurityModal';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import ProtectYourWalletModal from '../pages/modals/ProtectYourWalletModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';
import { acceptTermOfUse } from '../viewHelper';
import TabBarComponent from '../pages/TabBarComponent';

const PASSWORD = '12345678';

describe(
  Regression('Onboarding wizard opt-in, metametrics opt out from settings'),
  () => {
    it('should be able to opt-in of the onboarding-wizard', async () => {
      await OnboardingCarouselView.tapOnGetStartedButton();
      await OnboardingView.tapCreateWallet();

      await MetaMetricsOptIn.isVisible();
      await MetaMetricsOptIn.tapAgreeButton();
      await acceptTermOfUse();

      await CreatePasswordView.isVisible();
    });
    it('should be able to create a new wallet', async () => {
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

    it('should tap on "Got it" Button in the whats new modal', async () => {
      // dealing with flakiness on bitrise.
      await TestHelpers.delay(2500);
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

    it('should check that metametrics is enabled in settings', async () => {
      await TabBarComponent.tapSettings();

      await SettingsView.tapSecurityAndPrivacy();
      await SecurityAndPrivacy.scrollToMetaMetrics();
      TestHelpers.delay(2000);
      await SecurityAndPrivacy.isMetaMetricsToggleOn();

      TestHelpers.delay(4500);
    });

    it('should disable metametrics', async () => {
      await SecurityAndPrivacy.tapMetaMetricsToggle();
      // await SecurityAndPrivacy.isMetaMetricsToggleOff();

      TestHelpers.delay(1500);
      await SecurityAndPrivacy.tapOKAlertButton();
      await SecurityAndPrivacy.isMetaMetricsToggleOff();
    });

    it('should relaunch the app and log in', async () => {
      // Relaunch app
      await TestHelpers.relaunchApp();
      TestHelpers.delay(4500);

      await LoginView.isVisible();
      await LoginView.enterPassword(PASSWORD);

      await WalletView.isVisible();
    });

    it('should dismiss the onboarding wizard after logging in', async () => {
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

    it('should verify metametrics is turned off', async () => {
      await TabBarComponent.tapSettings();
      await SettingsView.tapSecurityAndPrivacy();

      await SecurityAndPrivacy.scrollToMetaMetrics();
      await SecurityAndPrivacy.isMetaMetricsToggleOff();
    });
  },
);
