import TestHelpers from '../../../../helpers';

const REVEAL_SECRET_RECOVERY_PHRASE_BUTTON_ID = 'reveal-seed-button';
const SECURITY_SETTINGS_SCROLL_ID = 'security-settings-scrollview';
const CHANGE_PASSWORD_SECTION_ID = 'change-password-section';
const PRIVACY_MODE_SECTION_ID = 'privacy-mode-section';
const METAMETRICS_SWITCH_ID = 'metametrics-switch';
export default class SecurityAndPrivacy {
	static async tapRevealSecretRecoveryPhrase() {
		await TestHelpers.tap(REVEAL_SECRET_RECOVERY_PHRASE_BUTTON_ID);
	}

	static async scrollToBottomOfView() {
		// Scroll to the bottom
		if (device.getPlatform() === 'android') {
			await TestHelpers.swipe(SECURITY_SETTINGS_SCROLL_ID, 'up', 'fast');
			await TestHelpers.delay(1000);
		} else {
			await TestHelpers.swipe(CHANGE_PASSWORD_SECTION_ID, 'up', 'fast');
		}
		await TestHelpers.swipe(PRIVACY_MODE_SECTION_ID, 'up', 'fast');
	}

	static async tapOKAlertButton() {
		await TestHelpers.tapAlertWithButton('OK');
	}

	static async tapMetaMetricsToggle() {
		await TestHelpers.tap(METAMETRICS_SWITCH_ID);
	}

	static async isMetaMetricsToggleOn() {
		await TestHelpers.checkIfToggleIsOn(METAMETRICS_SWITCH_ID);
	}

	static async isMetaMetricsToggleOff() {
		await TestHelpers.checkIfToggleIsOff(METAMETRICS_SWITCH_ID);
	}
}
