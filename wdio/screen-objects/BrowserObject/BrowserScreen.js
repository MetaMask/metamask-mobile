import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import  {
  BrowserViewSelectorsIDs,
} from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import { expect } from 'appwright';
import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';


class BrowserScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get container() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(BrowserViewSelectorsIDs.BROWSER_SCREEN_ID);
    } else {
      return AppwrightSelectors.getElementByID(this._device, BrowserViewSelectorsIDs.BROWSER_SCREEN_ID);
    }
  }

  get urlBarTitle() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(BrowserViewSelectorsIDs.URL_INPUT);
    } else {
      return AppwrightSelectors.getElementByID(this._device, BrowserViewSelectorsIDs.URL_INPUT);
    }
  }

  get accountIconButton() {
    return Selectors.getElementByPlatform(BrowserViewSelectorsIDs.ACCOUNT_BUTTON);
  }

  get optionButton() {
    return Selectors.getElementByPlatform(BrowserViewSelectorsIDs.OPTIONS_BUTTON);
  }

  get tabsButton() {
    return Selectors.getElementByPlatform(BrowserViewSelectorsIDs.TABS_BUTTON);
  }

  get tabsButtonTextElement() {
    return Selectors.getElementByPlatform(BrowserViewSelectorsIDs.TABS_NUMBER);
  }

  get homeButton() {
    return Selectors.getElementByPlatform(BrowserViewSelectorsIDs.HOME_BUTTON);
  }

  get backButton() {
    return Selectors.getElementByPlatform(BrowserViewSelectorsIDs.BACK_BUTTON);
  }

  get forwardButton() {
    return Selectors.getElementByPlatform(BrowserViewSelectorsIDs.FORWARD_BUTTON);
  }

  get searchButton() {
    return Selectors.getElementByPlatform(BrowserViewSelectorsIDs.SEARCH_BUTTON);
  }

  get networkAvatarIcon() {
    return Selectors.getElementByPlatform(BrowserViewSelectorsIDs.AVATAR_IMAGE);
  }

  async isScreenContentDisplayed() {
    if (!this._device) {
      const screen = await this.container;
      await screen.waitForDisplayed();
    } else {
      const screen = await this.container;
      await expect(screen).toBeVisible({ timeout: 10000 });
    }
  }

  async tapUrlBar() {
    if (!this._device) {
      await driver.pause(500);
      const urlBarTitle = await this.urlBarTitle;
      await urlBarTitle.waitForEnabled();
      await Gestures.waitAndTap(this.urlBarTitle);
    } else {
      const urlBarTitle = await this.urlBarTitle;
      await urlBarTitle.tap();
    }
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
