import TestHelpers from '../../helpers';
import { TEST_DAPP_LOCAL_URL } from '../Browser/TestDApp';

import {
  BrowserViewSelectorsIDs,
  BrowserViewSelectorsText,
} from '../../selectors/Browser/BrowserView.selectors';
import { AccountOverviewSelectorsIDs } from '../../selectors/AccountOverview.selectors';
import { BrowserURLBarSelectorsIDs } from '../../selectors/Browser/BrowserURLBar.selectors';

import { AddBookmarkViewSelectorsIDs } from '../../selectors/Browser/AddBookmarkView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';
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
    return Matchers.getElementByID(BrowserViewSelectorsIDs.URL_CLEAR_ICON);
  }
  get backToSafetyButton() {
    return Matchers.getElementByText(
      BrowserViewSelectorsText.BACK_TO_SAFETY_BUTTON,
    );
  }

  get returnHomeButton() {
    return Matchers.getElementByText(BrowserViewSelectorsText.RETURN_HOME);
  }

  get addFavourtiesButton() {
    return Matchers.getElementByText(
      BrowserViewSelectorsText.ADD_FAVORITES_BUTTON,
    );
  }
  get multiTabButton() {
    return Matchers.getElementByID(
      BrowserViewSelectorsIDs.MULTI_TAB_ADD_BUTTON,
    );
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

  async getFavoritesURL(url) {
    return Matchers.getElementByHref(url);
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

  async tapOpenNewTabButton() {
    await Gestures.waitAndTap(this.multiTabButton);
  }

  async tapNetworkAvatarButtonOnBrowser() {
    await Gestures.waitAndTap(this.networkAvatarButton);
  }

  async tapAddToFavoritesButton() {
    await Gestures.waitAndTap(this.addFavourtiesButton);
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

  async tapDappInFavorites(dappURL) {
    const myWebView = web(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID));
    const innerElement = myWebView.element(by.web.href(dappURL));
    // const tab = myWebView
    //   .element(by.web.cssSelector('.tab-list-item'))
    //   .atIndex(1)
    //   .tap();

    // // const elem = Matchers.getElementByHref(dappURL);
    // await myWebView
    //   .element(by.web.cssSelector('.tab-list-item'))
    //   .atIndex(1)
    //   .tap();

    if (device.getPlatform() === 'ios') {
      // Tapping on favourite iOS
      await Gestures.tap(innerElement);
    } else {
      // Tapping on favorite tap on Android
      await TestHelpers.tapAtPoint(BrowserViewSelectorsIDs.BROWSER_SCREEN_ID, {
        x: 274,
        y: 223,
      });
      await TestHelpers.tapAtPoint(BrowserViewSelectorsIDs.BROWSER_SCREEN_ID, {
        x: 180,
        y: 275,
      });
      // await Browser.waitForBrowserPageToLoad();
    }
  }

  async navigateToURL(url) {
    await Gestures.waitAndTap(this.clearURLButton);
    await Gestures.typeTextAndHideKeyboard(this.urlInputBoxID, url);
  }

  async waitForBrowserPageToLoad() {
    await TestHelpers.delay(5000);
  }

  async navigateToTestDApp() {
    await this.tapUrlInputBox();
    await this.navigateToURL(TEST_DAPP_LOCAL_URL);
  }
}

export default new Browser();
