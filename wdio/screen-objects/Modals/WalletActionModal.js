import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../e2e/selectors/wallet/WalletActionsBottomSheet.selectors';

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

  async tapSendButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.sendButton);
    } else {
      const element = await this.sendButton;
      await element.tap();
    }
  }

  async tapReceiveButton() {
    await Gestures.waitAndTap(this.receiveButton);
  }

  async tapSwapButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.swapButton);
    } else {
      const element = await this.swapButton;
      await element.tap();
    }
  }

  async tapBridgeButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.bridgeButton);
    } else {
      const element = await this.bridgeButton;
      await element.tap();
    }
  }

  async tapPerpsButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.perpsButton);
    } else {
      const element = await this.perpsButton;
      await element.tap();
    }
  }
}

export default new WalletActionModal();
