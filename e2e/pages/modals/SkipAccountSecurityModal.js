import TestHelpers from '../../helpers';

export default class SkipAccountSecurity {
	constructor() {
		this.container = 'skip-backup-modal';
		this.iosIUnderstandButton = 'skip-backup-check';
		this.androidIUnderstandButton = 'skip-backup-text';
		this.skipButton = 'Skip';
	}

	async tapIUnderstandCheckBox() {
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap(this.iosIUnderstandButton);
		} else {
			// Tap by the I understand text
			await TestHelpers.delay(1000);
			await TestHelpers.tap(this.androidIUnderstandButton);
		}
	}

	async tapSkipButton() {
		await TestHelpers.tapByText(this.skipButton);
	}

	async isVisible() {
		await TestHelpers.checkIfVisible(this.container);
	}

	async isNotVisible() {
		await TestHelpers.checkIfNotVisible(this.container);
	}
}
