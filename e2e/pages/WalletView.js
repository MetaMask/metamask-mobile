import TestHelpers from '../helpers';

import {
  IMPORT_NFT_BUTTON_ID,
  IMPORT_TOKEN_BUTTON_ID,
  NAVBAR_NETWORK_BUTTON,
  NAVBAR_NETWORK_TEXT,
  NFT_TAB_CONTAINER_ID,
  WALLET_ACCOUNT_ICON,
  WALLET_ACCOUNT_NAME_LABEL_INPUT,
} from '../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import {
  WalletViewSelectorsIDs,
  WalletViewSelectorsText,
} from '../selectors/wallet/WalletView.selectors';
import { CommonSelectorsText } from '../selectors/Common.selectors';
import Gestures from '../utils/Gestures';
import Matchers from '../utils/Matchers';

class WalletView {
  get container() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_CONTAINER);
  }

  get portfolioButton() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.PORTFOLIO_BUTTON);
  }

  get tokenDetectionLinkButton() {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.WALLET_TOKEN_DETECTION_LINK_BUTTON,
    );
  }

  async tapOKAlertButton() {
    await TestHelpers.tapAlertWithButton(CommonSelectorsText.OK_ALERT_BUTTON); // system alert.
  }

  async tapOnToken(token) {
    await TestHelpers.waitAndTapText(
      token || WalletViewSelectorsText.DEFAULT_TOKEN,
    );
  }

  async tapIdenticon() {
    await TestHelpers.waitAndTap(WALLET_ACCOUNT_ICON);
  }

  async tapNetworksButtonOnNavBar() {
    await TestHelpers.waitAndTap(NAVBAR_NETWORK_BUTTON);
  }

  async isConnectedNetwork(value) {
    await TestHelpers.checkIfHasText(NAVBAR_NETWORK_TEXT, value);
  }

  async tapNftTab() {
    await TestHelpers.tapByText(WalletViewSelectorsText.NFTS_TAB);
  }

  async tapTokensTab() {
    await TestHelpers.tapByText(WalletViewSelectorsText.TOKENS_TAB);
  }

  async scrollDownOnNFTsTab() {
    await TestHelpers.swipe(NFT_TAB_CONTAINER_ID, 'up', 'slow', 0.6);
  }

  async scrollUpOnNFTsTab() {
    await TestHelpers.swipe(NFT_TAB_CONTAINER_ID, 'down', 'slow', 0.6);
  }

  async tapImportNFTButton() {
    await TestHelpers.tap(IMPORT_NFT_BUTTON_ID);
  }

  async tapImportTokensButton() {
    await TestHelpers.delay(2000);
    if (device.getPlatform() === 'android') {
      await TestHelpers.tapByText(WalletViewSelectorsText.IMPORT_TOKENS);
    } else {
      await TestHelpers.tap(IMPORT_TOKEN_BUTTON_ID);
    }
  }

  async tapOnNFTInWallet(nftName) {
    await TestHelpers.tapByText(nftName);
  }

  async removeTokenFromWallet(token) {
    await element(by.text(token)).longPress();
    await TestHelpers.tapByText(WalletViewSelectorsText.HIDE_TOKENS);
  }

  async isVisible() {
    if (!device.getPlatform() === 'android') {
      // Check that we are on the wallet screen
      await TestHelpers.checkIfExists(WalletViewSelectorsIDs.WALLET_CONTAINER);
    }
  }

  async isTokenVisibleInWallet(tokenName) {
    await TestHelpers.checkIfElementByTextIsVisible(tokenName);
  }

  async tokenIsNotVisibleInWallet(tokenName) {
    await TestHelpers.checkIfElementWithTextIsNotVisible(tokenName);
  }

  async isNFTVisibleInWallet(nftName) {
    await TestHelpers.checkIfElementByTextIsVisible(nftName);
  }

  async isNFTNameVisible(nftName) {
    await TestHelpers.checkIfElementHasString(
      WalletViewSelectorsIDs.NFT_CONTAINER,
      nftName,
    );
  }

  async isNetworkNameVisible(networkName) {
    await TestHelpers.checkIfElementHasString(
      WalletViewSelectorsIDs.NETWORK_NAME,
      networkName,
    );
  }

  async isAccountNameCorrect(accountName) {
    await TestHelpers.checkIfElementHasString(
      WALLET_ACCOUNT_NAME_LABEL_INPUT,
      accountName,
    );
  }

  async tapNewTokensFound() {
    await Gestures.waitAndTap(this.tokenDetectionLinkButton);
  }

  async tapPortfolio() {
    await Gestures.waitAndTap(this.portfolioButton);
  }
}

export default new WalletView();
