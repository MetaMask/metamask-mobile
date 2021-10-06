import TestHelpers from '../../helpers';

const ONBOARDING_WIZARD_MODAL_CONTAINER_ID = 'onboarding-wizard-step1-view';
const NO_THANKS_BUTTON_ID = 'onboarding-wizard-back-button';
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
		await TestHelpers.waitAndTap(NO_THANKS_BUTTON_ID);
	}

	static async tapGotItButton() {
		await TestHelpers.tapByText('Got it!');
	}
	static async tapBackButton() {
		await TestHelpers.tapByText('Back');
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(ONBOARDING_WIZARD_MODAL_CONTAINER_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(ONBOARDING_WIZARD_MODAL_CONTAINER_ID);
	}
}
