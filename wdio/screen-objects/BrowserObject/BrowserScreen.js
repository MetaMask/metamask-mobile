/* global driver */
import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
  ACCOUNT_BUTTON,
  BACK_BUTTON,
  FORWARD_BUTTON,
  HOME_BUTTON,
  NAVBAR_TITLE_NETWORK,
  NETWORK_AVATAR_ICON,
  OPTIONS_BUTTON,
  SCREEN_ID,
  SEARCH_BUTTON,
  TABS_BUTTON,
  TABS_NUMBER,
} from '../testIDs/BrowserScreen/BrowserScreen.testIds';

class BrowserScreen {
  get container() {
    return Selectors.getXpathElementByResourceId(SCREEN_ID);
  }

  get urlBarTitle() {
    return Selectors.getElementByPlatform(NAVBAR_TITLE_NETWORK);
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
    return Selectors.getElementByPlatform(TABS_NUMBER);
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

  get networkAvatarIcon() {
    return Selectors.getXpathElementByResourceId(NETWORK_AVATAR_ICON);
  }

  async isScreenContentDisplayed() {
    await expect(await this.container).toBeDisplayed();
  }

  async tapUrlBar() {
    await driver.pause(500);
    await Gestures.waitAndTap(this.urlBarTitle);
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
    await expect(await expectedNumber).toEqual(actualNumber);
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

  async tapNetworkAvatarIcon() {
    await Gestures.waitAndTap(this.networkAvatarIcon);
  }
}

export default new BrowserScreen();
