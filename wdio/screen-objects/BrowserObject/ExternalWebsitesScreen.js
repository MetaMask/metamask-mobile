import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
  BRUNO_MAIN_ID,
  ERROR_PAGE_MESSAGE,
  ERROR_PAGE_RETURN_BUTTON,
  ERROR_PAGE_TITLE,
  ETHEREUM_PHISHING_DETECTION_BACK_BUTTON,
  HOME_FAVORITE_BUTTON,
  HOME_FAVORITES_CARDS_URL,
  HOME_FAVORITES_UNISWAP_CARD_TITLE,
  NO_FAVORITES_MESSAGE,
  REDDIT_ICON,
  UNISWAP_CONNECT_BUTTON,
  UNISWAP_METAMASK_WALLET_BUTTON,
  UNISWAP_WALLET_PROFILE_ICON,
} from '../testIDs/BrowserScreen/ExternalWebsites.testIds';

class ExternalWebsitesScreen {
  get homeFavoriteButton() {
    return Selectors.getXpathElementByText(HOME_FAVORITE_BUTTON);
  }

  get homeNoFavoritesMessageText() {
    //return Selectors.getElementByCss(NO_FAVORITES_MESSAGE);
    return Selectors.getXpathElementByText(NO_FAVORITES_MESSAGE);
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

  get redditIcon() {
    return Selectors.getElementByPlatform(REDDIT_ICON);
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

  get homeFavoriteUniswapCardTitle() {
    return Selectors.getXpathElementByText(HOME_FAVORITES_UNISWAP_CARD_TITLE);
  }

  get homeFavoriteUniswapCardUrl() {
    return Selectors.getXpathElementByText(HOME_FAVORITES_CARDS_URL);
  }

  async tapHomeFavoritesButton() {
    await Gestures.waitAndTap(this.homeFavoriteButton);
  }

  async isHomeNoFavoritesMessageDisplayed() {
    await expect(await this.homeNoFavoritesMessageText).toBeDisplayed();
  }

  async isEthereumFishingDetectionWebsiteTitleDisplayed() {
    await expect(
      await this.ethereumPhishingDetectionBackButton,
    ).toBeDisplayed();
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

  async isRedditIconDisplayed() {
    await expect(await this.redditIcon).toBeDisplayed();
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

  async isHomeFavoriteUniswapTitle() {
    await expect(await this.homeFavoriteUniswapCardTitle).toBeDisplayed();
  }

  async isHomeFavoriteUniswapUrl() {
    await expect(await this.homeFavoriteUniswapCardUrl).toBeDisplayed();
  }

  async isHomeFavoriteButtonDisplayed() {
    await expect(await this.homeFavoriteButton).toBeDisplayed();
  }
}

export default new ExternalWebsitesScreen();
