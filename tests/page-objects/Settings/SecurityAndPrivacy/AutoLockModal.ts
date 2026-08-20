import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import { AutoLockModalSelectorsText } from '../../../selectors/Settings/SecurityAndPrivacy/AutoLockModal.selectors';
import { EncapsulatedElementType } from '../../../framework';

class AutoLockModal {
  get autoLockImmediate(): EncapsulatedElementType {
    return Matchers.getElementByText(
      AutoLockModalSelectorsText.AUTO_LOCK_IMMEDIATE,
    );
  }

  async tapAutoLockImmediately(): Promise<void> {
    await Gestures.waitAndTap(this.autoLockImmediate, {
      elemDescription: 'Auto lock immediate',
    });
  }
}

export default new AutoLockModal();
