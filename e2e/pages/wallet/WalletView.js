import {
  WalletViewSelectorsIDs,
  WalletViewSelectorsText,
} from '../../selectors/wallet/WalletView.selectors';
import { CommonSelectorsText } from '../../selectors/Common.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

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

  get okAlertButton() {
    return Matchers.getElementByText(CommonSelectorsText.OK_ALERT_BUTTON);
  }

  get accountIcon() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.ACCOUNT_ICON);
  }

  get navbarNetworkText() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.NAVBAR_NETWORK_TEXT);
  }

  get navbarNetworkButton() {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.NAVBAR_NETWORK_BUTTON,
    );
  }

  get nftTab() {
    return Matchers.getElementByText(WalletViewSelectorsText.NFTS_TAB);
  }

  get nftTabContainer() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.NFT_TAB_CONTAINER);
  }

  get importNFTButton() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.IMPORT_NFT_BUTTON);
  }

  get importTokensButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByText(WalletViewSelectorsText.IMPORT_TOKENS)
      : Matchers.getElementByID(WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON);
  }

  get networkName() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.NETWORK_NAME);
  }

  get totalBalance() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT);
  }

  get accountName() {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
    );
  }

  get hideTokensLabel() {
    return Matchers.getElementByText(WalletViewSelectorsText.HIDE_TOKENS);
  }

  async tapOKAlertButton() {
    await Gestures.waitAndTap(this.okAlertButton);
  }

  async tapOnToken(token) {
    const element = Matchers.getElementByText(
      token || WalletViewSelectorsText.DEFAULT_TOKEN,
    );
    await Gestures.waitAndTap(element);
  }

  async tapIdenticon() {
    await Gestures.waitAndTap(this.accountIcon);
  }

  async tapNetworksButtonOnNavBar() {
    await Gestures.waitAndTap(this.navbarNetworkButton);
  }

  async tapNftTab() {
    await Gestures.waitAndTap(this.nftTab);
  }

  async scrollDownOnNFTsTab() {
    await Gestures.swipe(this.nftTabContainer, 'up', 'slow', 0.6);
  }

  async scrollUpOnNFTsTab() {
    await Gestures.swipe(this.nftTabContainer, 'down', 'slow', 0.6);
  }

  async tapImportNFTButton() {
    await Gestures.waitAndTap(this.importNFTButton);
  }

  get testCollectible() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByID(WalletViewSelectorsIDs.COLLECTIBLE_FALLBACK, 1)
      : Matchers.getElementByID(WalletViewSelectorsIDs.TEST_COLLECTIBLE);
  }

  async tapOnNftName() {
    await Gestures.waitAndTap(this.testCollectible);
  }

  async tapImportTokensButton() {
    await Gestures.waitAndTap(this.importTokensButton);
  }

  async tapOnNFTInWallet(nftName) {
    const elem = Matchers.getElementByText(nftName);
    await Gestures.waitAndTap(elem);
  }

  async removeTokenFromWallet(token) {
    const elem = Matchers.getElementByText(token);
    await Gestures.tapAndLongPress(elem);
    await Gestures.waitAndTap(this.hideTokensLabel);
  }

  async tokenInWallet(tokenName) {
    return Matchers.getElementByText(tokenName);
  }

  async nftInWallet(nftName) {
    return Matchers.getElementByText(nftName);
  }

  async tapNewTokensFound() {
    await Gestures.waitAndTap(this.tokenDetectionLinkButton);
  }

  async tapPortfolio() {
    await Gestures.waitAndTap(this.portfolioButton);
  }
}

export default new WalletView();
