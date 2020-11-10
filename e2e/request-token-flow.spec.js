'use strict';
import TestHelpers from './helpers';

const SAI_CONTRACT_ADDRESS = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';
const PASSWORD = '12345678';

describe('Request Token Flow', () => {
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

	it('should navigate to the receive view', async () => {
		// Open Drawer
		await TestHelpers.tap('hamburger-menu-button-wallet');
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on Receive button
		await TestHelpers.waitAndTap('drawer-receive-button');
		// Check that we are on the receive screen
		await TestHelpers.checkIfVisible('receive-request-screen');
	});

	it('should request ETH', async () => {
		// Tap on request payment button
		await TestHelpers.tap('request-payment-button');
		// Tap on ETH
		await TestHelpers.tapItemAtIndex('searched-asset-results');
		// Make sure we're on the right screen
		await TestHelpers.checkIfVisible('request-amount-screen');
		// Go back
		await TestHelpers.tap('request-search-asset-back-button');
		// Make sure we're on the right screen
		await TestHelpers.checkIfVisible('request-screen');
		// Search by SAI contract address
		await TestHelpers.replaceTextInField('request-search-asset-input', SAI_CONTRACT_ADDRESS);
		// Make sure SAI shows up in the results
		await TestHelpers.checkIfElementHasString('searched-asset-results', 'SAI');
		// Search DAI
		if (device.getPlatform() === 'android') {
			await TestHelpers.typeTextAndHideKeyboard('request-search-asset-input', 'DAI');
		} else {
			await TestHelpers.replaceTextInField('request-search-asset-input', 'DAI');
		}
		// Select DAI from search results
		await TestHelpers.tapByText('DAI', 1);
		// Request 5.50 DAI
		await TestHelpers.typeTextAndHideKeyboard('request-amount-input', 5.5);
		// Make sure we're on the right screen
		await TestHelpers.checkIfVisible('send-link-screen');
		// Tap on QR Code Button
		await TestHelpers.tap('request-qrcode-button');
		// Check that the QR code is visible
		await TestHelpers.checkIfVisible('payment-request-qrcode');
		// Close QR Code
		await TestHelpers.tap('payment-request-qrcode-close-button');
		// Close view
		await TestHelpers.tap('send-link-close-button');
		// Ensure protect your wallet modal is visible
		await TestHelpers.checkIfVisible('protect-wallet-modal');
	});
});
