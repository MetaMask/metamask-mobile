import Matchers from '../../../framework/Matchers';
import { AutoLockModalSelectorsText } from '../../../selectors/Settings/SecurityAndPrivacy/AutoLockModal.selectors';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class AutoLockModal {
  get autoLockImmediate(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          AutoLockModalSelectorsText.AUTO_LOCK_IMMEDIATE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          AutoLockModalSelectorsText.AUTO_LOCK_IMMEDIATE,
        ),
    });
  }

  async tapAutoLockImmediately(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.autoLockImmediate, {
      elemDescription: 'Auto lock immediate',
    });
  }
}

export default new AutoLockModal();
