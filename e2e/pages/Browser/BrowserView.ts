import TestHelpers from '../../helpers';
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
import {
  TEST_DAPP_LOCAL_URL,
  getSecondTestDappLocalUrl,
} from '../../fixtures/utils';

interface TransactionParams {
  [key: string]: string | number | boolean;
}

class Browser {
  get searchButton(): DetoxElement {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.SEARCH_BUTTON);
  }

  get optionsButton(): DetoxElement {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.OPTIONS_BUTTON);
  }

  get tabsButton(): DetoxElement {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.TABS_BUTTON);
  }

  get homeButton(): DetoxElement {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.HOME_BUTTON);
  }

  get browserScreenID(): DetoxElement {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.BROWSER_SCREEN_ID);
  }

  get androidBrowserWebViewID(): DetoxElement {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID);
  }

  get addressBar(): DetoxElement {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.URL_INPUT);
  }

  get urlInputBoxID(): DetoxElement {
    return Matchers.getElementByID(BrowserURLBarSelectorsIDs.URL_INPUT);
  }

  get clearURLButton(): DetoxElement {
    return Matchers.getElementByID(BrowserURLBarSelectorsIDs.URL_CLEAR_ICON);
  }

  get backToSafetyButton(): DetoxElement {
    return Matchers.getElementByText(
      BrowserViewSelectorsText.BACK_TO_SAFETY_BUTTON,
    );
  }

  get returnHomeButton(): DetoxElement {
    return Matchers.getElementByText(BrowserViewSelectorsText.RETURN_HOME);
  }

  get addFavouritesButton(): DetoxElement {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.ADD_NEW_TAB);
  }

  get homePageFavouritesTab(): WebElement {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      BrowserViewSelectorsXPaths.FAVORITE_TAB,
    );
  }

  get testDappURLInFavouritesTab(): WebElement {
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

  get multiTabButton(): DetoxElement {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.ADD_NEW_TAB);
  }

  get DefaultAvatarImageForLocalHost(): DetoxElement {
    return Matchers.getElementByLabel('L');
  }

  get networkAvatarOrAccountButton(): DetoxElement {
    return Matchers.getElementByID(AccountOverviewSelectorsIDs.ACCOUNT_BUTTON);
  }

  get addBookmarkButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON)
      : Matchers.getElementByLabel(AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON);
  }

  get tabsNumber(): DetoxElement {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.TABS_NUMBER);
  }

  get closeAllTabsButton(): DetoxElement {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.CLOSE_ALL_TABS);
  }

  get noTabsMessage(): DetoxElement {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.NO_TABS_MESSAGE);
  }

  async getFavoritesURL(url: string): Promise<SystemElement> {
    return Matchers.getElementByHref(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      url,
    );
  }

  async tapUrlInputBox(): Promise<void> {
    await Gestures.waitAndTap(this.urlInputBoxID);
  }

  async tapLocalHostDefaultAvatar(): Promise<void> {
    await Gestures.waitAndTap(this.DefaultAvatarImageForLocalHost);
  }

  async tapBottomSearchBar(): Promise<void> {
    await Gestures.waitAndTap(this.searchButton);
  }

  async tapOptionsButton(): Promise<void> {
    await Gestures.waitAndTap(this.optionsButton);
  }

  async tapOpenAllTabsButton(): Promise<void> {
    await Gestures.waitAndTap(this.tabsButton, { delayBeforeTap: 4000 });
  }

  async tapSecondTabButton(): Promise<void> {
    // the interger value is the tabID.
    // This value comes from the `browser` object in fixture builder
    const secondTab = Matchers.getElementByID('browser-tab-1749234797566');
    await Gestures.waitAndTap(secondTab);
  }

  async tapFirstTabButton(): Promise<void> {
    // the interger value is the tabID.
    // This value comes from the `browser` object in fixture builder
    const secondTab = Matchers.getElementByID('browser-tab-1692550481062');
    await Gestures.waitAndTap(secondTab);
  }

  async tapCloseTabsButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeAllTabsButton);
  }

  async tapCloseSecondTabButton(): Promise<void> {
    // the interger value is the tabID.
    // This value comes from the `browser` object in fixture builder
    const secondTab = Matchers.getElementByID('tab-close-button-1749234797566');
    await Gestures.waitAndTap(secondTab);
  }

  async tapOpenNewTabButton(): Promise<void> {
    await Gestures.waitAndTap(this.multiTabButton);
  }

  async tapNetworkAvatarOrAccountButtonOnBrowser(): Promise<void> {
    await TestHelpers.delay(4000);
    await Gestures.waitAndTap(this.networkAvatarOrAccountButton);
  }

  async tapAddToFavoritesButton(): Promise<void> {
    await Gestures.waitAndTap(this.addFavouritesButton);
  }

  async tapAddBookmarksButton(): Promise<void> {
    await Gestures.waitAndTap(this.addBookmarkButton);
  }

  async tapHomeButton(): Promise<void> {
    await Gestures.waitAndTap(this.homeButton);
  }

  async tapBackToSafetyButton(): Promise<void> {
    await Gestures.waitAndTap(this.backToSafetyButton);
  }

  async tapReturnHomeButton(): Promise<void> {
    await Gestures.waitAndTap(this.returnHomeButton);
  }

  async tapDappInFavorites(): Promise<void> {
    if (device.getPlatform() === 'ios') {
      await Gestures.tapWebElement(this.testDappURLInFavouritesTab);
    } else {
      await Gestures.tapWebElement(this.homePageFavouritesTab);
      await Gestures.tapWebElement(this.testDappURLInFavouritesTab);
    }
  }

  async navigateToURL(url: string): Promise<void> {
    await device.disableSynchronization(); // because animations makes typing into the browser slow
    await Gestures.typeTextAndHideKeyboard(
      this.urlInputBoxID as Promise<IndexableNativeElement>,
      url,
    );
    await device.enableSynchronization(); // re-enabling synchronization
  }

  async waitForBrowserPageToLoad(): Promise<void> {
    await TestHelpers.delay(5000);
  }

  async navigateToTestDApp(): Promise<void> {
    await this.tapUrlInputBox();
    await this.navigateToURL(TEST_DAPP_LOCAL_URL);
    await waitForTestDappToLoad();
  }

  async navigateToSecondTestDApp(): Promise<void> {
    await this.tapUrlInputBox();
    await this.navigateToURL(getSecondTestDappLocalUrl());
    await waitForTestDappToLoad();
  }

  async navigateToTestDAppTransaction({
    transactionParams,
  }: {
    transactionParams: TransactionParams;
  }): Promise<void> {
    // Intentionally open the test dapp first to avoid flakiness
    await this.navigateToTestDApp();
    await this.tapUrlInputBox();
    const encodedParams = encodeURIComponent(JSON.stringify(transactionParams));
    await this.navigateToURL(
      `${TEST_DAPP_LOCAL_URL}/request?method=eth_sendTransaction&params=${encodedParams}`,
    );
  }

  async reloadTab() {
    await this.tapUrlInputBox();

    const urlInputBox = (await this.urlInputBoxID) as IndexableNativeElement;
    await urlInputBox.typeText('\n');
  }
}

export default new Browser();
