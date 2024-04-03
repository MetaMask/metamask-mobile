import TestHelpers from '../helpers';

import {
  WalletViewSelectorsIDs,
  WalletViewSelectorsText,
} from '../selectors/WalletView.selectors';
import { CommonSelectorsText } from '../selectors/Common.selectors';
import Matchers from '../utils/Matchers';
import Gestures from '../utils/Gestures';

class WalletView {
  get oKAlertButton() {
    return Matchers.getElementByID(CommonSelectorsText.OK_ALERT_BUTTON); // system alert.
  }

  get accountIdenticon() {
    return Gestures.getElementByID(WalletViewSelectorsIDs.WALLET_ACCOUNT_ICON);
  }

  get importNFTButton() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.IMPORT_NFT_BUTTON_ID);
  }

  get importTokensButton() {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON_ID,
    );
  }

  get navbarNetworkButton() {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.NAVBAR_NETWORK_BUTTON,
    );
  }

  get navbarNetworkText() {
    return Matchers.getElementByText(
      WalletViewSelectorsIDs.NAVBAR_NETWORK_TEXT,
    );
  }

  get nftTabContainer() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.NFT_TAB_CONTAINER_ID);
  }

  get walletAccountNameLabelInput() {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.WALLET_ACCOUNT_NAME_LABEL_INPUT,
    );
  }

  get walletAccountNameLabelText() {
    return Matchers.getElementByText(
      WalletViewSelectorsIDs.WALLET_ACCOUNT_NAME_LABEL_TEXT,
    );
  }

  async tapOnToken(token) {
    const token = await Matchers.getElementByText(token);
    await Gestures.waitAndTap(token);
  }

  async tapIdenticon() {
    await Gestures.waitAndTap(this.accountIdenticon);
  }

  async tapOKAlertButton() {
    await Gestures.tap(this.oKAlertButton); // system alert.
  }

  async tapImportNFTButton() {
    await Gestures.tap(this.importNFTButton);
  }

  async tapImportTokensButton() {
    await TestHelpers.delay(2000);
    if (device.getPlatform() === 'android') {
      await Gestures.tap(WalletViewSelectorsText.IMPORT_TOKENS);
    } else {
      await Gestures.tap(this.importTokensButton);
    }
  }

  async tapNetworksButtonOnNavBar() {
    await Gestures.tap(this.navbarNetworkButton);
  }

  async tapNftTab() {
    await Gestures.tap(WalletViewSelectorsText.NFTS_TAB);
  }

  async tapTokensTab() {
    await Gestures.tap(WalletViewSelectorsText.TOKENS_TAB);
  }

  async scrollDownOnNFTsTab() {
    await Gestures.swipe(this.nftTabContainer, 'up', 'slow', 0.6);
  }

  async scrollUpOnNFTsTab() {
    await Gestures.swipe(this.nftTabContainer, 'down', 'slow', 0.6);
  }

  async tapOnNFTInWallet(nftName) {
    await Gestures.tap(nftName);
  }

  async removeTokenFromWallet(token) {
    const token = await Matchers.getElementByText(token);
    await Gestures.tapAndLongPress(token);
    await Gestures.tap(WalletViewSelectorsText.HIDE_TOKENS);
  }

  async editAccountName(accountName) {
    if (device.getPlatform() === 'android') {
      await Gestures.tapAndLongPress(this.walletAccountNameLabelText);
      await Gestures.clearField(this.walletAccountNameLabelInput);
      await Gestures.replaceTextInField(
        this.walletAccountNameLabelInput,
        accountName,
      );
      await Gestures.tapReturnKey();
    }
  }

  async isConnectedNetwork(value) {
    await Gestures.checkIfHasText(this.navbarNetworkText, value);
  }
}

export default WalletView;
