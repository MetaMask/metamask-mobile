import TestHelpers from '../../helpers';
import {
  BrowserViewSelectorsIDs,
  BrowserViewSelectorsText,
  BrowserViewSelectorsXPaths,
} from '../../selectors/Browser/BrowserView.selectors';
import { AccountOverviewSelectorsIDs } from '../../selectors/Browser/AccountOverview.selectors';
import { BrowserURLBarSelectorsIDs } from '../../selectors/Browser/BrowserURLBar.selectors';
import { AddBookmarkViewSelectorsIDs } from '../../selectors/Browser/AddBookmarkView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { waitForTestDappToLoad } from '../../viewHelper';
import {
  getLocalTestDappUrl,
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
    await Gestures.waitAndTap(this.urlInputBoxID, {
      elemDescription: 'Browser - URL input box',
    });
  }

  async tapLocalHostDefaultAvatar(): Promise<void> {
    await Gestures.waitAndTap(this.DefaultAvatarImageForLocalHost, {
      elemDescription: 'Browser - Default avatar image for localhost',
    });
  }

  async tapBottomSearchBar(): Promise<void> {
    await Gestures.waitAndTap(this.searchButton, {
      elemDescription: 'Browser - Bottom search bar',
    });
  }

  async tapOptionsButton(): Promise<void> {
    await Gestures.waitAndTap(this.optionsButton, {
      elemDescription: 'Browser - Options button',
    });
  }

  async tapOpenAllTabsButton(): Promise<void> {
    await Gestures.waitAndTap(this.tabsButton, {
      elemDescription: 'Browser - Open all tabs button',
    });
  }

  async tapSecondTabButton(): Promise<void> {
    // the interger value is the tabID.
    // This value comes from the `browser` object in fixture builder
    const secondTab = Matchers.getElementByID('browser-tab-1749234797566');
    await Gestures.waitAndTap(secondTab, {
      elemDescription: 'Browser - Second tab button',
    });
  }

  async tapFirstTabButton(): Promise<void> {
    // the interger value is the tabID.
    // This value comes from the `browser` object in fixture builder
    const secondTab = Matchers.getElementByID('browser-tab-1692550481062');
    await Gestures.waitAndTap(secondTab, {
      elemDescription: 'Browser - First tab button',
    });
  }

  async tapCloseTabsButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeAllTabsButton, {
      elemDescription: 'Browser - Close all tabs button',
    });
  }

  async tapCloseSecondTabButton(): Promise<void> {
    // the interger value is the tabID.
    // This value comes from the `browser` object in fixture builder
    const secondTab = Matchers.getElementByID('tab-close-button-1749234797566');
    await Gestures.waitAndTap(secondTab, {
      elemDescription: 'Browser - Close second tab button',
    });
  }

  async tapOpenNewTabButton(): Promise<void> {
    await Gestures.waitAndTap(this.multiTabButton, {
      elemDescription: 'Browser - Open new tab button',
    });
  }

  async tapNetworkAvatarOrAccountButtonOnBrowser(): Promise<void> {
    await Gestures.waitAndTap(this.networkAvatarOrAccountButton, {
      elemDescription: 'Browser - Network avatar or account button',
    });
  }

  async tapAddToFavoritesButton(): Promise<void> {
    await Gestures.waitAndTap(this.addFavouritesButton, {
      elemDescription: 'Browser - Add to favorites button',
    });
  }

  async tapAddBookmarksButton(): Promise<void> {
    await Gestures.waitAndTap(this.addBookmarkButton, {
      elemDescription: 'Browser - Add bookmarks button',
    });
  }

  async tapHomeButton(): Promise<void> {
    await Gestures.waitAndTap(this.homeButton, {
      elemDescription: 'Browser - Home button',
    });
  }

  async tapBackToSafetyButton(): Promise<void> {
    await Gestures.waitAndTap(this.backToSafetyButton, {
      elemDescription: 'Browser - Back to safety button',
    });
  }

  async tapReturnHomeButton(): Promise<void> {
    await Gestures.waitAndTap(this.returnHomeButton, {
      elemDescription: 'Browser - Return home button',
    });
  }

  async tapDappInFavorites(): Promise<void> {
    const elemDescription = 'Browser - Tap on the test dapp in favorites tab';
    if (device.getPlatform() === 'ios') {
      await Gestures.waitAndTap(this.testDappURLInFavouritesTab, {
        elemDescription,
      });
    } else {
      await Gestures.waitAndTap(this.homePageFavouritesTab, {
        elemDescription,
      });
      await Gestures.waitAndTap(this.testDappURLInFavouritesTab, {
        elemDescription,
      });
    }
  }

  async navigateToURL(url: string): Promise<void> {
    await device.disableSynchronization(); // because animations makes typing into the browser slow
    await Gestures.typeText(
      this.urlInputBoxID as Promise<IndexableNativeElement>,
      url,
      {
        elemDescription: 'Browser - URL input box',
        hideKeyboard: true,
      },
    );
    await device.enableSynchronization(); // re-enabling synchronization
  }

  /**
   * @deprecated - please migrate to the new  Framework
   * @returns {Promise<void>}
   */
  async waitForBrowserPageToLoad(): Promise<void> {
    // eslint-disable-next-line no-restricted-syntax
    await TestHelpers.delay(5000);
  }

  async navigateToTestDApp(): Promise<void> {
    await this.tapUrlInputBox();
    await this.navigateToURL(getLocalTestDappUrl());
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
      `${getLocalTestDappUrl()}/request?method=eth_sendTransaction&params=${encodedParams}`,
    );
  }

  async reloadTab() {
    await this.tapUrlInputBox();

    const urlInputBox = (await this.urlInputBoxID) as IndexableNativeElement;
    await urlInputBox.typeText('\n');
  }
}

export default new Browser();
