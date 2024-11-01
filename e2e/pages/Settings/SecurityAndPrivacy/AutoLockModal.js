import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';
import { AutoLockModalSelectorsText } from '../../../selectors/Settings/SecurityAndPrivacy/AutoLockModal.selectors';

class AutoLockModal {
  get autoLockImmediate() {
    return Matchers.getElementByText(
      AutoLockModalSelectorsText.AUTO_LOCK_IMMEDIATE,
    );
  }

  async tapAutoLockImmediately() {
    await Gestures.waitAndTap(this.autoLockImmediate);
  }
}

export default new AutoLockModal();
