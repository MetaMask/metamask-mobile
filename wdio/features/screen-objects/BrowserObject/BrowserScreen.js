import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
  ACCOUNT_BUTTON,
  BACK_BUTTON,
  CONNECT_WALLET_BUTTON,
  FORWARD_BUTTON,
  HAMBURGER_BUTTON,
  HOME_BUTTON,
  NAVBAR_TITLE_NETWORK,
  OPTIONS_BUTTON,
  SCREEN_ID,
  SEARCH_BUTTON,
  TABS_BUTTON,
  TEXT_VIEW_CLASS,
} from '../../testIDs/BrowserScreen/BrowserScreen.testIds';

class BrowserScreen {
  get screen() {
    return Selectors.getXpathElementByText(SCREEN_ID);
  }

  get navBarTitle() {
    return Selectors.getXpathElementByText(NAVBAR_TITLE_NETWORK);
  }

  get navbarHamburgerButton() {
    return Selectors.getXpathElementByResourceId(HAMBURGER_BUTTON);
  }

  get accountIconButton() {
    return Selectors.getXpathElementByResourceId(ACCOUNT_BUTTON);
  }

  get optionButton() {
    return Selectors.getXpathElementByResourceId(OPTIONS_BUTTON);
  }

  get tabsButton() {
    return Selectors.getXpathElementByResourceId(TABS_BUTTON);
  }

  get tabsButtonTextElement() {
    return Selectors.getXpathNestedElementByClassName(
      this.tapsButton,
      TEXT_VIEW_CLASS,
    );
  }

  get homeButton() {
    return Selectors.getXpathElementByResourceId(HOME_BUTTON);
  }

  get backButton() {
    return Selectors.getXpathElementByResourceId(BACK_BUTTON);
  }

  get forwardButton() {
    return Selectors.getXpathElementByResourceId(FORWARD_BUTTON);
  }

  get searchButton() {
    return Selectors.getXpathElementByResourceId(SEARCH_BUTTON);
  }

  get confirmConnectWalletButton() {
    return Selectors.getElementByPlatform(CONNECT_WALLET_BUTTON);
  }

  async isScreenContentDisplayed() {
    await expect(this.screen).toBeDisplayed();
  }

  async tapUrlNavBar() {
    await Gestures.waitAndTap(this.navBarTitle);
  }

  async tapNavbarHamburgerButton() {
    await Gestures.waitAndTap(this.navbarHamburgerButton);
  }

  async tapAccountButton() {
    await Gestures.waitAndTap(this.accountIconButton);
  }

  async tapOptionButton() {
    await Gestures.waitAndTap(this.optionButton);
  }

  async numberOfTapsEqualsTo(expectedNumber) {
    const textFromElement = await this.tabsButtonTextElement;
    const actualNumber = parseInt(await textFromElement.getText());
    await expect(expectedNumber).toEqual(actualNumber);
  }

  async tapTabsButton() {
    await Gestures.waitAndTap(this.tabsButton);
  }

  async tapHomeButton() {
    await Gestures.waitAndTap(this.homeButton);
  }

  async tapBackButton() {
    await Gestures.waitAndTap(this.backButton);
  }

  async tapForwardButton() {
    await Gestures.waitAndTap(this.forwardButton);
  }

  async tapSearchButton() {
    await Gestures.waitAndTap(this.searchButton);
  }

  async tapConfirmConnectWalletButton() {
    await Gestures.waitAndTap(this.confirmConnectWalletButton);
  }
}

export default new BrowserScreen();
