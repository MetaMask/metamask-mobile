import { AssetWatcherSelectorsIDs } from '../../selectors/Transactions/AssetWatcher.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class AssetWatchBottomSheet {
  get cancelButton() {
    return Matchers.getElementByID(AssetWatcherSelectorsIDs.CANCEL_BUTTON);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }
}

export default new AssetWatchBottomSheet();
