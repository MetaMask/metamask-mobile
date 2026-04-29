import { WalletActionsBottomSheetSelectorsIDs } from '../../../app/components/Views/WalletActions/WalletActionsBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { encapsulatedAction } from '../../framework/encapsulatedAction';

class WalletActionsBottomSheet {
  get sendButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON,
    );
  }

  get receiveButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.RECEIVE_BUTTON,
    );
  }

  get swapButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON,
    );
  }

  get bridgeButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.BRIDGE_BUTTON,
    );
  }

  get buyButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
    );
  }

  get sellButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
    );
  }

  get perpsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON,
          { exact: true },
        ),
    });
  }

  get predictButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON,
          { exact: true },
        ),
    });
  }

  async tapSendButton(): Promise<void> {
    await Gestures.waitAndTap(this.sendButton);
  }

  async tapReceiveButton(): Promise<void> {
    await Gestures.waitAndTap(this.receiveButton);
  }

  async tapSwapButton(): Promise<void> {
    await Gestures.waitAndTap(this.swapButton, {
      delay: 1000,
    });
  }

  async tapBridgeButton(): Promise<void> {
    await Gestures.waitAndTap(this.bridgeButton, {
      delay: 1000,
    });
  }

  async tapBuyButton(): Promise<void> {
    await Gestures.waitAndTap(this.buyButton);
  }

  async tapSellButton() {
    await Gestures.waitAndTap(this.sellButton);
  }

  async tapPerpsButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.perpsButton, {
      description: 'Perps Button',
    });
  }

  async tapPredictButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.predictButton, {
      description: 'Predict Button',
    });
  }
  // We would need to update this as assertions should not live in page objects
  async checkModalVisibility(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const resolved = await asPlaywrightElement(this.perpsButton);
        await resolved.waitForDisplayed({ timeout: 5000 });
      },
    });
  }

  async swipeDownActionsBottomSheet(): Promise<void> {
    await Gestures.swipe(this.sendButton, 'down', {
      speed: 'fast',
    });
  }
}

export default new WalletActionsBottomSheet();
