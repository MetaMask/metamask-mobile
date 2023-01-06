import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
  BRUNO_MAIN_ID,
  CURVE_APPROVE_SPENDING_BUTTON,
  CURVE_CONNECT_WALLET_BUTTON,
  CURVE_METAMASK_AVAILABLE_WALLET_BUTTON,
  CURVER_CHANGE_NETWORK_BUTTON,
  ERROR_PAGE_MESSAGE,
  ERROR_PAGE_RETURN_BUTTON,
  ERROR_PAGE_TITLE,
  ETHEREUM_DETECTION_TITLE,
  ETHEREUM_PHISHING_DETECTION_BACK_BUTTON,
  HOME_FAVORITE_BUTTON,
  HOME_FAVORITES_CARDS_URL,
  HOME_FAVORITES_UNISWAP_CARD_TITLE,
  NO_FAVORITES_MESSAGE,
  UNISWAP_CONNECT_BUTTON,
  UNISWAP_METAMASK_WALLET_BUTTON,
  UNISWAP_WALLET_ADDRESS_BUTTON,
  UNISWAP_WALLET_PROFILE_ICON,
} from '../../testIDs/BrowserScreen/ExternalWebsites.testIds';

class ExternalWebsitesScreen {
  get homeFavoriteButton() {
    return Selectors.getXpathElementByText(HOME_FAVORITE_BUTTON);
  }

  get homeNoFavoritesMessageText() {
    //return Selectors.getElementByCss(NO_FAVORITES_MESSAGE);
    return Selectors.getXpathElementByText(NO_FAVORITES_MESSAGE);
  }

  get ethereumPhishingDetectionTitle() {
    return Selectors.getElementByPlatform(ETHEREUM_DETECTION_TITLE);
  }

  get ethereumPhishingDetectionBackButton() {
    return Selectors.getXpathElementByText(
      ETHEREUM_PHISHING_DETECTION_BACK_BUTTON,
    );
  }

  get bruno() {
    return Selectors.getXpathElementByResourceId(BRUNO_MAIN_ID);
  }

  get errorPageTitle() {
    return Selectors.getElementByPlatform(ERROR_PAGE_TITLE);
  }

  get errorPageMessage() {
    return Selectors.getElementByPlatform(ERROR_PAGE_MESSAGE);
  }

  get wrongReturnButton() {
    return Selectors.getElementByPlatform(ERROR_PAGE_RETURN_BUTTON);
  }

  get uniswapConnectButton() {
    return Selectors.getXpathElementByText(UNISWAP_CONNECT_BUTTON);
  }

  get uniswapMetamaskWalletButton() {
    return Selectors.getXpathElementByText(UNISWAP_METAMASK_WALLET_BUTTON);
  }

  get uniswapWalletProfileIconButton() {
    return Selectors.getElementByCss(UNISWAP_WALLET_PROFILE_ICON);
  }

  get uniswapWalletAddressButton() {
    return Selectors.getElementByCss(UNISWAP_WALLET_ADDRESS_BUTTON);
  }

  get homeFavoriteUniswapCardTitle() {
    return Selectors.getXpathElementByText(HOME_FAVORITES_UNISWAP_CARD_TITLE);
  }

  get homeFavoriteUniswapCardUrl() {
    return Selectors.getXpathElementByText(HOME_FAVORITES_CARDS_URL);
  }

  get curveConnectWalletButton() {
    return Selectors.getXpathElementByText(CURVE_CONNECT_WALLET_BUTTON);
  }

  get curveMetaMaskAvailableWalletButton() {
    return Selectors.getXpathElementByText(
      CURVE_METAMASK_AVAILABLE_WALLET_BUTTON,
    );
  }

  get curveApproveSpendingButton() {
    return Selectors.getXpathElementByText(CURVE_APPROVE_SPENDING_BUTTON);
  }

  get curveChangeNetworkButton() {
    return Selectors.getXpathElementByText(CURVER_CHANGE_NETWORK_BUTTON);
  }

  async tapHomeFavoritesButton() {
    await Gestures.waitAndTap(this.homeFavoriteButton);
  }

  async isHomeNoFavoritesMessageDisplayed() {
    await expect(await this.homeNoFavoritesMessageText).toBeDisplayed();
  }

  async isEthereumFishingDetectionWebsiteTitleDisplayed() {
    await expect(await this.ethereumPhishingDetectionTitle).toBeDisplayed();
  }

  async tapEthereumFishingDetectionWebsiteBackButton() {
    await Gestures.waitAndTap(this.ethereumPhishingDetectionBackButton);
  }

  async isBrunoWebsiteDisplayed() {
    await expect(await this.bruno).toBeDisplayed();
  }

  async isErrorPageTitle(title) {
    const element = await this.errorPageTitle;
    await expect(await element.getText()).toEqual(title);
  }

  async isErrorPageMessage(message) {
    const element = await this.errorPageMessage;
    await expect(await element.getText()).toEqual(message);
  }

  async tapWrongReturnButton() {
    await Gestures.waitAndTap(this.wrongReturnButton);
  }

  async tapCurveConnectWalletButton() {
    await Gestures.waitAndTap(this.curveConnectWalletButton);
  }

  async tapCurveMetaMaskAvailableWalletButton() {
    await Gestures.waitAndTap(this.curveMetaMaskAvailableWalletButton);
  }

  async isCurveChangeNetworkButtonDisplayed() {
    await expect(await this.curveChangeNetworkButton).toBeDisplayed();
  }

  async isConnectButtonNotDisplayed() {
    await expect(await this.curveApproveSpendingButton).toBeDisplayed();
  }

  async tapUniswapConnectButton() {
    await Gestures.waitAndTap(this.uniswapConnectButton);
  }

  async tapUniswapMetaMaskWalletButton() {
    await Gestures.waitAndTap(this.uniswapMetamaskWalletButton);
  }

  async isUniswapProfileIconDisplayed() {
    await expect(await this.uniswapWalletProfileIconButton).toBeDisplayed();
  }

  async tapUniswapProfileIcon() {
    await Gestures.tap(this.uniswapWalletProfileIconButton);
  }

  async tapUniswapWalletAddressButton() {
    await Gestures.tap(this.uniswapWalletAddressButton);
  }

  async isHomeFavoriteUniswapTitle() {
    await expect(await this.homeFavoriteUniswapCardTitle).toBeDisplayed();
  }

  async isHomeFavoriteUniswapUrl() {
    await expect(await this.homeFavoriteUniswapCardUrl).toBeDisplayed();
  }
}

export default new ExternalWebsitesScreen();
