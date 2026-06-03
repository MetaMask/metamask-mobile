import { AssetWatcherSelectorsIDs } from '../../../app/components/Views/confirmations/legacy/components/WatchAssetRequest/AssetWatcher.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class AssetWatchBottomSheet {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AssetWatcherSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(AssetWatcherSelectorsIDs.CONTAINER),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AssetWatcherSelectorsIDs.CANCEL_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AssetWatcherSelectorsIDs.CANCEL_BUTTON,
        ),
    });
  }
  get confirmButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AssetWatcherSelectorsIDs.CONFIRM_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AssetWatcherSelectorsIDs.CONFIRM_BUTTON,
        ),
    });
  }

  async tapCancelButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Button in Asset Watch Bottom Sheet',
    });
  }
  async tapAddTokenButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm Button in Asset Watch Bottom Sheet',
    });
  }
}

export default new AssetWatchBottomSheet();
