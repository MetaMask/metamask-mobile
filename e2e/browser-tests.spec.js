'use strict';
import TestHelpers from './helpers';

const ENS_Example = 'https://brunobarbieri.eth';
const ENS_TLD = 'https://inbox.mailchain.xyz';
const UNISWAP = 'https://uniswap.exchange';
const PASSWORD = '12345678';
const PHISHING_SITE = 'http://www.empowr.com/FanFeed/Home.aspx';
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
		// Check that we are on the metametrics optIn screen
		await TestHelpers.checkIfVisible('metaMetrics-OptIn');
		// Check that I Agree CTA is visible and tap it
		await TestHelpers.waitAndTap('agree-button');
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
		// Check that we are on the wallet screen
		if (!device.getPlatform() === 'android') {
			// Check that we are on the wallet screen
			await TestHelpers.checkIfExists('wallet-screen');
		}
	});

	it('should dismiss the onboarding wizard', async () => {
		await TestHelpers.delay(1000);

		// dealing with flakiness
		try {
			// Check that the onboarding wizard is present
			await TestHelpers.checkIfVisible('onboarding-wizard-step1-view');
			// Check that No thanks CTA is visible and tap it
			await TestHelpers.waitAndTap('onboarding-wizard-back-button');
			// Check that the onboarding wizard is gone
			await TestHelpers.checkIfNotVisible('onboarding-wizard-step1-view');
		} catch (e) {
			console.log('');
		}
	});

	it('should dismiss the protect your wallet modal', async () => {
		await TestHelpers.delay(2000);

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

	it('should go to first explore tab and navigate back to homepage', async () => {
		// This can only be done on Android since we removed option for iOS due to Appstore
		if (!device.getPlatform() === 'android') {
			// Tap on first category
			await TestHelpers.tapAtPoint('browser-screen', { x: 100, y: 425 });
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
		}
	});

	it('should go to uniswap', async () => {
		// Tap on home on bottom navbar
		// await TestHelpers.tap('home-button');
		// Wait for page to load
		await TestHelpers.delay(3000);
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Navigate to URL
		if (device.getPlatform() === 'ios') {
			await TestHelpers.clearField('url-input');
			await TestHelpers.typeTextAndHideKeyboard('url-input', UNISWAP);
			await TestHelpers.delay(2000);
		} else {
			await TestHelpers.tap('android-cancel-url-button');
			await TestHelpers.replaceTextInField('url-input', UNISWAP);
			await element(by.id('url-input')).tapReturnKey();
		}
		// Wait for page to load
		await TestHelpers.delay(5000);
		if (device.getPlatform() === 'android') {
			// Check that the dapp title is correct
			await TestHelpers.checkIfElementWithTextIsVisible('app.uniswap.org', 0);
		}
		// Tap on CANCEL button
		await TestHelpers.tap('connect-cancel-button');

		// THIS SUCKS BUT UNISWAP IS ASKING TO CONNECT TWICE
		// Tap on CANCEL button
		// Wait for page to load
		await TestHelpers.delay(3000);
		await TestHelpers.tap('connect-cancel-button');
		// Android has weird behavior where the URL modal stays open, so this closes it
		// Close URL modal
		if (device.getPlatform() === 'android') {
			await device.pressBack();
		}
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
			// Tap on options
			await TestHelpers.waitAndTap('options-button');
			// Open new tab
			await TestHelpers.tapByText('New tab');
			await TestHelpers.tapAtPoint('browser-screen', { x: 174, y: 281 });
			await TestHelpers.delay(1500);
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 274, y: 223 });
			await TestHelpers.tapAtPoint('browser-screen', { x: 180, y: 275 });
			await TestHelpers.delay(1500);
		}
		// Wait for connect prompt to display
		await TestHelpers.delay(5000);
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
		await TestHelpers.replaceTextInField('url-input', PHISHING_SITE);
		await element(by.id('url-input')).tapReturnKey();

		/*
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap on empowr from search results
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 60, y: 270 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 56, y: 284 });
			await TestHelpers.delay(700);
		}
		*/

		//Wait for page to load
		await TestHelpers.delay(9000); // to prevent flakey behavior in bitrise

		await TestHelpers.checkIfElementWithTextIsVisible('Back to safety');
		// Tap on Back to safety button
		await TestHelpers.tapByText('Back to safety');
		// Check that we are on the browser screen
		if (!device.getPlatform() === 'android') {
			await TestHelpers.delay(1500);
		}
		await TestHelpers.checkIfVisible('browser-screen');
	});
});
