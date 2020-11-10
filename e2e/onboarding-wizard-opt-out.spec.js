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
		await TestHelpers.checkIfVisible('metaMetrics-OptIn');
		// Check that "No thanks" CTA is visible and tap it
		await TestHelpers.waitAndTap('cancel-button', 15000);
		// Check that we are on wallet screen
		if (!device.getPlatform() === 'android') {
			// Check that we are on the wallet screen
			await TestHelpers.checkIfExists('wallet-screen');
		}
		// Check that No thanks CTA is visible and tap it
		await TestHelpers.waitAndTap('onboarding-wizard-back-button');
		// Check that the onboarding wizard is gone
		await TestHelpers.checkIfNotVisible('onboarding-wizard-step1-view');
		// Check that the protect your wallet modal is visible
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
			await TestHelpers.swipe('change-password-section', 'up');
			TestHelpers.delay(1500);
			await TestHelpers.swipe('change-password-section', 'up');
			TestHelpers.delay(1500);
			await TestHelpers.swipe('auto-lock-section', 'up');
			TestHelpers.delay(1500);
			await TestHelpers.swipe('clear-privacy-section', 'up');
			TestHelpers.delay(1500);
			await TestHelpers.swipe('clear-cookies-section', 'up');
			TestHelpers.delay(1500);
			await TestHelpers.swipe('privacy-mode-section', 'up');
			TestHelpers.delay(1500);
			await TestHelpers.swipe('privacy-mode-section', 'up');
			TestHelpers.delay(1500);
			await TestHelpers.swipe('privacy-mode-section', 'up');
			TestHelpers.delay(1500);
			await TestHelpers.swipe('metametrics-section', 'up');
			TestHelpers.delay(1500);
		} else {
			await TestHelpers.swipe('auto-lock-section', 'up');
		}

		// Toggle Metametrics on
		await TestHelpers.tap('metametrics-switch');
		TestHelpers.delay(1000);
		// Toggle Metametrics off
		await TestHelpers.tap('metametrics-switch');
		// Tap OK in alert box
		await TestHelpers.tapAlertWithButton('OK');
	});

	it('should check that wizard is gone after reloading app', async () => {
		// Relaunch the app
		await device.reloadReactNative();
		// Check that we are on the login screen
		await TestHelpers.checkIfVisible('login');
		// Enter password and login
		await TestHelpers.typeTextAndHideKeyboard('login-password-input', PASSWORD);
		// Check that we are on the wallet screen
		if (device.getPlatform() === 'android') {
			await TestHelpers.delay(1000);
			await TestHelpers.checkIfExists('wallet-screen');
		} else {
			await TestHelpers.checkIfVisible('wallet-screen');
		}
		// Check that the wizard is not visible anymore
		await TestHelpers.checkIfNotVisible('onboarding-wizard-step1-view');
	});

	// commenting this out as tapping on this take a tour prompt currently doesn't work
	// once fixed I can add it back in

	// it('should take tour and skip tutorial', async () => {
	// 	// Open Drawer
	// 	await TestHelpers.tap('hamburger-menu-button-wallet');
	// 	// Check that the drawer is visbile
	// 	await TestHelpers.checkIfVisible('drawer-screen');
	// 	// Tap on Browser
	// 	await TestHelpers.tapByText('Browser');
	// 	// Wait for page to load
	// 	await TestHelpers.delay(1000);
	// 	// Check that we are on the browser screen
	// 	await TestHelpers.checkIfVisible('browser-screen');
	// 	// Scroll on browser to show tutorial box and tap to skip
	// 	if (device.getPlatform() === 'ios') {
	// 		await TestHelpers.swipe('browser-screen', 'up');
	// 	} else {
	// 		await TestHelpers.checkIfExists('browser-webview');
	// 		await TestHelpers.swipe('browser-webview', 'up');
	// 		await TestHelpers.delay(1000);
	// 	}
	// 	// Tap on the Take a tour box
	// 	if (device.getPlatform() === 'ios') {
	// 		await TestHelpers.tapAtPoint('browser-screen', { x: 215, y: 555 });
	// 	} else {
	// 		await TestHelpers.tapAtPoint('browser-screen', { x: 175, y: 480 });
	// 	}
	// 	// Check that we are on the wallet screen
	// 	await TestHelpers.checkIfNotVisible('browser-screen');
	// 	// Check that the onboarding wizard is present
	// 	await TestHelpers.checkIfVisible('onboarding-wizard-step1-view');
	// 	// Check that Take the tour CTA is visible and tap it
	// 	await TestHelpers.waitAndTap('onboarding-wizard-next-button');
	// 	// Tap on Skip Tutorial
	// 	await TestHelpers.tapByText('Skip Tutorial');
	// 	// Check that the wizard is not visible anymore
	// 	await TestHelpers.checkIfNotVisible('onboarding-wizard-step1-view');
	// });
});
