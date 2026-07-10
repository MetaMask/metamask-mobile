import { AssetWatcherSelectorsIDs } from '../../../app/components/Views/confirmations/legacy/components/WatchAssetRequest/AssetWatcher.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework';

class AssetWatchBottomSheet {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(AssetWatcherSelectorsIDs.CONTAINER);
  }

  get cancelButton(): EncapsulatedElementType {
    return Matchers.getElementByID(AssetWatcherSelectorsIDs.CANCEL_BUTTON);
  }
  get confirmButton(): EncapsulatedElementType {
    return Matchers.getElementByID(AssetWatcherSelectorsIDs.CONFIRM_BUTTON);
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Button in Asset Watch Bottom Sheet',
    });
  }
  async tapAddTokenButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm Button in Asset Watch Bottom Sheet',
    });
  }
}

export default new AssetWatchBottomSheet();
