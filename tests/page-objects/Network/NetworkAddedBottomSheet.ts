import {
  NetworkAddedBottomSheetSelectorsIDs,
  NetworkAddedBottomSheetSelectorsText,
} from '../../../app/components/UI/NetworkModal/NetworkAddedBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class NetworkAddedBottomSheet {
  get switchNetwork(): DetoxElement {
    return Matchers.getElementByText(
      NetworkAddedBottomSheetSelectorsText.SWITCH_NETWORK,
    );
  }

  get switchNetworkButton(): DetoxElement {
    return Matchers.getElementByID(
      NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
    );
  }

  get closeNetworkButton(): DetoxElement {
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
