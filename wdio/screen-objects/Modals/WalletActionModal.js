import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures';
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
      return AppwrightSelectors.getElementByCatchAll(this._device, 'Trade perps contracts');
    }
  }

  get predictButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON);
    } else {
      return AppwrightSelectors.getElementByCatchAll(this._device, 'Trade on real-world events');
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
    const element = await this.perpsButton;
    await appwrightExpect(element).toBeVisible();
    await AppwrightGestures.tap(element, { expectScreenChange: true });
  }

  async tapPredictButton() {
    const element = await this.predictButton;
    await appwrightExpect(element).toBeVisible();
    await AppwrightGestures.tap(element, { expectScreenChange: true });
  }

  async checkModalVisibility() {
    const element = await this.perpsButton;
    await appwrightExpect(element).toBeVisible();
  }
}

export default new WalletActionModal();
