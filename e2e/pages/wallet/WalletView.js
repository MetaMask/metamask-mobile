import {
  WalletViewSelectorsIDs,
  WalletViewSelectorsText,
} from '../../selectors/wallet/WalletView.selectors';
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

  async getNavbarNetworkPicker() {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER,
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
    return Matchers.getElementByID(WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON);
  }

  get importTokensFooterLink() {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.IMPORT_TOKEN_FOOTER_LINK,
    );
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

  get currentMainWalletAccountActions() {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
    );
  }

  get tokenNetworkFilter() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER);
  }

  get sortBy() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.SORT_BY);
  }

  get tokenNetworkFilterAll() {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER_ALL,
    );
  }

  get tokenNetworkFilterCurrent() {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER_CURRENT,
    );
  }

  get cancelButton() {
    return Matchers.getElementByText('Cancel');
  }

  async tapCurrentMainWalletAccountActions() {
    await Gestures.waitAndTap(this.currentMainWalletAccountActions);
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

  async tapImportTokensFooterLink() {
    await Gestures.waitAndTap(this.importTokensFooterLink);
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

  async getTokensInWallet() {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST,
    );
  }

  async nftIDInWallet(nftId) {
    return Matchers.getElementByID(nftId);
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

  async tapTokenNetworkFilter() {
    await Gestures.waitAndTap(this.tokenNetworkFilter);
  }

  async tapSortBy() {
    await Gestures.waitAndTap(this.sortBy);
  }

  async tapTokenNetworkFilterAll() {
    await Gestures.waitAndTap(this.tokenNetworkFilterAll);
  }

  async tapTokenNetworkFilterCurrent() {
    await Gestures.waitAndTap(this.tokenNetworkFilterCurrent);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }
}

export default new WalletView();
