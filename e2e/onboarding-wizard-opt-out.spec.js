'use strict';
import TestHelpers from './helpers';

const PASSWORD = '12345678';

describe('Onboarding wizard opt-out', () => {
	it('should be able to opt-out of the onboarding-wizard', async () => {
		// Check that we are on the onboarding carousel screen
		await TestHelpers.checkIfVisible('onboarding-carousel-screen');
		// Check that Get started CTA is visible & tap it
		await TestHelpers.waitAndTap('onboarding-get-started-button');
		// Check that we are on the onboarding screen
		await TestHelpers.checkIfVisible('onboarding-screen');
		// Check that Create a new wallet CTA is visible & tap it
		await TestHelpers.waitAndTap('create-wallet-button');

		// Check that we are on the metametrics optIn screen
		await TestHelpers.checkIfVisible('metaMetrics-OptIn');
		// Check that I Agree CTA is visible and tap it
		await TestHelpers.waitAndTap('cancel-button');

		// Check that we are on the Create password screen
		await TestHelpers.checkIfVisible('create-password-screen');
		// Input new password
		await TestHelpers.typeTextAndHideKeyboard('input-password', PASSWORD);
		// Input confirm password
		await TestHelpers.typeTextAndHideKeyboard('input-password-confirm', PASSWORD);
		// Mark the checkbox that you understand the password cannot be recovered
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap('password-understand-box');
		} else {
			// Tap by the I understand text
			await TestHelpers.delay(1000);
			await TestHelpers.tap('i-understand-text');
		}
		// Tap on create password button
		await TestHelpers.tap('submit-button');
		// Check that we are on the Secure your wallet screen
		await TestHelpers.checkIfVisible('protect-your-account-screen');
		// Tap on the remind me later button
		await TestHelpers.tap('remind-me-later-button');
		// Check the box to state you understand
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap('skip-backup-check');
		} else {
			// Tap by the I understand text
			await TestHelpers.delay(1000);
			await TestHelpers.tap('skip-backup-text');
		}
		// Tap on Skip button
		await TestHelpers.tapByText('Skip');
		// Check that we are on the MetaMetrics optIn screen
		// Check that we are on wallet screen
		if (!device.getPlatform() === 'android') {
			// Check that we are on the wallet screen
			await TestHelpers.checkIfExists('wallet-screen');
		}
		await TestHelpers.delay(2000);
	});

	it('should dismiss the onboarding wizard', async () => {
		// dealing with flakiness
		await TestHelpers.delay(1000);
		try {
			// Check that the onboarding wizard is present
			await TestHelpers.checkIfVisible('onboarding-wizard-step1-view');
			// Check that No thanks CTA is visible and tap it
			await TestHelpers.waitAndTap('onboarding-wizard-back-button');
			// Check that the onboarding wizard is gone
			await TestHelpers.checkIfNotVisible('onboarding-wizard-step1-view');
		} catch (e) {
			console.log(e);
		}
	});

	it('should dismiss the protect your wallet modal', async () => {
		await TestHelpers.checkIfVisible('backup-alert');
		// Tap on remind me later
		await TestHelpers.tap('notification-remind-later-button');
		// Check the box to state you understand
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap('skip-backup-check');
		} else {
			// Tap by the I understand text
			await TestHelpers.delay(1000);
			await TestHelpers.tap('skip-backup-text');
		}
		// Tap on Skip button
		await TestHelpers.tapByText('Skip');
	});

	it('should check that metametrics is disabled in settings', async () => {
		// Open Drawer
		await TestHelpers.tap('hamburger-menu-button-wallet');
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on settings
		await TestHelpers.tapByText('Settings');
		// Tap on the "Security & Privacy" option
		await TestHelpers.tapByText('Security & Privacy');

		// Scroll to the bottom
		if (device.getPlatform() === 'android') {
			await TestHelpers.swipe('security-settings-scrollview', 'up', 'fast');
			await TestHelpers.delay(1000);
		} else {
			await TestHelpers.swipe('change-password-section', 'up', 'fast');
		}
		await TestHelpers.swipe('privacy-mode-section', 'up', 'fast');

		// Toggle Metametrics on
		await TestHelpers.tap('metametrics-switch');
		TestHelpers.delay(3000);
		// Toggle Metametrics off
		await TestHelpers.tap('metametrics-switch');
		await TestHelpers.delay(3000); // to prevent flakey behavior in bitrise
		// Tap OK in alert box
		await TestHelpers.tapAlertWithButton('OK');
		await TestHelpers.delay(3000); // to prevent flakey behavior in bitrise
	});

	it('should relaunch app and log in', async () => {
		// Relaunch the app
		await device.reloadReactNative();
		// Check that we are on the login screen
		await TestHelpers.checkIfVisible('login');
		// Enter password and login
		await TestHelpers.typeTextAndHideKeyboard('login-password-input', PASSWORD);
	});

	it('should check that wizard is gone after reloading app', async () => {
		try {
			// Ensure you are on the wallet view
			await TestHelpers.checkIfExists('wallet-screen');
			// Check that the wizard is not visible anymore
			await TestHelpers.checkIfElementWithTextIsNotVisible('Welcome to your new wallet!');
		} catch (e) {
			console.log('');
		}
	});

	it('should take tour and skip tutorial', async () => {
		// Open Drawer
		await TestHelpers.tap('hamburger-menu-button-wallet');
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on Browser
		await TestHelpers.tapByText('Browser');
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that we are on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
		// Scroll on browser to show tutorial box and tap to skip
		if (device.getPlatform() === 'ios') {
			await TestHelpers.swipe('browser-screen', 'up');
		} else {
			await TestHelpers.checkIfExists('browser-webview');
			await TestHelpers.swipe('browser-webview', 'up');
			await TestHelpers.delay(1000);
		}
		// Tap on the Take a tour box
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 215, y: 555 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 175, y: 480 });
		}
		// Check that we are on the wallet screen
		await TestHelpers.checkIfNotVisible('browser-screen');
		// Check that the onboarding wizard is present
		await TestHelpers.checkIfVisible('onboarding-wizard-step1-view');
		// Check that Take the tour CTA is visible and tap it
		await TestHelpers.waitAndTap('onboarding-wizard-next-button');
		// Tap on Skip Tutorial
		await TestHelpers.tapByText('Skip Tutorial');
		// Check that the wizard is not visible anymore
		await TestHelpers.checkIfNotVisible('onboarding-wizard-step1-view');
	});
});
