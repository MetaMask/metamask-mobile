import TestHelpers from '../../helpers';
import { TEST_DAPP_LOCAL_URL } from './TestDApp';
import {
  BrowserViewSelectorsIDs,
  BrowserViewSelectorsText,
  BrowserViewSelectorsXPaths,
} from '../../selectors/Browser/BrowserView.selectors';
import { AccountOverviewSelectorsIDs } from '../../selectors/Browser/AccountOverview.selectors';
import { BrowserURLBarSelectorsIDs } from '../../selectors/Browser/BrowserURLBar.selectors';
import { AddBookmarkViewSelectorsIDs } from '../../selectors/Browser/AddBookmarkView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';
import { waitForTestDappToLoad } from '../../viewHelper';

class Browser {
  get searchButton() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.SEARCH_BUTTON);
  }

  get optionsButton() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.OPTIONS_BUTTON);
  }

  get tabsButton() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.TABS_BUTTON);
  }

  get homeButton() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.HOME_BUTTON);
  }

  get browserScreenID() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.BROWSER_SCREEN_ID);
  }

  get androidBrowserWebViewID() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID);
  }

  get addressBar() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.URL_INPUT);
  }
  get urlInputBoxID() {
    return Matchers.getElementByID(BrowserURLBarSelectorsIDs.URL_INPUT);
  }

  get clearURLButton() {
    return Matchers.getElementByID(BrowserURLBarSelectorsIDs.URL_CLEAR_ICON);
  }

  get backToSafetyButton() {
    return Matchers.getElementByText(
      BrowserViewSelectorsText.BACK_TO_SAFETY_BUTTON,
    );
  }

  get returnHomeButton() {
    return Matchers.getElementByText(BrowserViewSelectorsText.RETURN_HOME);
  }

  get addFavouritesButton() {
    return Matchers.getElementByText(
      BrowserViewSelectorsText.ADD_FAVORITES_BUTTON,
    );
  }

  get homePageFavouritesTab() {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      BrowserViewSelectorsXPaths.FAVORITE_TAB,
    );
  }

  get testDappURLInFavouritesTab() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByXPath(
          BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
          BrowserViewSelectorsXPaths.TEST_DAPP_LINK,
        )
      : Matchers.getElementByXPath(
          BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
          BrowserViewSelectorsXPaths.TEST_DAPP_TEXT,
        );
  }

  get multiTabButton() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.ADD_NEW_TAB);
  }

  get networkAvatarButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(BrowserViewSelectorsIDs.AVATAR_IMAGE)
      : Matchers.getElementByDescendant(
          AccountOverviewSelectorsIDs.ACCOUNT_BUTTON,
          BrowserViewSelectorsIDs.AVATAR_IMAGE,
        );
  }

  get addBookmarkButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON)
      : Matchers.getElementByLabel(AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON);
  }

  get tabsNumber() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.TABS_NUMBER);
  }

  get closeAllTabsButton() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.CLOSE_ALL_TABS);
  }

  get noTabsMessage() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.NO_TABS_MESSAGE);
  }

  async getFavoritesURL(url) {
    return Matchers.getElementByHref(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      url,
    );
  }

  async tapUrlInputBox() {
    await Gestures.waitAndTap(this.addressBar);
  }

  async tapBottomSearchBar() {
    await Gestures.waitAndTap(this.searchButton);
  }

  async tapOptionsButton() {
    await Gestures.waitAndTap(this.optionsButton);
  }

  async tapOpenAllTabsButton() {
    await Gestures.waitAndTap(this.tabsButton);
  }

  async tapCloseTabsButton() {
    await Gestures.waitAndTap(this.closeAllTabsButton);
  }

  async tapOpenNewTabButton() {
    await Gestures.waitAndTap(this.multiTabButton);
  }

  async tapNetworkAvatarButtonOnBrowser() {
    await TestHelpers.delay(4000);
    await Gestures.waitAndTap(this.networkAvatarButton);
  }

  async tapAddToFavoritesButton() {
    await Gestures.waitAndTap(this.addFavouritesButton);
  }

  async tapAddBookmarksButton() {
    await Gestures.waitAndTap(this.addBookmarkButton);
  }

  async tapHomeButton() {
    await Gestures.waitAndTap(this.homeButton);
  }

  async tapBackToSafetyButton() {
    await Gestures.waitAndTap(this.backToSafetyButton);
  }

  async tapReturnHomeButton() {
    await Gestures.waitAndTap(this.returnHomeButton);
  }

  async tapDappInFavorites() {
    if (device.getPlatform() === 'ios') {
      await Gestures.tapWebElement(this.testDappURLInFavouritesTab);
    } else {
      await Gestures.tapWebElement(this.homePageFavouritesTab);
      await Gestures.tapWebElement(this.testDappURLInFavouritesTab);
    }
  }

  async navigateToURL(url) {
    await device.disableSynchronization(); // because animations makes typing into the browser slow

    await Gestures.typeTextAndHideKeyboard(this.urlInputBoxID, url);
    await device.enableSynchronization(); // re-enabling synchronization
  }

  async waitForBrowserPageToLoad() {
    await TestHelpers.delay(5000);
  }

  async navigateToTestDApp() {
    await this.tapUrlInputBox();
    await this.navigateToURL(TEST_DAPP_LOCAL_URL);
    await waitForTestDappToLoad();
  }
}

export default new Browser();
