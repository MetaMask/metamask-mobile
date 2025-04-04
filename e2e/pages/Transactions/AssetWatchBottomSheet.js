import { AssetWatcherSelectorsIDs } from '../../selectors/Transactions/AssetWatcher.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class AssetWatchBottomSheet {
  get container() {
    return Matchers.getElementByID(AssetWatcherSelectorsIDs.CONTAINER);
  }

  get cancelButton() {
    return Matchers.getElementByID(AssetWatcherSelectorsIDs.CANCEL_BUTTON);
  }
  get confirmButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(AssetWatcherSelectorsIDs.CONFIRM_BUTTON)
      : Matchers.getElementByID(AssetWatcherSelectorsIDs.CONFIRM_BUTTON);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }
  async tapAddTokenButton() {
    await Gestures.waitAndTap(this.confirmButton);
  }
}

export default new AssetWatchBottomSheet();
