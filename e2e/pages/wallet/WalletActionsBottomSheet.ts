import { WalletActionsBottomSheetSelectorsIDs } from '../../../app/components/Views/WalletActions/WalletActionsBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

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

  get perpsButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON,
    );
  }
  get predictButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON,
    );
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
    await Gestures.waitAndTap(this.perpsButton);
  }

  async tapPredictButton(): Promise<void> {
    await Gestures.waitAndTap(this.predictButton);
  }

  async swipeDownActionsBottomSheet(): Promise<void> {
    await Gestures.swipe(this.sendButton, 'down', {
      speed: 'fast',
    });
  }
}

export default new WalletActionsBottomSheet();
