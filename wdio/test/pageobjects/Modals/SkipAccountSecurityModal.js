import TestHelpers from '../../helpers';

const SKIP_ACCOUNT_SECURITY_MODAL_CONTAINER_ID = 'skip-backup-modal';
const iOS_I_UNDERSTAND_BUTTON_ID = 'skip-backup-check';
const ANDROID_I_UNDERSTAND_BUTTON_ID = 'skip-backup-text';
export default class SkipAccountSecurityModal {
  static async tapIUnderstandCheckBox() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.tap(iOS_I_UNDERSTAND_BUTTON_ID);
    } else {
      // Tap by the I understand text
      await TestHelpers.delay(1000);
      await TestHelpers.tap(ANDROID_I_UNDERSTAND_BUTTON_ID);
    }
  }

  static async tapSkipButton() {
    await TestHelpers.tapByText('Skip');
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(SKIP_ACCOUNT_SECURITY_MODAL_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(
      SKIP_ACCOUNT_SECURITY_MODAL_CONTAINER_ID,
    );
  }
}
