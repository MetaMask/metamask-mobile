import TestHelpers from '../helpers';

const container = 'metaMetrics-OptIn';
const agreeButton = 'agree-button';
const noThanksButton = 'cancel-button';
export default class MetaMetricsOptIn {
	static async tapAgreeButton() {
		await TestHelpers.waitAndTap(agreeButton);
	}

	static async tapNoThanksButton() {
		await TestHelpers.waitAndTap(noThanksButton);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(container);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(container);
	}
}
