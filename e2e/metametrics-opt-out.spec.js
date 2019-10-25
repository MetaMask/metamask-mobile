'use strict';
import TestHelpers from './helpers';

describe('MetaMetrics opt-out', () => {
	it('should be able to opt-out of MetaMetrics', async () => {
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
	});
});
