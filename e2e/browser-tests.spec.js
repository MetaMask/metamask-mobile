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
		await TestHelpers.checkIfExists('wallet-screen');
		// Check that the onboarding wizard is present
		await TestHelpers.checkIfVisible('onboarding-wizard-step1-view');
		// Check that No thanks CTA is visible and tap it
		await TestHelpers.waitAndTap('onboarding-wizard-back-button');
		// Check that the onboarding wizard is gone
		await TestHelpers.checkIfNotVisible('onboarding-wizard-step1-view');
	});

	it('should navigate to browser', async () => {
		// Open Drawer
		await TestHelpers.tapAtPoint('wallet-screen', { x: 30, y: -5 });
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on Browser
		await TestHelpers.tapByText('Browser');
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that we are on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
	});

	it('should go to coinbase and navigate back to homepage', async () => {
		// Tap on Buy Crypto
		await TestHelpers.tapAtPoint('browser-screen', { x: 100, y: 450 });
		// Tap on Coinbase
		await TestHelpers.tapAtPoint('browser-screen', { x: 60, y: 110 });
		// Tap back button
		await TestHelpers.waitAndTap('go-back-button');
		// Tap back button
		await TestHelpers.waitAndTap('go-back-button');
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that we are on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
	});

	it('should go to uniswap and connect', async () => {
		// Wait for page to load
		await TestHelpers.delay(2500);
		// Tap on Uniswap
		await TestHelpers.tapAtPoint('browser-screen', { x: 50, y: 285 });
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that account approval is displayed with correct dapp name
		await TestHelpers.checkIfHasText('dapp-name-title', 'Uniswap Exchange');
		// Tap on CANCEL button
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
		// Tap on options
		await TestHelpers.waitAndTap('options-button');
		// Tap on New tab
		await TestHelpers.tapByText('New tab');
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Tap on Favorites tab
		await TestHelpers.tapAtPoint('browser-screen', { x: 274, y: 386 });
		// navigate back to Uniswap
		await TestHelpers.tapAtPoint('browser-screen', { x: 184, y: 446 });
		// Check that account approval is displayed with correct dapp name
		await TestHelpers.checkIfHasText('dapp-name-title', 'Uniswap Exchange');
		// Tap on Connect button
		await TestHelpers.tapByText('CONNECT');
		// Check that we are still on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
	});

	it('should navigate to dapp-issues-repro and reload page', async () => {
		// Tap on options
		await TestHelpers.waitAndTap('options-button');
		// Tap on New tab
		await TestHelpers.tapByText('New tab');
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Navigate to URL
		await TestHelpers.typeTextAndHideKeyboard('url-input', ETHEREUM_ENABLE);
		// Tap on CONNECT button
		await TestHelpers.tapByText('CONNECT');
		// Dismiss alert box
		await TestHelpers.tapAlertWithButton('Ok');
		// Tap on options
		await TestHelpers.waitAndTap('options-button');
		// Tap on New tab
		await TestHelpers.tapByText('Reload');
		// Dismiss alert box
		await TestHelpers.tapAlertWithButton('Ok');
	});

	it('should navigate to eth personal sign examples', async () => {
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Clear text
		await TestHelpers.clearField('url-input');
		// Navigate to URL
		await TestHelpers.typeTextAndHideKeyboard('url-input', Sign_Examples);
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that we are on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap on Connect button
		await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 397 });
		// Check that the dapp title is correct
		await TestHelpers.checkIfHasText('dapp-name-title', 'Eth Sign Tests');
		// Tap on CONNECT button
		await TestHelpers.tapByText('CONNECT');
		// Tap on eth_sign button
		await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 458 });
		// Tap on SIGN button
		await TestHelpers.tapByText('SIGN');
		// Tap on personal_sign button
		await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 522 });
		// Tap on SIGN button
		await TestHelpers.tapByText('SIGN');
		// Tap ok in alert box
		await TestHelpers.tapAlertWithButton('Ok');
		// Tap on personal_ecRecover button
		await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 583 });
		// Tap on SIGN button
		await TestHelpers.tapByText('SIGN');
		// Scroll to bottom of browser view
		await TestHelpers.swipe('browser-screen', 'up');
		// Tap on ethjs personal sign button
		await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 188 });
		// Tap on SIGN button
		await TestHelpers.tapByText('SIGN');
		// Tap on sign typed data button
		await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 308 });
		// Tap on SIGN button
		await TestHelpers.tapByText('SIGN');
		// Tap on sign typed data v3 button
		await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 400 });
		// Tap on SIGN button
		await TestHelpers.tapByText('SIGN');
		// Tap on sign typed data with ethjs button
		await TestHelpers.tapAtPoint('browser-screen', { x: 250, y: 496 });
		// Tap on SIGN button
		await TestHelpers.tapByText('SIGN');
		// Tap ok in alert box
		await TestHelpers.tapAlertWithButton('Ok');
	});

	it('should test ENS sites', async () => {
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Clear text
		await TestHelpers.clearField('url-input');
		// Navigate to URL
		await TestHelpers.typeTextAndHideKeyboard('url-input', ENS_Example);
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that we are on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Clear text
		await TestHelpers.clearField('url-input');
		// Navigate to URL
		await TestHelpers.typeTextAndHideKeyboard('url-input', ENS_TLD);
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
		await TestHelpers.tapAtPoint('browser-screen', { x: 20, y: 245 });
		// Tap on Back to safety button
		await TestHelpers.tapByText('Back to safety');
		// Check that we are on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
	});
});
