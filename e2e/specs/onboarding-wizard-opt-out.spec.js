'use strict';
import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ProtectYourWalletView from '../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../pages/Onboarding/CreatePasswordView';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';

import DrawerView from '../pages/Drawer/DrawerView';
//import { BROWSER_SCREEN_ID, Browser } from '../pages/Drawer/Browser';

import SettingsView from '../pages/Drawer/Settings/SettingsView';
import SecurityAndPrivacy from '../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';

import LoginView from '../pages/LoginView';

import SkipAccountSecurityModal from '../pages/modals/SkipAccountSecurityModal';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import ProtectYourWalletModal from '../pages/modals/ProtectYourWalletModal';

const PASSWORD = '12345678';

describe('Onboarding wizard opt-out', () => {
	it('should be able to opt-out of the onboarding-wizard', async () => {
		await OnboardingCarouselView.isVisible();
		await OnboardingCarouselView.tapOnGetStartedButton();

		await OnboardingView.isVisible();
		await OnboardingView.tapCreateWallet();

		await MetaMetricsOptIn.isVisible();
		await MetaMetricsOptIn.tapNoThanksButton();

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

	it('should check that metametrics is disabled in settings', async () => {
		await WalletView.tapDrawerButton(); // tapping burger menu

		await DrawerView.isVisible();
		await DrawerView.tapSettings();

		await SettingsView.tapSecurityAndPrivacy();

		await SecurityAndPrivacy.scrollToBottomOfView();
		await SecurityAndPrivacy.isMetaMetricsToggleOff();

		// Toggle Metametrics on
		await SecurityAndPrivacy.tapMetaMetricsToggleOn();
		await SecurityAndPrivacy.isMetaMetricsToggleOn();

		TestHelpers.delay(1500);
		// Toggle Metametrics off
		await SecurityAndPrivacy.tapMetaMetricsToggleOn();
		await SecurityAndPrivacy.isMetaMetricsToggleOff();

		TestHelpers.delay(1500);
		await SecurityAndPrivacy.tapOKAlertButton();
		await SecurityAndPrivacy.isMetaMetricsToggleOff();
	});

	it('should be able to log in', async () => {
		// Relaunch app
		await TestHelpers.relaunchApp();

		// Check that we are on login screen
		await LoginView.isVisible();
		await LoginView.enterPassword(PASSWORD);

		await WalletView.isVisible();
	});
	// Flakey steps. Removing for now.
	// it('should check that wizard is gone after reloading app', async () => {
	// 	// Ensure you are on the wallet view
	// 	await WalletView.isVisible();
	// 	// Check that the wizard is not visible anymore
	// 	await TestHelpers.checkIfElementWithTextIsNotVisible('Welcome to your new wallet!');
	// });

	// it('should take tour and skip tutorial', async () => {
	// 	await WalletView.tapDrawerButton();

	// 	await DrawerView.isVisible();
	// 	await DrawerView.tapBrowser();

	// 	await Browser.isVisible();
	// 	await Browser.scrollToTakeTourOnBrowserPage();

	// 	// Tap on the Take a tour box
	// 	if (device.getPlatform() === 'ios') {
	// 		await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 215, y: 555 });
	// 	} else {
	// 		await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 175, y: 480 });
	// 	}
	// 	await Browser.isNotVisible();

	// 	await WalletView.isVisible();

	// 	// Check that the onboarding wizard is present
	// 	await OnboardingWizardModal.isVisible();
	// 	await OnboardingWizardModal.tapTakeTourButton();

	// 	// Tap on Skip Tutorial
	// 	await OnboardingWizardModal.tapSkipTutorialButton();
	// 	await OnboardingWizardModal.isNotVisible();
	// });
});
