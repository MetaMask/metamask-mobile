'use strict';
import TestHelpers from './helpers';

const ETHEREUM_ENABLE = 'https://brunobar79.github.io/dapp-issues-repro/';
const Sign_Examples = 'https://danfinlay.github.io/js-eth-personal-sign-examples/';
const ENS_Example = 'https://brunobarbieri.eth';
const ENS_TLD = 'https://inbox.mailchain.xyz';

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
		// Check that Start Exploring CTA is visible & tap it
		await TestHelpers.waitAndTap('start-exploring-button');
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
		await TestHelpers.checkIfHasText('dapp-name-title', 'Eth Sign Tests');
		// Tap on CONNECT button
		await TestHelpers.tapByText('CONNECT');
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
			await TestHelpers.tapByText('SIGN');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tapByText('SIGN');
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
			await TestHelpers.tapByText('SIGN');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tapByText('SIGN');
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
			await TestHelpers.tapByText('SIGN');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tapByText('SIGN');
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
			await TestHelpers.tapByText('SIGN');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tapByText('SIGN');
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
			await TestHelpers.tapByText('SIGN');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tapByText('SIGN');
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
			await TestHelpers.tapByText('SIGN');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tapByText('SIGN');
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
			await TestHelpers.tapByText('SIGN');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tapByText('SIGN');
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
			await TestHelpers.tapByText('SIGN');
		} else {
			await TestHelpers.delay(1000);
			await TestHelpers.tapByText('SIGN');
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

		await TestHelpers.checkIfHasText('dapp-name-title', 'brunobar79.github.io');

		// Tap on CONNECT button
		if (!device.getPlatform() === 'android') {
			await TestHelpers.delay(2000);
		}
		await TestHelpers.tapByText('CONNECT');
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

	it('should go to coinbase and navigate back to homepage', async () => {
		// Tap on home on bottom navbar
		await TestHelpers.tap('home-button');
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Tap on Buy Crypto
		if (device.getPlatform() === 'android') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 100, y: 425 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 100, y: 450 });
		}
		// Tap on Coinbase
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
		// Tap on Uniswap
		await TestHelpers.tapAtPoint('browser-screen', { x: 50, y: 285 });
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that account approval is displayed with correct dapp name
		await TestHelpers.checkIfHasText('dapp-name-title', 'Uniswap Exchange');
		// Tap on CANCEL button
		await TestHelpers.tapByText('CANCEL');

		// THIS SUCKS BUT UNISWAP IS ASKING TO CONNECT TWICE
		// Tap on CANCEL button
		// Wait for page to load
		await TestHelpers.delay(1000);
		await TestHelpers.tapByText('CANCEL');

		// Check that we are still on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
	});

	it('should add uniswap to favorites', async () => {
		// Check that we are still on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap on options
		await TestHelpers.waitAndTap('options-button');
		// Tap on New tab
		await TestHelpers.tapByText('Add to Favorites');
		// Tap on ADD button
		await TestHelpers.tapByText('ADD');
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
			await TestHelpers.tapAtPoint('browser-screen', { x: 274, y: 386 });
			await TestHelpers.tapAtPoint('browser-screen', { x: 184, y: 446 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 277, y: 418 });
			await TestHelpers.tapAtPoint('browser-screen', { x: 181, y: 482 });
			await TestHelpers.delay(1500);
		}
		// Check that account approval is displayed with correct dapp name
		await TestHelpers.checkIfHasText('dapp-name-title', 'Uniswap Exchange');
		// Tap on Connect button
		await TestHelpers.tapByText('CONNECT');
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
		await TestHelpers.typeTextAndHideKeyboard('url-input', 'empowr secure');
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
