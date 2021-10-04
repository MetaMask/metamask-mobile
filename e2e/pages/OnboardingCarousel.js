import TestHelpers from '../helpers';

export default class OnboardingCarousel {
	constructor() {
		this.container = 'onboarding-carousel-screen';
		this.getStartedButton = 'onboarding-get-started-button';
	}

	async tapOnGetStartedButton() {
		await TestHelpers.waitAndTap(this.getStartedButton);
	}

	async isVisible() {
		await TestHelpers.checkIfVisible(this.container);
	}

	async isNotVisible() {
		await TestHelpers.checkIfNotVisible(this.container);
	}
}
