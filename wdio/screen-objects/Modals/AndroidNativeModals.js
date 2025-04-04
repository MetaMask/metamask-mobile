import Selectors from '../../helpers/Selectors';
import { ANDROID_SHARE_MODAL } from '../testIDs/Components/AndroidNativeModals.testIds';

class AndroidNativeModals {
  get shareModal() {
    return Selectors.getXpathElementByResourceId(ANDROID_SHARE_MODAL);
  }

  async isShareModalDisabled() {
    await expect(this.shareModal).toBeDisplayed();
  }
}

export default new AndroidNativeModals();
