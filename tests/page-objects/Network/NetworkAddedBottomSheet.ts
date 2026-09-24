import {
  NetworkAddedBottomSheetSelectorsIDs,
  NetworkAddedBottomSheetSelectorsText,
} from '../../../app/components/UI/NetworkModal/NetworkAddedBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { type AppiumElement } from '../../framework';

class NetworkAddedBottomSheet {
  get switchNetwork(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      NetworkAddedBottomSheetSelectorsText.SWITCH_NETWORK,
    );
  }

  get switchNetworkButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
    );
  }

  get closeNetworkButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      NetworkAddedBottomSheetSelectorsIDs.CLOSE_NETWORK_BUTTON,
    );
  }

  async tapSwitchToNetwork(): Promise<void> {
    await Gestures.waitAndTap(this.switchNetworkButton, {
      elemDescription: 'Switch Network Button in Network Added Bottom Sheet',
    });
  }

  async tapCloseButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeNetworkButton, {
      elemDescription: 'Close Network Button in Network Added Bottom Sheet',
    });
  }
}

export default new NetworkAddedBottomSheet();
