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

  get testDappConnectButton() {
    return Selectors.getXpathElementByText('CONNECT');
  }

  get testDappTransferTokens() {
    return Selectors.getXpathElementByText('TRANSFER TOKENS');
  }

  get testDappApproveTokens() {
    return Selectors.getXpathElementByText('APPROVE TOKENS');
  }

  get testDappTransferNft() {
    return Selectors.getXpathElementByText('TRANSFER FROM');
  }

  async tapHomeFavoritesButton() {
    const element = await this.homeFavoriteButton;
    await element.waitForEnabled();
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
    await expect(this.errorPageTitle).toHaveText(title);
  }

  async isErrorPageMessage(message) {
    await expect(this.errorPageMessage).toHaveText(message);
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
  async tapDappConnectButton() {
    const element = await this.testDappConnectButton;
    await element.waitForEnabled();
    await Gestures.waitAndTap(this.testDappConnectButton);
  }

  async tapDappTransferTokens() {
    const element = await this.testDappTransferTokens;
    await element.waitForEnabled();
    await Gestures.waitAndTap(this.testDappTransferTokens);
  }

  async tapDappTransferNft() {
    const element = await this.testDappTransferNft;
    await element.waitForEnabled();
    await Gestures.waitAndTap(this.testDappTransferNft);
  }

  async tapDappApproveTokens() {
    const element = await this.testDappApproveTokens;
    await element.waitForEnabled();
    await Gestures.waitAndTap(this.testDappApproveTokens);
  }

  async tapUniswapMetaMaskWalletButton() {
    await Gestures.tapTextByXpath('MetaMask');
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
