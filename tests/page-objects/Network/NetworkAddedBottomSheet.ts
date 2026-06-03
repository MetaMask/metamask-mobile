import {
  NetworkAddedBottomSheetSelectorsIDs,
  NetworkAddedBottomSheetSelectorsText,
} from '../../../app/components/UI/NetworkModal/NetworkAddedBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class NetworkAddedBottomSheet {
  get switchNetwork(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          NetworkAddedBottomSheetSelectorsText.SWITCH_NETWORK,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          NetworkAddedBottomSheetSelectorsText.SWITCH_NETWORK,
        ),
    });
  }

  get switchNetworkButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
        ),
    });
  }

  get closeNetworkButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NetworkAddedBottomSheetSelectorsIDs.CLOSE_NETWORK_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworkAddedBottomSheetSelectorsIDs.CLOSE_NETWORK_BUTTON,
        ),
    });
  }

  async tapSwitchToNetwork(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.switchNetworkButton, {
      elemDescription: 'Switch Network Button in Network Added Bottom Sheet',
    });
  }

  async tapCloseButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.closeNetworkButton, {
      elemDescription: 'Close Network Button in Network Added Bottom Sheet',
    });
  }
}

export default new NetworkAddedBottomSheet();
