'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import ProtectYourWalletView from '../../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../../pages/Onboarding/CreatePasswordView';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../../pages/Onboarding/OnboardingCarouselView';
import MetaMetricsOptIn from '../../pages/Onboarding/MetaMetricsOptInView';
import OnboardingSuccessView from '../../pages/Onboarding/OnboardingSuccessView';
import WalletView from '../../pages/wallet/WalletView';
import EnableAutomaticSecurityChecksView from '../../pages/Onboarding/EnableAutomaticSecurityChecksView';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import LoginView from '../../pages/wallet/LoginView';
import SkipAccountSecurityModal from '../../pages/Onboarding/SkipAccountSecurityModal';
import OnboardingWizardModal from '../../pages/Onboarding/OnboardingWizardModal';
import ProtectYourWalletModal from '../../pages/Onboarding/ProtectYourWalletModal';
import { acceptTermOfUse } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import CommonView from '../../pages/CommonView';
import Assertions from '../../utils/Assertions';
import ExperienceEnhancerBottomSheet from '../../pages/Onboarding/ExperienceEnhancerBottomSheet';

const PASSWORD = '12345678';

describe(
  Regression('Onboarding wizard opt-in, metametrics opt out from settings'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
      await TestHelpers.launchApp();
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
    });

    it('Should dismiss Automatic Security checks screen', async () => {
      await TestHelpers.delay(3500);
      await Assertions.checkIfVisible(EnableAutomaticSecurityChecksView.container);
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
        await Assertions.checkIfVisible(ExperienceEnhancerBottomSheet.container);
        await ExperienceEnhancerBottomSheet.tapIAgree();
      } catch {
        /* eslint-disable no-console */

        console.log('The marketing consent sheet is not visible');
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
      await Assertions.checkIfVisible(WalletView.container);
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
      await Assertions.checkIfVisible(LoginView.container);
      await LoginView.enterPassword(PASSWORD);
      await Assertions.checkIfVisible(WalletView.container);
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
        /* eslint-disable no-console */

        console.log('The onboarding wizard is not visible');
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
