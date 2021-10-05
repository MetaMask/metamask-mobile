import TestHelpers from '../../helpers';

const container = 'onboarding-carousel-screen';
const getStartedButton = 'onboarding-get-started-button';

export default class OnboardingCarouselView {
	static async tapOnGetStartedButton() {
		await TestHelpers.waitAndTap(getStartedButton);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(container);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(container);
	}
}
