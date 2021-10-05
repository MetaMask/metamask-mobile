import TestHelpers from '../../helpers';

const container = 'onboarding-wizard-step1-view';
const noThanksButton = 'onboarding-wizard-back-button';
/*
		const takeTourButton = 'onboarding-wizard-next-button';
		const secondStep = 'step2-title';
		const thirdStep = 'step3-title';
		const fourthStep = 'step4-title';
		const fifthStep = 'step5-title';
		const sixStep = 'step6-title';
*/
export default class OnboardingWizardModal {
	static async tapNoThanksButton() {
		await TestHelpers.waitAndTap(noThanksButton);
	}

	static async tapGotItButton() {
		await TestHelpers.tapByText('Got it!');
	}
	static async tapBackButton() {
		await TestHelpers.tapByText('Back');
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(container);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(container);
	}
}
