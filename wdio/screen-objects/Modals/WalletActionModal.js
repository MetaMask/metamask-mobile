import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import AppwrightGestures from '../../../appwright/utils/AppwrightGestures.js';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../e2e/selectors/wallet/WalletActionsBottomSheet.selectors';

class WalletActionModal extends AppwrightGestures {
  constructor() {
    super();
  }

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
    super.device = device; // Set device in parent class too
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
      await this.tap(this.sendButton); // Use inherited tapElement method with retry logic
    }
  }

  async tapReceiveButton() {
    await Gestures.waitAndTap(this.receiveButton);
  }

  async tapSwapButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.swapButton);
    } else {
      await this.tap(this.swapButton); // Use inherited tapElement method with retry logic
    }
  }

  async tapBridgeButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.bridgeButton);
    } else {
      await this.tap(this.bridgeButton); // Use inherited tapElement method with retry logic
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
