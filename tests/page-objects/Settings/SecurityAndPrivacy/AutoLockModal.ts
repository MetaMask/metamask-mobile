import Matchers from '../../../framework/Matchers.ts';
import Gestures from '../../../framework/Gestures.ts';
import { AutoLockModalSelectorsText } from '../../../selectors/Settings/SecurityAndPrivacy/AutoLockModal.selectors.ts';

class AutoLockModal {
  get autoLockImmediate(): DetoxElement {
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
