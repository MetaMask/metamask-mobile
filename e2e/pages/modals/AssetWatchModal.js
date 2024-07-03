import { AssetWatcherSelectorsIDs } from '../../selectors/Modals/AssetWatcher.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class NetworkAddedModal {
  get cancelButton() {
    return Matchers.getElementByID(AssetWatcherSelectorsIDs.CANCEL_BUTTON);
  }
  get confirmButton() {
    return Matchers.getElementByID(AssetWatcherSelectorsIDs.CONFIRM_BUTTON);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }
  async tapConfirmButton() {
    await Gestures.waitAndTap(this.confirmButton);
  }
}

export default new NetworkAddedModal();
