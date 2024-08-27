import { SkipAccountSecurityModalSelectorsIDs } from '../../selectors/Modals/SkipAccountSecurityModal.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class SkipAccountSecurityModal {
  get container() {
    return Matchers.getElementByID(
      SkipAccountSecurityModalSelectorsIDs.CONTAINER,
    );
  }
  get iUnderstandCheckbox() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByID(
          SkipAccountSecurityModalSelectorsIDs.ANDROID_SKIP_BACKUP_BUTTON_ID,
        )
      : Matchers.getElementByID(
          SkipAccountSecurityModalSelectorsIDs.iOS_SKIP_BACKUP_BUTTON_ID,
        );
  }

  get skipButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(
          SkipAccountSecurityModalSelectorsIDs.SKIP_BUTTON,
        )
      : Matchers.getElementByID(
          SkipAccountSecurityModalSelectorsIDs.SKIP_BUTTON,
        );
  }

  async tapIUnderstandCheckBox() {
    await Gestures.waitAndTap(this.iUnderstandCheckbox);
  }

  async tapSkipButton() {
    await Gestures.waitAndTap(this.skipButton);
  }
}

export default new SkipAccountSecurityModal();
