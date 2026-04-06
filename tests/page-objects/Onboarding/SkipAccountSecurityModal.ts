import { SkipAccountSecurityModalSelectorsIDs } from '../../../app/components/UI/SkipAccountSecurityModal/SkipAccountSecurityModal.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SkipAccountSecurityModal {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(SkipAccountSecurityModalSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SkipAccountSecurityModalSelectorsIDs.CONTAINER,
          { exact: true },
        ),
    });
  }

  get iUnderstandCheckbox(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        device.getPlatform() === 'android'
          ? Matchers.getElementByID(
              SkipAccountSecurityModalSelectorsIDs.ANDROID_SKIP_BACKUP_BUTTON_ID,
            )
          : Matchers.getElementByID(
              SkipAccountSecurityModalSelectorsIDs.iOS_SKIP_BACKUP_BUTTON_ID,
            ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            SkipAccountSecurityModalSelectorsIDs.ANDROID_SKIP_BACKUP_BUTTON_ID,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementById(
            SkipAccountSecurityModalSelectorsIDs.iOS_SKIP_BACKUP_BUTTON_ID,
            { exact: true },
          ),
      },
    });
  }

  get skipButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SkipAccountSecurityModalSelectorsIDs.SKIP_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SkipAccountSecurityModalSelectorsIDs.SKIP_BUTTON,
          { exact: true },
        ),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SkipAccountSecurityModalSelectorsIDs.CANCEL_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SkipAccountSecurityModalSelectorsIDs.CANCEL_BUTTON,
          { exact: true },
        ),
    });
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.iUnderstandCheckbox, {
      description: 'Skip account security checkbox',
    });
  }

  async tapSkipButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.skipButton, {
      description: 'Skip account security confirm button',
    });
  }

  async tapCancelButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButton, {
      description: 'Skip account security cancel button',
    });
  }

  async proceedWithoutWalletSecure(): Promise<void> {
    await this.tapIUnderstandCheckBox();
    await this.tapSkipButton();
  }
}

export default new SkipAccountSecurityModal();
