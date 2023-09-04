import TestHelpers from '../helpers';

import {
  IMPORT_NFT_BUTTON_ID,
  IMPORT_TOKEN_BUTTON_ID,
  NAVBAR_NETWORK_BUTTON,
  NAVBAR_NETWORK_TEXT,
  NFT_TAB_CONTAINER_ID,
  SEND_BUTTON_ID,
  WALLET_ACCOUNT_ICON,
  WALLET_ACCOUNT_NAME_LABEL_INPUT,
  WALLET_ACCOUNT_NAME_LABEL_TEXT,
} from '../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import { NOTIFICATION_TITLE } from '../../wdio/screen-objects/testIDs/Components/Notification.testIds';
import messages from '../../locales/languages/en.json';

const WALLET_CONTAINER_ID = 'wallet-screen';
const NETWORK_NAME_TEXT_ID = 'network-name';
const NFT_CONTAINER_ID = 'collectible-name';

const IMPORT_TOKENS_TEXT = `${messages.wallet.no_available_tokens} ${messages.wallet.add_tokens}`;
const NFTS_TAB_TEXT = messages.wallet.collectibles;
const TOKENS_TAB_TEXT = messages.wallet.tokens;
const HIDE_TOKENS_TEXT = messages.wallet.remove;

export default class WalletView {
  static async tapOKAlertButton() {
    await TestHelpers.tapAlertWithButton('OK'); // system alert.
  }

  static async tapOnToken(token) {
    await TestHelpers.tapByText(token);
  }

  static async tapIdenticon() {
    await TestHelpers.waitAndTap(WALLET_ACCOUNT_ICON);
  }

  static async tapSendIcon() {
    await TestHelpers.waitAndTap(SEND_BUTTON_ID);
  }

  static async tapNetworksButtonOnNavBar() {
    await TestHelpers.waitAndTap(NAVBAR_NETWORK_BUTTON);
  }

  static async isConnectedNetwork(value) {
    await TestHelpers.checkIfHasText(NAVBAR_NETWORK_TEXT, value);
  }

  static async tapNftTab() {
    await TestHelpers.tapByText(NFTS_TAB_TEXT);
  }

  static async tapTokensTab() {
    await TestHelpers.tapByText(TOKENS_TAB_TEXT);
  }

  static async scrollDownOnNFTsTab() {
    await TestHelpers.swipe(NFT_TAB_CONTAINER_ID, 'up', 'slow', 0.6);
  }

  static async scrollUpOnNFTsTab() {
    await TestHelpers.swipe(NFT_TAB_CONTAINER_ID, 'down', 'slow', 0.6);
  }

  static async tapImportNFTButton() {
    await TestHelpers.tap(IMPORT_NFT_BUTTON_ID);
  }

  static async tapImportTokensButton() {
    await TestHelpers.delay(2000);
    if (device.getPlatform() === 'android') {
      await TestHelpers.tapByText(IMPORT_TOKENS_TEXT);
    } else {
      await TestHelpers.tap(IMPORT_TOKEN_BUTTON_ID);
    }
  }

  static async tapOnNFTInWallet(nftName) {
    await TestHelpers.tapByText(nftName);
  }

  static async removeTokenFromWallet(token) {
    await element(by.text(token)).longPress();
    await TestHelpers.tapByText(HIDE_TOKENS_TEXT);
  }

  static async editAccountName(accountName) {
    // For now this method only works for android.
    if (device.getPlatform() === 'android') {
      await TestHelpers.tapAndLongPress(WALLET_ACCOUNT_NAME_LABEL_TEXT);
      // Clear text
      await TestHelpers.clearField(WALLET_ACCOUNT_NAME_LABEL_INPUT);
      // Change account name
      await TestHelpers.replaceTextInField(
        WALLET_ACCOUNT_NAME_LABEL_INPUT,
        accountName,
      );
      await element(by.id(WALLET_ACCOUNT_NAME_LABEL_INPUT)).tapReturnKey();
    }
  }

  static async isVisible() {
    if (!device.getPlatform() === 'android') {
      // Check that we are on the wallet screen
      await TestHelpers.checkIfExists(WALLET_CONTAINER_ID);
    }
  }

  static async isToastNotificationVisible() {
    await TestHelpers.checkIfExists(NOTIFICATION_TITLE);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(WALLET_CONTAINER_ID);
  }

  static async isNFTVisibleInWallet(nftName) {
    await TestHelpers.checkIfElementByTextIsVisible(nftName);
  }

  static async isTokenVisibleInWallet(tokenName) {
    await TestHelpers.checkIfElementByTextIsVisible(tokenName);
  }

  static async tokenIsNotVisibleInWallet(tokenName) {
    await TestHelpers.checkIfElementWithTextIsNotVisible(tokenName);
  }

  static async isNFTNameVisible(nftName) {
    await TestHelpers.checkIfElementHasString(NFT_CONTAINER_ID, nftName);
  }

  static async isNetworkNameVisible(networkName) {
    await TestHelpers.checkIfElementHasString(
      NETWORK_NAME_TEXT_ID,
      networkName,
    );
  }

  static async isAccountNameCorrect(accountName) {
    await TestHelpers.checkIfElementHasString(
      WALLET_ACCOUNT_NAME_LABEL_INPUT,
      accountName,
    );
  }

  static async isAccountBalanceCorrect(accountBalance) {
    await TestHelpers.checkIfElementHasString('balance', accountBalance);
  }
}
