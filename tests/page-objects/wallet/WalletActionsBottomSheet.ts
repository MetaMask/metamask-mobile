import { WalletActionsBottomSheetSelectorsIDs } from '../../../app/components/Views/WalletActions/WalletActionsBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import type { AppiumElement } from '../../framework/AppiumElement';

class WalletActionsBottomSheet {
  get sendButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON,
    );
  }

  get receiveButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.RECEIVE_BUTTON,
    );
  }

  get swapButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON,
    );
  }

  get bridgeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.BRIDGE_BUTTON,
    );
  }

  get buyButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
    );
  }

  get sellButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
    );
  }

  get perpsButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON,
    );
  }

  get predictButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON,
    );
  }

  async tapSendButton(): Promise<void> {
    await Gestures.waitAndTap(this.sendButton, {
      elemDescription: 'Send button',
    });
  }

  async tapReceiveButton(): Promise<void> {
    await Gestures.waitAndTap(this.receiveButton, {
      elemDescription: 'Receive button',
    });
  }

  async tapSwapButton(): Promise<void> {
    await Gestures.waitAndTap(this.swapButton, {
      delay: 1000,
      elemDescription: 'Swap button',
    });
  }

  async tapBridgeButton(): Promise<void> {
    await Gestures.waitAndTap(this.bridgeButton, {
      delay: 1000,
      elemDescription: 'Bridge button',
    });
  }

  async tapBuyButton(): Promise<void> {
    await Gestures.waitAndTap(this.buyButton, {
      elemDescription: 'Buy button',
    });
  }

  async tapSellButton() {
    await Gestures.waitAndTap(this.sellButton, {
      elemDescription: 'Sell button',
    });
  }

  async tapPerpsButton(): Promise<void> {
    await Gestures.waitAndTap(this.perpsButton, {
      elemDescription: 'Perps Button',
    });
  }

  async tapPredictButton(): Promise<void> {
    await Gestures.waitAndTap(this.predictButton, {
      elemDescription: 'Predict Button',
    });
  }

  // We would need to update this as assertions should not live in page objects
  async checkModalVisibility(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.perpsButton, {
      timeout: 5000,
      description: 'Wallet actions bottom sheet should be visible',
    });
  }

  async swipeDownActionsBottomSheet(): Promise<void> {
    await Gestures.swipe(this.sendButton, 'down', {
      speed: 'fast',
      elemDescription: 'Wallet actions bottom sheet swipe down',
    });
  }
}

export default new WalletActionsBottomSheet();
