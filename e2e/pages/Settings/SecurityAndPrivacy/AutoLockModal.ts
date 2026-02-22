import Matchers from '../../../../tests/framework/Matchers';
import Gestures from '../../../../tests/framework/Gestures';
import { AutoLockModalSelectorsText } from '../../../selectors/Settings/SecurityAndPrivacy/AutoLockModal.selectors';

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
