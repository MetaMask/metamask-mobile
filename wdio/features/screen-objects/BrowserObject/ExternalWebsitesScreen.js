import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
  BRUNO_MAIN_ID,
  CURVE_APPROVE_SPENDING_BUTTON,
  CURVE_CONNECT_WALLET_BUTTON,
  CURVE_METAMASK_AVAILABLE_WALLET_BUTTON,
  ERROR_PAGE_MESSAGE,
  ERROR_PAGE_RETURN_BUTTON,
  ERROR_PAGE_TITLE,
  ETHEREUM_DETECTION_TITLE,
  ETHEREUM_PHISHING_DETECTION_BACK_BUTTON,
  HOME_EXPLORE_CARDS,
  HOME_FAVORITE_BUTTON,
  HOME_FAVORITES_CARDS,
  HOME_FAVORITES_CARDS_TITLES,
  HOME_FAVORITES_CARDS_URL,
  HOME_SEARCH_BAR_INPUT,
  HOME_WEBSITE_ID,
  NO_FAVORITES_MESSAGE,
  UNISWAP_CONNECT_BUTTON,
  UNISWAP_METAMASK_WALLET_BUTTON,
  UNISWAP_WALLET_ADDRESS_BUTTON,
  UNISWAP_WALLET_PROFILE_ICON,
} from '../../testIDs/BrowserScreen/ExternalWebsites.testIds';

class ExternalWebsitesScreen {
  get homeSearchBar() {
    return Selectors.getElementByCss(HOME_SEARCH_BAR_INPUT);
  }

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
    return Selectors.getXpathElementByText(ERROR_PAGE_TITLE);
  }

  get errorPageMessage() {
    return Selectors.getXpathElementByText(ERROR_PAGE_MESSAGE);
  }

  get wrongReturnButton() {
    return Selectors.getXpathElementByText(ERROR_PAGE_RETURN_BUTTON);
  }

  get uniswapConnectButton() {
    //return Selectors.getElementByCss(UNISWAP_CONNECT_BUTTON);
    return Selectors.getXpathElementByText(UNISWAP_CONNECT_BUTTON);
  }

  get uniswapMetamaskWalletButton() {
    return Selectors.getXpathElementByText(UNISWAP_METAMASK_WALLET_BUTTON);
  }

  get uniswapWalletProfileIconButton() {
    //return Selectors.getElementByCss(UNISWAP_WALLET_PROFILE_ICON);
    return Selectors.getElementByCss(UNISWAP_WALLET_PROFILE_ICON);
  }

  get uniswapWalletAddressButton() {
    return Selectors.getElementByCss(UNISWAP_WALLET_ADDRESS_BUTTON);
  }

  get homeScreenId() {
    return Selectors.getXpathElementByResourceId(HOME_WEBSITE_ID);
  }

  get homeFavoritesCards() {
    return Selectors.getElementsByCss(HOME_FAVORITES_CARDS);
  }

  get homeExploreCards() {
    return Selectors.getElementsByCss(HOME_EXPLORE_CARDS);
  }

  get homeDecentralizedFinanceCards() {
    return Selectors.getElementsByCss(HOME_EXPLORE_CARDS);
  }

  get homeFavoriteCardTitle() {
    //return Selectors.getElementsByCss(HOME_FAVORITES_CARDS_TITLES);
    return Selectors.getXpathElementByText(HOME_FAVORITES_CARDS_TITLES);
  }

  get homeFavoriteCardUrl() {
    //return Selectors.getElementsByCss(HOME_FAVORITES_CARDS_URL);
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

  async isHomeWebsiteDisplayed() {
    await expect(await this.homeScreenId).toBeDisplayed();
  }

  async isErrorPageTitle(title) {
    await expect(await this.errorPageTitle).toEqual(title);
  }

  async isErrorPageMessage(message) {
    await expect(await this.errorPageMessage).toEqual(message);
  }

  async tapWrongReturnButton() {
    await Gestures.waitAndTap(this.wrongReturnButton);
  }

  async tapHomeSearchBar() {
    await Gestures.waitAndTap(this.homeSearchBar);
  }

  async tapCurveConnectWalletButton() {
    await Gestures.waitAndTap(this.curveConnectWalletButton);
  }

  async tapCurveMetaMaskAvailableWalletButton() {
    await Gestures.waitAndTap(this.curveMetaMaskAvailableWalletButton);
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

  async tapHomeFavoritesCard(link) {
    const elementsText = this.homeFavoritesCards;
    await elementsText.every(async (element) => {
      const elementHref = await element.getAttribute('href');

      if (elementHref === link) {
        await Gestures.tap(element);
        return false;
      }

      return true;
    });
  }

  async isHomeFavoritesCardsTitle(link) {
    const elementsText = await this.homeFavoriteCardTitle;
    //elementsText.filter((element) => element.getText() === link);
    await expect(await elementsText.getText()).toEqual(link);
  }

  async isHomeFavoritesCardsUrl(link) {
    const elementsText = await this.homeFavoriteCardUrl;
    //elementsText.filter((element) => element.getText() === link);
    await expect(await elementsText.getText()).toEqual(link);
  }

  async tapHomeExploreCards(link) {
    const elementsText = this.homeExploreCards;
    elementsText.every((element) => {
      const elementHref = element.getAttribute('href');

      if (elementHref === link) {
        Gestures.tap(element);
        return false;
      }

      return true;
    });
  }

  async tapDecentralizedFinanceCards(link) {
    const elementsText = this.homeDecentralizedFinanceCards;
    elementsText.every((element) => {
      const elementHref = element.getAttribute('href');

      if (elementHref === link) {
        Gestures.tap(element);
        return false;
      }

      return true;
    });
  }
}

export default new ExternalWebsitesScreen();
