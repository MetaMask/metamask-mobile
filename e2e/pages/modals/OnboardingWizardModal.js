import TestHelpers from '../../helpers';

export default class OnboardingWizardModal {
	constructor() {
		this.container = 'onboarding-wizard-step1-view';
		this.nextButton = 'onboarding-wizard-next-button';
		this.backButton = 'onboarding-wizard-back-button';
		this.secondStep = 'step2-title';
		this.thirdStep = 'step3-title';
		this.fourthStep = 'step4-title';
		this.fifthStep = 'step5-title';
		this.sixStep = 'step6-title';
	}

	async tapGotItButton() {
		await TestHelpers.tapByText('Got it!');
	}
	async tapBackButton() {
		await TestHelpers.tapByText('Back');
	}
}
