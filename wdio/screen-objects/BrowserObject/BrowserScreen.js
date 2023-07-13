import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
  ACCOUNT_BUTTON,
  BACK_BUTTON,
  BROWSER_SCREEN_ID,
  FORWARD_BUTTON,
  HOME_BUTTON,
  NAVBAR_TITLE_NETWORK,
  NETWORK_AVATAR_ICON,
  OPTIONS_BUTTON,
  SEARCH_BUTTON,
  TABS_BUTTON,
  TABS_NUMBER,
} from '../testIDs/BrowserScreen/BrowserScreen.testIds';

class BrowserScreen {
  get container() {
    return Selectors.getElementByPlatform(BROWSER_SCREEN_ID);
  }

  get urlBarTitle() {
    return Selectors.getElementByPlatform(NAVBAR_TITLE_NETWORK);
  }

  get accountIconButton() {
    return Selectors.getElementByPlatform(ACCOUNT_BUTTON);
  }

  get optionButton() {
    return Selectors.getElementByPlatform(OPTIONS_BUTTON);
  }

  get tabsButton() {
    return Selectors.getElementByPlatform(TABS_BUTTON);
  }

  get tabsButtonTextElement() {
    return Selectors.getElementByPlatform(TABS_NUMBER);
  }

  get homeButton() {
    return Selectors.getElementByPlatform(HOME_BUTTON);
  }

  get backButton() {
    return Selectors.getElementByPlatform(BACK_BUTTON);
  }

  get forwardButton() {
    return Selectors.getElementByPlatform(FORWARD_BUTTON);
  }

  get searchButton() {
    return Selectors.getElementByPlatform(SEARCH_BUTTON);
  }

  get networkAvatarIcon() {
    return Selectors.getElementByPlatform(NETWORK_AVATAR_ICON);
  }

  async isScreenContentDisplayed() {
    const screen = await this.container;
    await screen.waitForDisplayed();
  }

  async tapUrlBar() {
    await driver.pause(500);
    const urlBarTitle = await this.urlBarTitle;
    await urlBarTitle.waitForEnabled();
    await Gestures.waitAndTap(this.urlBarTitle);
  }

  async tapAccountButton() {
    await Gestures.waitAndTap(this.accountIconButton);
  }

  async tapOptionButton() {
    const element = await this.optionButton;
    await element.waitForEnabled();
    await Gestures.waitAndTap(this.optionButton);
  }

  async numberOfTapsEqualsTo(expectedNumber) {
    const textFromElement = await this.tabsButtonTextElement;
    const actualNumber = parseInt(await textFromElement.getText());
    await expect(await expectedNumber).toEqual(actualNumber);
  }

  async tapTabsButton() {
    const element = await this.tabsButton;
    await element.waitForEnabled();
    await Gestures.waitAndTap(this.tabsButton);
  }

  async tapHomeButton() {
    const element = await this.homeButton;
    await element.waitForEnabled();
    await Gestures.waitAndTap(this.homeButton);
  }

  async tapBackButton() {
    const element = await this.backButton;
    await element.waitForEnabled();
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

  async waitForBackButtonEnabled() {
    const element = await this.backButton;
    await element.waitForEnabled();
    await driver.pause(2000);
  }
}

export default new BrowserScreen();
