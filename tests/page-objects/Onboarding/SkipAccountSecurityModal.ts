import { SkipAccountSecurityModalSelectorsIDs } from '../../../app/components/UI/SkipAccountSecurityModal/SkipAccountSecurityModal.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class SkipAccountSecurityModal {
  get iUnderstandCheckbox(): DetoxElement {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByID(
          SkipAccountSecurityModalSelectorsIDs.ANDROID_SKIP_BACKUP_BUTTON_ID,
        )
      : Matchers.getElementByID(
          SkipAccountSecurityModalSelectorsIDs.iOS_SKIP_BACKUP_BUTTON_ID,
        );
  }

  get skipButton(): DetoxElement {
    return Matchers.getElementByID(
      SkipAccountSecurityModalSelectorsIDs.SKIP_BUTTON,
    );
  }

  get cancelButton(): DetoxElement {
    return Matchers.getElementByID(
      SkipAccountSecurityModalSelectorsIDs.CANCEL_BUTTON,
    );
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    await Gestures.waitAndTap(this.iUnderstandCheckbox);
  }

  async tapSkipButton(): Promise<void> {
    await Gestures.waitAndTap(this.skipButton);
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton);
  }
}

export default new SkipAccountSecurityModal();
