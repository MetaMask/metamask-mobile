import Gestures from '../Gestures';

const SKIP_ACCOUNT_SECURITY_MODAL_CONTAINER_ID = 'skip-backup-modal';
const iOS_I_UNDERSTAND_BUTTON_ID = 'skip-backup-check';
const ANDROID_I_UNDERSTAND_BUTTON_ID = 'skip-backup-text';
const SKIP_ACCOUNT_SECURITY_BUTTON_ID = 'skip-backup-Button';
class SkipAccountSecurityModal {
  get SkipAccountSecurityModalContainer() {
    return $(`~${SKIP_ACCOUNT_SECURITY_MODAL_CONTAINER_ID}`);
  }

  async tapIUnderstandCheckBox() {
    await Gestures.tap(iOS_I_UNDERSTAND_BUTTON_ID);
  }

  // static async tapIUnderstandCheckBox() {
  //   if (device.getPlatform() === 'ios') {
  //     await TestHelpers.tap(iOS_I_UNDERSTAND_BUTTON_ID);
  //   } else {
  //     // Tap by the I understand text
  //     await TestHelpers.delay(1000);
  //     await TestHelpers.tap(ANDROID_I_UNDERSTAND_BUTTON_ID);
  //   }
  // }

  async tapSkipButton() {
    await Gestures.waitAndTap(SKIP_ACCOUNT_SECURITY_BUTTON_ID);
  }

  async isVisible() {
    await expect(this.SkipAccountSecurityModalContainer).toBeDisplayed();
  }

  async isNotVisible() {
    await expect(this.SkipAccountSecurityModalContainer).not.toBeDisplayed();
  }
}

export default new SkipAccountSecurityModal();
