'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import ProtectYourWalletView from '../../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../../pages/Onboarding/CreatePasswordView';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../../pages/Onboarding/OnboardingCarouselView';
import MetaMetricsOptIn from '../../pages/Onboarding/MetaMetricsOptInView';
import OnboardingSuccessView from '../../pages/Onboarding/OnboardingSuccessView';
import WalletView from '../../pages/WalletView';
import EnableAutomaticSecurityChecksView from '../../pages/EnableAutomaticSecurityChecksView';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import LoginView from '../../pages/LoginView';
import SkipAccountSecurityModal from '../../pages/modals/SkipAccountSecurityModal';
import OnboardingWizardModal from '../../pages/modals/OnboardingWizardModal';
import ProtectYourWalletModal from '../../pages/modals/ProtectYourWalletModal';
import WhatsNewModal from '../../pages/modals/WhatsNewModal';
import { acceptTermOfUse } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import CommonView from '../../pages/CommonView';
import Assertions from '../../utils/Assertions';
import ExperienceEnhancerModal from '../../pages/modals/ExperienceEnhancerModal';

const PASSWORD = '12345678';

describe(
  Regression('Onboarding wizard opt-in, metametrics opt out from settings'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
      await device.launchApp();
    });

    it('should be able to opt-in of the onboarding-wizard', async () => {
      await OnboardingCarouselView.tapOnGetStartedButton();
      await OnboardingView.tapCreateWallet();
      await Assertions.checkIfVisible(MetaMetricsOptIn.container);
      await MetaMetricsOptIn.tapAgreeButton();
      await acceptTermOfUse();
      await Assertions.checkIfVisible(CreatePasswordView.container);
    });

    it('should be able to create a new wallet', async () => {
      await CreatePasswordView.enterPassword(PASSWORD);
      await CreatePasswordView.reEnterPassword(PASSWORD);
      await CreatePasswordView.tapIUnderstandCheckBox();
      await CreatePasswordView.tapCreatePasswordButton();
    });

    it('Should skip backup check', async () => {
      // Check that we are on the Secure your wallet screen
      await Assertions.checkIfVisible(ProtectYourWalletView.container);
      await ProtectYourWalletView.tapOnRemindMeLaterButton();
      await SkipAccountSecurityModal.tapIUnderstandCheckBox();
      await SkipAccountSecurityModal.tapSkipButton();
      await OnboardingSuccessView.tapDone();

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
        await Assertions.checkIfVisible(OnboardingWizardModal.stepOneContainer);
        await OnboardingWizardModal.tapNoThanksButton();
        await Assertions.checkIfNotVisible(
          OnboardingWizardModal.stepOneContainer,
        );
      } catch {
        //
      }
    });

    it('should dismiss the marketing consent bottom sheet', async () => {
      // dealing with flakiness on bitrise.
      await TestHelpers.delay(1000);
      try {
        await Assertions.checkIfVisible(
          await ExperienceEnhancerModal.container,
        );
        await ExperienceEnhancerModal.tapIagree();
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
      await Assertions.checkIfVisible(
        ProtectYourWalletModal.collapseWalletModal,
      );
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
      await TestHelpers.delay(2000);
      await Assertions.checkIfToggleIsOn(SecurityAndPrivacy.metaMetricsToggle);
    });

    it('should disable metametrics', async () => {
      await SecurityAndPrivacy.tapMetaMetricsToggle();
      await TestHelpers.delay(1500);
      await CommonView.tapOkAlert();
      await Assertions.checkIfToggleIsOff(SecurityAndPrivacy.metaMetricsToggle);
    });

    it('should relaunch the app and log in', async () => {
      // Relaunch app
      await TestHelpers.relaunchApp();
      await TestHelpers.delay(4500);
      await LoginView.isVisible();
      await LoginView.enterPassword(PASSWORD);
      await WalletView.isVisible();
    });

    it('should dismiss the onboarding wizard after logging in', async () => {
      // dealing with flakiness on bitrise.
      await TestHelpers.delay(1000);
      try {
        await Assertions.checkIfVisible(OnboardingWizardModal.stepOneContainer);
        await OnboardingWizardModal.tapNoThanksButton();
        await Assertions.checkIfNotVisible(
          OnboardingWizardModal.stepOneContainer,
        );
      } catch {
        //
      }
    });

    it('should verify metametrics is turned off', async () => {
      await TabBarComponent.tapSettings();
      await SettingsView.tapSecurityAndPrivacy();
      await SecurityAndPrivacy.scrollToMetaMetrics();
      await Assertions.checkIfToggleIsOff(SecurityAndPrivacy.metaMetricsToggle);
    });
  },
);
