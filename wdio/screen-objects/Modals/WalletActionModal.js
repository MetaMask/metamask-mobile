import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../../e2e/framework/AppwrightGestures';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../app/components/Views/WalletActions/WalletActionsBottomSheet.testIds';
import { expect as appwrightExpect } from 'appwright';

class WalletActionModal {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;

  }

  get sendButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, 'wallet-send-button');
    }
  }

  get receiveButton() {
    return Selectors.getElementByPlatform(WalletActionsBottomSheetSelectorsIDs.RECEIVE_BUTTON);
  }

  get swapButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON);
    }
  }

  get bridgeButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(WalletActionsBottomSheetSelectorsIDs.BRIDGE_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, WalletActionsBottomSheetSelectorsIDs.BRIDGE_BUTTON);
    }
  }

  get perpsButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON);
    }
  }

  get predictButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON);
    }
  }


  async isSendButtonVisible() {
    if (!this._device) {
      await expect(this.sendButton).toBeDisplayed();
    } else {
      const element = await this.sendButton;
      await appwrightExpect(element).toBeVisible({ timeout: 30000 });
    }
  }
  async tapSendButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.sendButton);
    } else {
      await AppwrightGestures.tap(await this.sendButton); 
    }
  }

  async tapReceiveButton() {
    await Gestures.waitAndTap(this.receiveButton);
  }

  async tapSwapButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.swapButton);
    } else {
      await AppwrightGestures.tap(await this.swapButton); 
    }
  }

  async tapBridgeButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.bridgeButton);
    } else {
      await AppwrightGestures.tap(await this.bridgeButton); 
    }
  }

  async tapPerpsButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.perpsButton);
    } else {
      await AppwrightGestures.tap(await this.perpsButton);
    }
  }

  async tapPredictButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.predictButton);
    } else {
      await AppwrightGestures.tap(await this.predictButton);
    }
  }
}

export default new WalletActionModal();
