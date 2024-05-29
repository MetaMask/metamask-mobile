import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import  {
  BrowserViewSelectorsIDs,

} from '../../../e2e/selectors/Browser/BrowserView.selectors';



class BrowserScreen {
  get container() {
    return Selectors.getXpathElementByResourceId(BrowserViewSelectorsIDs.BROWSER_SCREEN_ID);
  }

  get urlBarTitle() {
    return Selectors.getXpathElementByResourceId(BrowserViewSelectorsIDs.URL_INPUT);
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
