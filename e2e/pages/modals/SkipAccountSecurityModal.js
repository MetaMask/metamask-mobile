import TestHelpers from '../../helpers';

const container = 'skip-backup-modal';
const iosIUnderstandButton = 'skip-backup-check';
const androidIUnderstandButton = 'skip-backup-text';
const skipButton = 'Skip';
export default class SkipAccountSecurityModal {
	static async tapIUnderstandCheckBox() {
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap(iosIUnderstandButton);
		} else {
			// Tap by the I understand text
			await TestHelpers.delay(1000);
			await TestHelpers.tap(androidIUnderstandButton);
		}
	}

	static async tapSkipButton() {
		await TestHelpers.tapByText(skipButton);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(container);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(container);
	}
}
