'use strict';
import TestHelpers from './helpers';

const ACCOUNT = 'Test Account One';
const PASSWORD = '12345678';

describe('Start Exploring', () => {
	beforeEach(() => {
		jest.setTimeout(150000);
	});

	it('should show the onboarding screen', async () => {
		// Check that we are on the onboarding carousel screen
		await TestHelpers.checkIfVisible('onboarding-carousel-screen');
		// Check that title of screen 1 is correct
		await TestHelpers.checkIfElementHasString('carousel-screen-one', 'Welcome to MetaMask');
		// Check that right image is displayed
		await TestHelpers.checkIfVisible('carousel-one-image');
		// Swipe left
		await TestHelpers.swipe('onboarding-carousel-screen', 'left');
		// Check that title of screen 2 is correct
		await TestHelpers.checkIfElementHasString('carousel-screen-two', 'Say hello to your wallet...');
		// Check that right image is displayed
		await TestHelpers.checkIfVisible('carousel-two-image');
		// Swipe left
		await TestHelpers.swipe('onboarding-carousel-screen', 'left');
		// Check that title of screen 3 is correct
		await TestHelpers.checkIfElementHasString('carousel-screen-three', 'Explore decentralized apps');
		// Check that right image is displayed
		await TestHelpers.checkIfVisible('carousel-three-image');
		// Check that Get started CTA is visible & tap it
		await TestHelpers.waitAndTap('onboarding-get-started-button');
		// Check that we are on the onboarding screen
		await TestHelpers.checkIfVisible('onboarding-screen');
		// Check that the title is correct
		await TestHelpers.checkIfElementHasString('onboarding-screen-title', 'Get started!');
	});

	it('should allow you to create a new wallet', async () => {
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
	});

	it('should tap I Agree and land on the wallet view with tutorial open', async () => {
		// Check that I Agree CTA is visible and tap it
		await TestHelpers.waitAndTap('agree-button');
		// Check that we are on the wallet screen
		if (!device.getPlatform() === 'android') {
			await TestHelpers.checkIfExists('wallet-screen');
		}
		// Check that the onboarding wizard is present
		await TestHelpers.checkIfVisible('onboarding-wizard-step1-view');
	});

	it('should go through the onboarding wizard flow', async () => {
		// Check that Take the tour CTA is visible and tap it
		await TestHelpers.waitAndTap('onboarding-wizard-next-button');
		// Ensure step 2 is shown correctly
		await TestHelpers.checkIfVisible('step2-title');
		// Check that Got it! CTA is visible and tap it
		await TestHelpers.tapByText('Got it!');
		// Ensure step 3 is shown correctly
		await TestHelpers.checkIfVisible('step3-title');
		// Focus into account 1 name
		await TestHelpers.tapAndLongPress('account-label');
		// Clear text
		await TestHelpers.clearField('account-label-text-input');
		// Change account name
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField('account-label-text-input', ACCOUNT);
			await element(by.id('account-label-text-input')).tapReturnKey();
		} else {
			await TestHelpers.typeTextAndHideKeyboard('account-label-text-input', ACCOUNT);
		}
		// Check that Got it! CTA is visible and tap it
		if (!device.getPlatform() === 'android') {
			await TestHelpers.tapByText('Got it!');
		}
		await TestHelpers.tapByText('Got it!');
		// Check that the account name edit stuck
		await TestHelpers.checkIfElementHasString('account-label-text-input', ACCOUNT);
		// Ensure step 4 is shown correctly
		await TestHelpers.checkIfVisible('step4-title');
		// Tap on the menu navigation
		await TestHelpers.waitAndTap('hamburger-menu-button-wallet-fake');
		// Ensure step 5 is shown correctly
		await TestHelpers.checkIfVisible('step5-title');
		// Tap on Back
		await TestHelpers.tapByText('Back');
		// Ensure step 4 is shown correctly
		await TestHelpers.checkIfVisible('step4-title');
		// Check that Got it! CTA is visible and tap it
		await TestHelpers.tapByText('Got it!');
		// Ensure step 5 is shown correctly
		await TestHelpers.checkIfVisible('step5-title');
		// Check that Got it! CTA is visible and tap it
		await TestHelpers.tapByText('Got it!');
		// Ensure step 6 is shown correctly
		await TestHelpers.checkIfVisible('step6-title');
		// Tap on Back
		await TestHelpers.tapByText('Back');
		// Ensure step 5 is shown correctly
		await TestHelpers.checkIfVisible('step5-title');
		// Check that Got it! CTA is visible and tap it
		await TestHelpers.tapByText('Got it!');
		// Ensure step 6 is shown correctly
		await TestHelpers.checkIfVisible('step6-title');
		// Check that Got it! CTA is visible and tap it
		await TestHelpers.tapByText('Got it!');
		// Check that we are on the Browser page
		await TestHelpers.checkIfVisible('browser-screen');
	});
});
