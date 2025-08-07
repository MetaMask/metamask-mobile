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
    return Selectors.getElementByPlatform(WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON);
  }

  get receiveButton() {
    return Selectors.getElementByPlatform(WalletActionsBottomSheetSelectorsIDs.RECEIVE_BUTTON);
  }

  get swapButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON);
    } else {
      return AppwrightSelectors.getElementByResourceId(this._device, 'wallet-swap-button');
    }
  }

  async tapSendButton() {
    await Gestures.waitAndTap(this.sendButton);
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
}

export default new WalletActionModal();
