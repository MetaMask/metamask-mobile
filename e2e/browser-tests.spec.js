'use strict';
import TestHelpers from './helpers';

const ETHEREUM_ENABLE = 'https://brunobar79.github.io/dapp-issues-repro/';
const Sign_Examples = 'https://danfinlay.github.io/js-eth-personal-sign-examples/';
const ENS_Example = 'https://brunobarbieri.eth';
const ENS_TLD = 'https://inbox.mailchain.xyz';
const UNISWAP = 'https://uniswap.eth';
const PASSWORD = '12345678';

describe('Browser Tests', () => {
	beforeEach(() => {
		jest.setTimeout(150000);
	});

	it('should create new wallet and dismiss tutorial', async () => {
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
		// Check that we are on the metametrics optIn screen
		await TestHelpers.checkIfVisible('metaMetrics-OptIn');
		// Check that I Agree CTA is visible and tap it
		await TestHelpers.waitAndTap('agree-button');
		// Check that we are on the wallet screen
		if (!device.getPlatform() === 'android') {
			// Check that we are on the wallet screen
			await TestHelpers.checkIfExists('wallet-screen');
		}
		// Check that the onboarding wizard is present
		await TestHelpers.checkIfVisible('onboarding-wizard-step1-view');
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

	it('should navigate to browser', async () => {
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
	});

	it('should navigate to eth personal sign examples', async () => {
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Navigate to URL
		if (device.getPlatform() === 'ios') {
			await TestHelpers.typeTextAndHideKeyboard('url-input', Sign_Examples);
		} else {
			await TestHelpers.replaceTextInField('url-input', Sign_Examples);
			await element(by.id('url-input')).tapReturnKey();
			await TestHelpers.delay(2500);
		}
		// Wait for page to load
		await TestHelpers.delay(2000);
		// Check that we are on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap on Connect button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 397 });
		} else {
			await TestHelpers.delay(2000);
			await TestHelpers.tapAtPoint('browser-screen', { x: 240, y: 424 });
			await TestHelpers.delay(2000);
		}
		// Check that the dapp title is correct
		await TestHelpers.checkIfElementWithTextIsVisible('danfinlay.github.io', 0);
		// Tap on CONNECT button
		await TestHelpers.tap('connect-approve-button');
		await TestHelpers.delay(1000);
		// Tap on eth_sign button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 458 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 235, y: 485 });
			await TestHelpers.delay(700);
		}
		// Tap on SIGN button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap('request-signature-confirm-button');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tap('request-signature-confirm-button');
			await TestHelpers.delay(1000);
		}
		// Tap on personal_sign button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 522 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 235, y: 542 });
			await TestHelpers.delay(700);
		}
		// Tap on SIGN button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap('request-signature-confirm-button');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tap('request-signature-confirm-button');
			await TestHelpers.delay(1000);
		}
		// Tap ok in alert box
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAlertWithButton('Ok');
		} else {
			await TestHelpers.tapAlertWithButton('OK');
		}
		// Tap on personal_ecRecover button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 583 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 235, y: 593 });
			await TestHelpers.delay(700);
		}
		// Tap on SIGN button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap('request-signature-confirm-button');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tap('request-signature-confirm-button');
			await TestHelpers.delay(1000);
		}
		// Scroll to bottom of browser view
		if (device.getPlatform() === 'ios') {
			await TestHelpers.swipe('browser-screen', 'up');
		} else {
			await TestHelpers.checkIfExists('browser-webview');
			await TestHelpers.swipe('browser-webview', 'up');
			await TestHelpers.delay(1000);
		}
		// Tap on ethjs personal sign button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 96 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 235, y: 32 });
			await TestHelpers.delay(700);
		}
		// Tap on SIGN button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap('request-signature-confirm-button');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tap('request-signature-confirm-button');
			await TestHelpers.delay(1000);
		}
		// Tap on sign typed data button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 226 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 235, y: 155 });
			await TestHelpers.delay(700);
		}
		// Tap on SIGN button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap('request-signature-confirm-button');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tap('request-signature-confirm-button');
			await TestHelpers.delay(1000);
		}
		// Tap ok in alert box
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAlertWithButton('Ok');
		} else {
			await TestHelpers.tapAlertWithButton('OK');
		}
		// Tap on sign typed data v3 button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 330 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 235, y: 245 });
			await TestHelpers.delay(700);
		}
		// Tap on SIGN button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap('request-signature-confirm-button');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tap('request-signature-confirm-button');
			await TestHelpers.delay(1000);
		}
		// Tap ok in alert box
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAlertWithButton('Ok');
		} else {
			await TestHelpers.tapAlertWithButton('OK');
		}
		// Tap on sign typed data v4 button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 430 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 235, y: 330 });
			await TestHelpers.delay(700);
		}
		// Tap on SIGN button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap('request-signature-confirm-button');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tap('request-signature-confirm-button');
			await TestHelpers.delay(1000);
		}
		// Tap ok in alert box
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAlertWithButton('Ok');
		} else {
			await TestHelpers.tapAlertWithButton('OK');
		}
		// Tap on sign typed data with ethjs button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 530 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 235, y: 475 });
			await TestHelpers.delay(700);
		}
		// Tap on SIGN button
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap('request-signature-confirm-button');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tap('request-signature-confirm-button');
			await TestHelpers.delay(1000);
		}
	});

	it('should navigate to dapp-issues-repro and reload page', async () => {
		// Tap on options
		await TestHelpers.waitAndTap('options-button');
		// Tap on New tab
		await TestHelpers.tapByText('New tab');
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Navigate to URL
		if (device.getPlatform() === 'ios') {
			await TestHelpers.typeTextAndHideKeyboard('url-input', ETHEREUM_ENABLE);
		} else {
			await TestHelpers.replaceTextInField('url-input', ETHEREUM_ENABLE);
			await element(by.id('url-input')).tapReturnKey();
		}
		// Dismiss alert box
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAlertWithButton('Ok');
		} else {
			await TestHelpers.tapAlertWithButton('OK');
		}
		// Check that the dapp title is correct
		await TestHelpers.checkIfElementWithTextIsVisible('brunobar79.github.io', 0);
		// Tap on CONNECT button
		if (!device.getPlatform() === 'android') {
			await TestHelpers.delay(2000);
		}
		await TestHelpers.tap('connect-approve-button');
		// Dismiss alert box
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAlertWithButton('Ok');
		} else {
			await TestHelpers.tapAlertWithButton('OK');
		}
		// Tap on options
		await TestHelpers.waitAndTap('options-button');
		// Tap on New tab
		await TestHelpers.tapByText('Reload');
		// Dismiss alert box
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAlertWithButton('Ok');
		} else {
			await TestHelpers.tapAlertWithButton('OK');
		}
		// Dismiss alert box
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAlertWithButton('Ok');
		} else {
			await TestHelpers.tapAlertWithButton('OK');
		}
	});

	it('should go to first explore tab and navigate back to homepage', async () => {
		// Tap on home on bottom navbar
		await TestHelpers.tap('home-button');
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Tap on first category
		if (device.getPlatform() === 'android') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 100, y: 425 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 100, y: 450 });
		}
		// Tap on first option
		await TestHelpers.tapAtPoint('browser-screen', { x: 80, y: 100 });
		// Tap back button
		await TestHelpers.waitAndTap('go-back-button');
		// Tap back button
		await TestHelpers.waitAndTap('go-back-button');
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that we are on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
	});

	it('should go to uniswap', async () => {
		// Tap on home on bottom navbar
		await TestHelpers.tap('home-button');
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Navigate to URL
		if (device.getPlatform() === 'ios') {
			await TestHelpers.typeTextAndHideKeyboard('url-input', UNISWAP);
		} else {
			await TestHelpers.replaceTextInField('url-input', UNISWAP);
			await element(by.id('url-input')).tapReturnKey();
		}
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that the dapp title is correct
		await TestHelpers.checkIfElementWithTextIsVisible('uniswap.eth', 0);
		// Tap on CANCEL button
		await TestHelpers.tap('connect-cancel-button');

		// THIS SUCKS BUT UNISWAP IS ASKING TO CONNECT TWICE
		// Tap on CANCEL button
		// Wait for page to load
		await TestHelpers.delay(1000);
		await TestHelpers.tap('connect-cancel-button');

		// Check that we are still on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
	});

	it('should add uniswap to favorites', async () => {
		// Check that we are still on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap on options
		await TestHelpers.waitAndTap('options-button');
		// Tap on Add to Favorites
		await TestHelpers.tapByText('Add to Favorites');
		// Check that we are on the correct screen
		await TestHelpers.checkIfVisible('add-bookmark-screen');
		// Tap on ADD button
		await TestHelpers.tap('add-bookmark-confirm-button');
	});

	it('should go back home and navigate to favorites', async () => {
		// Tap on home on bottom navbar
		await TestHelpers.tap('home-button');
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that we are still on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap on Favorites tab
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 274, y: 227 });
			await TestHelpers.tapAtPoint('browser-screen', { x: 174, y: 281 });
			await TestHelpers.delay(1500);
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 274, y: 223 });
			await TestHelpers.tapAtPoint('browser-screen', { x: 180, y: 275 });
			await TestHelpers.delay(1500);
		}
		// Tap on Connect button
		await TestHelpers.tap('connect-approve-button');
		// Check that we are still on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
	});

	it('should test ENS sites', async () => {
		// Tap on home on bottom navbar
		await TestHelpers.tap('home-button');
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Navigate to URL
		await TestHelpers.replaceTextInField('url-input', ENS_Example);
		await element(by.id('url-input')).tapReturnKey();
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that we are on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Navigate to URL
		await TestHelpers.replaceTextInField('url-input', ENS_TLD);
		await element(by.id('url-input')).tapReturnKey();
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that we are on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
	});

	it('should test phishing sites', async () => {
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Clear text
		await TestHelpers.clearField('url-input');
		// Navigate to URL
		await TestHelpers.typeTextAndHideKeyboard('url-input', 'secure empowr');
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that we are on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap on empowr from search results
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 20, y: 245 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 56, y: 284 });
			await TestHelpers.delay(700);
		}
		// Tap on Back to safety button
		await TestHelpers.tapByText('Back to safety');
		// Check that we are on the browser screen
		if (!device.getPlatform() === 'android') {
			await TestHelpers.delay(1500);
		}
		await TestHelpers.checkIfVisible('browser-screen');
	});
});
