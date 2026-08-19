import { SkipAccountSecurityModalSelectorsIDs } from '../../../app/components/UI/SkipAccountSecurityModal/SkipAccountSecurityModal.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';
import { PlatformDetector } from '../../framework/PlatformLocator';

class SkipAccountSecurityModal {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      SkipAccountSecurityModalSelectorsIDs.CONTAINER,
    );
  }

  get iUnderstandCheckbox(): EncapsulatedElementType {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByID(
        SkipAccountSecurityModalSelectorsIDs.ANDROID_SKIP_BACKUP_BUTTON_ID,
      );
    }
    return Matchers.getElementByID(
      SkipAccountSecurityModalSelectorsIDs.iOS_SKIP_BACKUP_BUTTON_ID,
    );
  }

  get skipButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      SkipAccountSecurityModalSelectorsIDs.SKIP_BUTTON,
    );
  }

  get cancelButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      SkipAccountSecurityModalSelectorsIDs.CANCEL_BUTTON,
    );
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    await Gestures.waitAndTap(this.iUnderstandCheckbox, {
      elemDescription: 'Skip account security checkbox',
    });
  }

  async tapSkipButton(): Promise<void> {
    await Gestures.waitAndTap(this.skipButton, {
      elemDescription: 'Skip account security confirm button',
    });
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Skip account security cancel button',
    });
  }

  async proceedWithoutWalletSecure(): Promise<void> {
    await this.tapIUnderstandCheckBox();
    await this.tapSkipButton();
  }
}

export default new SkipAccountSecurityModal();
