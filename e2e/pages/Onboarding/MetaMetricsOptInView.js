import TestHelpers from '../../helpers';

const METAMETRICS_OPT_IN_CONTAINER_ID = 'metaMetrics-OptIn';
const AGREE_BUTTON_ID = 'agree-button';
const NO_THANKS_BUTTON_ID = 'cancel-button';
export default class MetaMetricsOptIn {
	static async tapAgreeButton() {
		await TestHelpers.waitAndTap(AGREE_BUTTON_ID);
	}

	static async tapNoThanksButton() {
		await TestHelpers.waitAndTap(NO_THANKS_BUTTON_ID);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(METAMETRICS_OPT_IN_CONTAINER_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(METAMETRICS_OPT_IN_CONTAINER_ID);
	}
}
