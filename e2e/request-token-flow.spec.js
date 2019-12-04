'use strict';
import TestHelpers from './helpers';

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
		// Tap on the Request box
		await TestHelpers.tapByText('Request');
		// Make sure we're on the right screen
		await TestHelpers.checkIfVisible('request-screen');
		// Tap on ETH
		await TestHelpers.tapItemAtIndex('top-pick-asset-results');
		// Make sure we're on the right screen
		await TestHelpers.checkIfVisible('request-amount-screen');
		// Request 0.03 ETH
		await TestHelpers.typeTextAndHideKeyboard('request-amount-input', 0.03);
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
	});
});
