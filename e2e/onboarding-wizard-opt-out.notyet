'use strict';
import TestHelpers from './helpers';

describe('Onboarding wizard opt-out', () => {
	it('should be able to opt-out of the onboarding-wizard', async () => {
		// Check that we are on the onboarding carousel screen
		await TestHelpers.checkIfVisible('onboarding-carousel-screen');
		// Check that Get started CTA is visible & tap it
		await TestHelpers.waitAndTap('onboarding-get-started-button');
		// Check that we are on the onboarding screen
		await TestHelpers.checkIfVisible('onboarding-screen');
		// Check that Start Exploring CTA is visible & tap it
		await TestHelpers.waitAndTap('start-exploring-button');
		// Check that we are on the MetaMetrics optIn screen
		await TestHelpers.checkIfVisible('metaMetrics-OptIn');
		// Check that "No thanks" CTA is visible and tap it
		await TestHelpers.waitAndTap('cancel-button');
		// Check that we are on the wallet screen
		await TestHelpers.checkIfExists('wallet-screen');
		// Check that the onboarding wizard is present
		await TestHelpers.checkIfVisible('onboarding-wizard-step1-view');
		// Check that No thanks CTA is visible and tap it
		await TestHelpers.waitAndTap('onboarding-wizard-back-button');
		// Check that the onboarding wizard is gone
		await TestHelpers.checkIfNotVisible('onboarding-wizard-step1-view');
		// Relaunch the app
		await device.reloadReactNative();
		// Check that we are on the Browser page
		await TestHelpers.checkIfVisible('browser-screen');
		// Check that the wizard is not visible anymore
		await TestHelpers.checkIfNotVisible('onboarding-wizard-step1-view');
	});

	it('should tap on take a tour on browser then skip tutorial', async () => {
		// Check that we are on the Browser page
		await TestHelpers.checkIfVisible('browser-screen');
		// Scroll to bottom of browser view
		await TestHelpers.swipe('browser-screen', 'up');
		// Tap on the Take a tour box
		await TestHelpers.tapAtPoint('browser-screen', { x: 215, y: 555 });
		// Check that we are on the wallet screen
		await TestHelpers.checkIfExists('wallet-screen');
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
