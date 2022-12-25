import Gestures from 'wdio/features/helpers/Gestures';
import Selectors from 'wdio/features/helpers/Selectors';

import { SUSHISWAP_SUGGESTION } from 'wdio/features/testIDs/BrowserScreen/AddressBar.testIds';
import {
  BRUNO_MAIN_ID,
  CURVE_CONNECT_WALLET_BUTTON,
  CURVE_METAMASK_AVAILABLE_WALLET_BUTTON,
  ETHEREUM_DETECTION_TITLE,
  ETHEREUM_PHISHING_DETECTION_BACK_BUTTON,
  HOME_FAVORITE_BUTTON_TEXT,
  HOME_FAVORITE_TITLE_CARD,
  HOME_SEARCH_BAR_INPUT_CLASS,
  HOME_WEBSITE_ID,
  NO_FAVORITES_MESSAGE,
  SUSHI_HAMBURGER_BUTTON_CSS,
  SUSHI_WEB_STATUS_CONNECTED_CSS,
  WRONG_RETURN_BUTTON,
  WRONG_SUBTITLE,
  WRONG_TITLE,
} from 'wdio/features/testIDs/BrowserScreen/ExternalWebsites.testIds';

class ExternalWebsitesScreen {
  get mySushiUrlCard() {
    return Selectors.getXpathElementByText(SUSHISWAP_SUGGESTION);
  }

  get homeSearchBar() {
    return Selectors.getElementByCss(HOME_SEARCH_BAR_INPUT_CLASS);
  }

  get homeFavoriteButton() {
    return Selectors.getXpathElementByText(HOME_FAVORITE_BUTTON_TEXT);
  }

  get homeNoFavoritesMessageText() {
    return Selectors.getXpathElementByText(NO_FAVORITES_MESSAGE);
  }

  get mySushiTitleCard() {
    return Selectors.getXpathElementByText(HOME_FAVORITE_TITLE_CARD);
  }

  get ethereumPhishingDetectionTitle() {
    return Selectors.getXpathElementByText(ETHEREUM_DETECTION_TITLE);
  }

  get ethereumPhishingDetectionBackButton() {
    return Selectors.getXpathElementByText(
      ETHEREUM_PHISHING_DETECTION_BACK_BUTTON,
    );
  }

  get bruno() {
    return Selectors.getXpathElementByResourceId(BRUNO_MAIN_ID);
  }

  get wrongTitle() {
    return Selectors.getXpathElementByText(WRONG_TITLE);
  }

  get wrongSubtitle() {
    return Selectors.getXpathElementByText(WRONG_SUBTITLE);
  }

  get wrongReturnButton() {
    return Selectors.getXpathElementByText(WRONG_RETURN_BUTTON);
  }

  get sushiHamburgerButton() {
    return Selectors.getElementByCss(SUSHI_HAMBURGER_BUTTON_CSS);
  }

  get sushiWebStatusButton() {
    return Selectors.getElementByCss(SUSHI_WEB_STATUS_CONNECTED_CSS);
  }

  get homeScreenId() {
    return Selectors.getXpathElementByResourceId(HOME_WEBSITE_ID);
  }

  get curveConnectWalletButton() {
    return Selectors.getElementByCss(CURVE_CONNECT_WALLET_BUTTON);
  }

  get curveMetaMaskAvailableWalletButton() {
    return Selectors.getElementByCss(CURVE_METAMASK_AVAILABLE_WALLET_BUTTON);
  }

  async tapHomeFavoritesButton() {
    await Gestures.waitAndTap(this.homeFavoriteButton);
  }

  async isHomeNoFavoritesMessageDisplayed() {
    await expect(this.homeNoFavoritesMessageText).toBeDisplayed();
  }

  async isEthereumFishingDetectionWebsiteTitleDisplayed() {
    await expect(this.ethereumPhishingDetectionTitle).toBeDisplayed();
  }

  async tapEthereumFishingDetectionWebsiteBackButton() {
    await Gestures.waitAndTap(this.ethereumPhishingDetectionBackButton);
  }

  async isBrunoWebsiteDisplayed() {
    await expect(this.bruno).toBeDisabled();
  }

  async isHomeWebsiteDisplayed() {
    await expect(this.homeScreenId).toBeDisplayed();
  }

  async isWrongTitleDisplayed() {
    await expect(this.wrongTitle).toBeDisabled();
  }

  async isWrongSubtitle() {
    await expect(this.wrongSubtitle).toBeDisplayed();
  }

  async isHomeFavoriteSushiTitleCardDisplayed() {
    await expect(this.mySushiTitleCard).toBeDisplayed();
  }

  async isHomeFavoriteSushiUrlCardDisplayed() {
    await expect(this.mySushiUrlCard).toBeDisplayed();
  }

  async tapWrongReturnButton() {
    await Gestures.waitAndTap(this.wrongReturnButton);
  }

  async tapSushiHamburgerButton() {
    await Gestures.waitAndTap(this.sushiHamburgerButton);
  }

  async tapSushiWebStatus() {
    await Gestures.waitAndTap(this.sushiWebStatusButton);
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
}

export default new ExternalWebsitesScreen();
