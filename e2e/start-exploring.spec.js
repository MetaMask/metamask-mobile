'use strict';
import TestHelpers from './helpers';

describe('Start Exploring', () => {
	it('onboarding show the onboarding screen', async () => {
		// Check that we are on the onboarding carousel screen
		await TestHelpers.checkIfVisible('onboarding-carousel-screen');
		// Check that Get started CTA is visible & tap it
		await TestHelpers.waitAndTap('onboarding-get-started-button');
		// Check that we are on the onboarding screen
		await TestHelpers.checkIfVisible('onboarding-screen');
	});

	it('should allow you to create a new wallet', async () => {
		// Check that Start Exploring CTA is visible & tap it
		await TestHelpers.waitAndTap('start-exploring-button');
		// Check that we are on the metametrics optIn screen
		await TestHelpers.checkIfVisible('metaMetrics-OptIn');
	});

	it('should tap I Agree and land on the wallet view with tutorial open', async () => {
		// Check that I Agree CTA is visible and tap it
		await TestHelpers.waitAndTap('agree-button');
		// Check that we are on the wallet screen
		await TestHelpers.checkIfExists('wallet-screen');
		// Check that the onboarding wizard is present
		await TestHelpers.checkIfVisible('onboarding-wizard-step1-view');
	});

	it('should go through the onboarding wizard flow', async () => {
		// Check that Take the tour CTA is visible and tap it
		await TestHelpers.waitAndTap('onboarding-wizard-next-button');
		// Check that Got it! CTA is visible and tap it
		await TestHelpers.tapByText('Got it!');
		// Check that Got it! CTA is visible and tap it
		await TestHelpers.tapByText('Got it!');
		// Check that Got it! CTA is visible and tap it
		await TestHelpers.tapByText('Got it!');
		// Check that Got it! CTA is visible and tap it
		await TestHelpers.tapByText('Got it!');
		// Check that Got it! CTA is visible and tap it
		await TestHelpers.tapByText('Got it!');
		// Check that we are on the Browser page
		await TestHelpers.checkIfVisible('browser-screen');
	});
});
