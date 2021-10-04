import TestHelpers from '../helpers';

export default class MetaMetricsOptIn {
	constructor() {
		this.container = 'metaMetrics-OptIn-screen';
		this.agreeButton = 'agree-button';
		this.noThanksButton = 'cancel-button';
	}

	async tapAgreeButton() {
		await TestHelpers.waitAndTap('agree-button');
	}

	async tapNoThanksButton() {
		await TestHelpers.waitAndTap('cancel-button');
	}

	async isVisible() {
		await TestHelpers.checkIfVisible(this.container);
	}

	async isNotVisible() {
		await TestHelpers.checkIfNotVisible(this.container);
	}
}
