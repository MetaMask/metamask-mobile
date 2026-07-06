import TestHelpers from '../../helpers';
import {
  BrowserViewSelectorsIDs,
  BrowserViewSelectorsText,
  BrowserViewSelectorsXPaths,
} from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import { AccountOverviewSelectorsIDs } from '../../../app/components/UI/AccountRightButton/AccountOverview.testIds';
import { BrowserURLBarSelectorsIDs } from '../../../app/components/UI/BrowserUrlBar/BrowserURLBar.testIds';
import { AddBookmarkViewSelectorsIDs } from '../../../app/components/Views/AddBookmark/AddBookmarkView.testIds';
import {
  getTestDappLocalUrl,
  getDappUrl,
} from '../../framework/fixtures/FixtureUtils';
import {
  EncapsulatedElementType,
  encapsulated,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { DEFAULT_TAB_ID } from '../../framework/Constants';
import { Assertions, Gestures, Matchers, Utilities } from '../../framework';
import { FrameworkDetector } from '../../framework/FrameworkDetector';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { getDriver } from '../../framework/PlaywrightUtilities';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';

const PORTFOLIO_HOST_PATTERN = /portfolio\.metamask\.io/i;
const DAPP_NAVIGATION_MAX_ATTEMPTS = 3;
const TAB_THUMBNAIL_POLL_MS = 500;
const TAB_THUMBNAIL_WAIT_MS = 10_000;
const DAPP_NAVIGATION_VERIFY_MS = 15_000;
/** Persisted browser tab id in tests/framework/fixtures/json/default-fixture.json */
const FIXTURE_DEFAULT_BROWSER_TAB_ID = 1692550481062;

interface TransactionParams {
  [key: string]: string | number | boolean;
}

class Browser {
  get reloadButton(): EncapsulatedElementType {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.RELOAD_BUTTON);
  }

  get bookmarkButton(): EncapsulatedElementType {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.BOOKMARK_BUTTON);
  }

  get newTabButton(): EncapsulatedElementType {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.NEW_TAB_BUTTON);
  }

  get closeBrowserButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      BrowserViewSelectorsIDs.BROWSER_CLOSE_BUTTON,
    );
  }

  // Legacy getters for backward compatibility with existing tests
  get homeButton(): EncapsulatedElementType {
    // Home button removed, but kept for backward compatibility
    // Tests using this should be updated
    return this.newTabButton;
  }

  get browserScreenID(): EncapsulatedElementType {
    // XCUITest / UiAutomator2 often report browser-screen container as not displayed
    // while the URL bar and WebView are visible. url-input is a reliable proxy.
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(BrowserViewSelectorsIDs.BROWSER_SCREEN_ID),
      appium: () =>
        PlaywrightMatchers.getElementByAccessibilityId(
          BrowserViewSelectorsIDs.URL_INPUT,
        ),
    });
  }

  get androidBrowserWebViewID(): EncapsulatedElementType {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID);
  }

  get addressBar(): EncapsulatedElementType {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.URL_INPUT);
  }

  get urlInputBoxID(): EncapsulatedElementType {
    return Matchers.getElementByID(BrowserURLBarSelectorsIDs.URL_INPUT);
  }

  get clearURLButton(): EncapsulatedElementType {
    return Matchers.getElementByID(BrowserURLBarSelectorsIDs.URL_CLEAR_ICON);
  }

  get cancelUrlInputButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      BrowserURLBarSelectorsIDs.CANCEL_BUTTON_ON_BROWSER_ID,
    );
  }

  get backToSafetyButton(): EncapsulatedElementType {
    return Matchers.getElementByText(
      BrowserViewSelectorsText.BACK_TO_SAFETY_BUTTON,
    );
  }

  get returnHomeButton(): EncapsulatedElementType {
    return Matchers.getElementByText(BrowserViewSelectorsText.RETURN_HOME);
  }

  get addFavouritesButton(): EncapsulatedElementType {
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

  get multiTabButton(): EncapsulatedElementType {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.ADD_NEW_TAB);
  }

  get DefaultAvatarImageForLocalHost(): EncapsulatedElementType {
    return Matchers.getElementByLabel('L');
  }

  get networkAvatarOrAccountButton(): EncapsulatedElementType {
    return Matchers.getElementByID(AccountOverviewSelectorsIDs.ACCOUNT_BUTTON);
  }

  get addBookmarkButton(): EncapsulatedElementType {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON)
      : Matchers.getElementByLabel(AddBookmarkViewSelectorsIDs.CONFIRM_BUTTON);
  }

  get tabsNumber(): EncapsulatedElementType {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.TABS_NUMBER);
  }

  get closeAllTabsButton(): EncapsulatedElementType {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.CLOSE_ALL_TABS);
  }

  get noTabsMessage(): EncapsulatedElementType {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.NO_TABS_MESSAGE);
  }

  async getFavoritesURL(url: string): Promise<SystemElement> {
    return Matchers.getElementByHref(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      url,
    );
  }

  async tapUrlInputBox(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        // Detox iOS checks toExist(), not toBeVisible(), so it can tap the
        // TextInput even while opacity:0 (see Utilities.checkElementReadyState).
        await Gestures.waitAndTap(this.urlInputBoxID, {
          elemDescription: 'URL input box',
        });
      },
      appium: async () => {
        const urlBar = await asPlaywrightElement(this.addressBar);
        const location = await urlBar.unwrap().getLocation();
        const size = await urlBar.unwrap().getSize();
        await getDriver().execute('mobile: tap', {
          x: Math.floor(location.x + size.width * 0.5),
          y: Math.floor(location.y + size.height / 2),
        });

        const focusedEditor = PlatformDetector.isAndroid()
          ? this.urlInputBoxID
          : this.cancelUrlInputButton;
        await Assertions.expectElementToBeVisible(focusedEditor, {
          elemDescription: PlatformDetector.isAndroid()
            ? 'URL input box (focused)'
            : 'Cancel button (URL bar focused)',
          timeout: 10000,
        });
      },
    });
  }

  async tapLocalHostDefaultAvatar(): Promise<void> {
    await Gestures.waitAndTap(this.DefaultAvatarImageForLocalHost, {
      elemDescription: 'Local host default avatar',
    });
  }

  async tapReloadButton(): Promise<void> {
    await Gestures.waitAndTap(this.reloadButton, {
      elemDescription: 'Reload button',
    });
  }

  async tapBookmarkButton(): Promise<void> {
    await Gestures.waitAndTap(this.bookmarkButton, {
      elemDescription: 'Bookmark button',
    });
  }

  async tapNewTabButtonBottomBar(): Promise<void> {
    await Gestures.waitAndTap(this.newTabButton, {
      elemDescription: 'New tab button in bottom bar',
    });
  }

  async tapCloseBrowserButton(): Promise<void> {
    // The close button (`browser-tab-close-button`) is conditionally rendered
    // and is removed from the tree while the URL bar is focused (i.e. the
    // URL editor / "Recents" autocomplete overlay is open). After flows that
    // dismiss a modal (e.g. transaction confirmation) the URL bar focus can
    // be restored under RN 0.81 / React 19, leaving the close button missing.
    // Defensively dismiss the URL editor if the Cancel button is visible.
    if (FrameworkDetector.isAppium()) {
      await PlaywrightContextHelpers.switchToNativeContext();
    }
    await this.dismissUrlEditorIfOpen();
    await Assertions.expectElementToBeVisible(this.closeBrowserButton, {
      description: 'Close browser button should be visible',
      timeout: 15_000,
    });
    await Gestures.waitAndTap(this.closeBrowserButton, {
      elemDescription: 'Close browser button',
    });
  }

  /**
   * Tap the URL bar "Cancel" button if the URL editor / autocomplete overlay
   * is currently open. Used defensively before tapping any of the top-bar
   * action buttons (network/account avatar, close button, etc.) which are
   * unmounted while the URL editor is focused.
   */
  async dismissUrlEditorIfOpen(): Promise<void> {
    if (await Utilities.isElementVisible(this.cancelUrlInputButton, 1000)) {
      await Gestures.waitAndTap(this.cancelUrlInputButton, {
        elemDescription: 'Cancel URL input (dismiss URL editor)',
      });
    }
  }

  /**
   * If the "Opened tabs" grid is shown, open the fixture tab or any existing tab.
   * Avoids tapping Back (returns to the active tab, often Portfolio) or "+" too early
   * (opens a new Portfolio homepage tab).
   */
  async ensureSingleBrowserTabView(): Promise<void> {
    if (await Utilities.isElementVisible(this.addressBar, 2000)) {
      return;
    }

    const openedTabsHeader = Matchers.getElementByID(
      BrowserViewSelectorsIDs.TABS_OPENED_TITLE,
    );
    const isInTabListView = await Utilities.isElementVisible(
      openedTabsHeader,
      2000,
    );
    if (!isInTabListView) {
      return;
    }

    const fixtureTab = Matchers.getElementByID(
      `browser-tab-${FIXTURE_DEFAULT_BROWSER_TAB_ID}`,
    );
    if (await Utilities.isElementVisible(fixtureTab, 3000)) {
      await Gestures.waitAndTap(fixtureTab, {
        elemDescription: 'Fixture browser tab from persisted state',
      });
      await Assertions.expectElementToBeVisible(this.addressBar, {
        description: 'Browser URL bar after opening fixture tab',
        timeout: 10_000,
      });
      return;
    }

    const deadline = Date.now() + TAB_THUMBNAIL_WAIT_MS;
    while (Date.now() < deadline) {
      const firstTab = Matchers.getElementByID(
        BrowserViewSelectorsIDs.TABS_ITEM_REGEX,
        0,
      );
      if (await Utilities.isElementVisible(firstTab, 500)) {
        await Gestures.waitAndTap(firstTab, {
          elemDescription: 'First browser tab (select to open single-tab view)',
        });
        await Assertions.expectElementToBeVisible(this.addressBar, {
          description: 'Browser URL bar after opening first tab',
          timeout: 10_000,
        });
        return;
      }
      await TestHelpers.delay(TAB_THUMBNAIL_POLL_MS);
    }

    throw new Error(
      'Browser tab list is open but no tab thumbnail was found to select',
    );
  }

  private async getUrlBarDisplayText(): Promise<string> {
    if (FrameworkDetector.isAppium()) {
      const urlInput = await asPlaywrightElement(this.urlInputBoxID);
      if (await urlInput.isVisible()) {
        const inputText = await urlInput.textContent();
        if (inputText.trim().length > 0) {
          return inputText;
        }
      }

      const urlBar = await asPlaywrightElement(this.addressBar);
      return (await urlBar.textContent()) ?? '';
    }

    const urlBar = (await this.addressBar) as Detox.IndexableNativeElement;
    return urlBar.getAttributes().then((attrs) => {
      if (typeof attrs === 'string') return attrs;
      if ('text' in attrs && typeof attrs.text === 'string') return attrs.text;
      if ('label' in attrs && typeof attrs.label === 'string')
        return attrs.label;
      return '';
    });
  }

  private urlBarTextMatchesDapp(urlBarText: string, dappUrl: string): boolean {
    const normalized = urlBarText.toLowerCase();
    if (PORTFOLIO_HOST_PATTERN.test(normalized)) {
      return false;
    }

    let port = '';
    try {
      port = new URL(dappUrl).port;
    } catch {
      port = '';
    }

    return (
      normalized.includes('localhost') ||
      normalized.includes('127.0.0.1') ||
      normalized.includes('10.0.2.2') ||
      (port.length > 0 && normalized.includes(port))
    );
  }

  private async waitForUrlBarToShowDapp(
    dappUrl: string,
    timeoutMs = DAPP_NAVIGATION_VERIFY_MS,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const urlBarText = await this.getUrlBarDisplayText();
      if (this.urlBarTextMatchesDapp(urlBarText, dappUrl)) {
        return true;
      }
      await TestHelpers.delay(500);
    }

    return false;
  }

  /** Confirms the dapp WebView tab is loaded (more reliable than native URL bar text). */
  private async waitForDappWebViewContext(
    dappUrl: string,
    timeoutMs = DAPP_NAVIGATION_VERIFY_MS,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        return false;
      }

      try {
        await Promise.race([
          PlaywrightContextHelpers.switchToWebViewContext(dappUrl),
          new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error('WebView context switch timed out')),
              Math.min(remainingMs, 5_000),
            );
          }),
        ]);
        await PlaywrightContextHelpers.switchToNativeContext();
        return true;
      } catch {
        await TestHelpers.delay(500);
      }
    }

    return false;
  }

  private async waitForDappNavigation(dappUrl: string): Promise<boolean> {
    if (FrameworkDetector.isAppium() && PlatformDetector.isAndroid()) {
      const webViewLoaded = await this.waitForDappWebViewContext(dappUrl);
      if (webViewLoaded) {
        return true;
      }
    }

    return this.waitForUrlBarToShowDapp(dappUrl);
  }

  // Legacy methods for backward compatibility with existing tests
  async tapBottomSearchBar(): Promise<void> {
    // Search button removed from bottom bar
    // This is now handled by tapping the URL bar directly
    await this.tapUrlInputBox();
  }

  async tapOpenAllTabsButton({
    delay,
  }: {
    delay?: number;
  } = {}): Promise<void> {
    // Tabs button moved from bottom bar to URL bar
    const tabsButton = Matchers.getElementByID(
      BrowserViewSelectorsIDs.TABS_BUTTON,
    );
    await Gestures.waitAndTap(tabsButton, {
      elemDescription: 'Tabs button in URL bar',
      delay,
    });
  }

  async tapHomeButton(): Promise<void> {
    // Home button removed from bottom bar
    // No direct replacement - this is a no-op for backward compatibility
    // Tests should be updated to navigate differently
  }

  async tapSecondTabButton(): Promise<void> {
    // We start from the base tab id set by the fixtures and add 1 to get the second tab id
    const secondTabId = DEFAULT_TAB_ID + 1;
    // the interger value is the tabID.
    // This value comes from the `browser` object in fixture builder
    const secondTab = Matchers.getElementByID(`browser-tab-${secondTabId}`);
    await Gestures.waitAndTap(secondTab, {
      elemDescription: 'Second tab button',
    });
  }

  async tapFirstTabButton(): Promise<void> {
    // the interger value is the tabID.
    // This value comes from the `browser` object in fixture builder
    const secondTab = Matchers.getElementByID('browser-tab-1692550481062');
    await Gestures.waitAndTap(secondTab, {
      elemDescription: 'First tab button',
    });
  }

  async tapCloseTabsButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeAllTabsButton, {
      elemDescription: 'Close all tabs button',
    });
  }

  async tapCloseSecondTabButton(): Promise<void> {
    // We start from the base tab id set by the fixtures and add 1 to get the second tab id
    const secondTabId = DEFAULT_TAB_ID + 1;
    // the interger value is the tabID.
    // This value comes from the `browser` object in fixture builder
    const secondTab = Matchers.getElementByID(
      `tab-close-button-${secondTabId}`,
    );
    await Gestures.waitAndTap(secondTab, {
      elemDescription: 'Close second tab button',
    });
  }

  async tapOpenNewTabButton(): Promise<void> {
    await Gestures.waitAndTap(this.multiTabButton, {
      elemDescription: 'Open new tab button',
    });
  }

  async tapNetworkAvatarOrAccountButtonOnBrowser(): Promise<void> {
    await Gestures.waitAndTap(this.networkAvatarOrAccountButton, {
      elemDescription: 'Network avatar or account button',
    });
  }

  async tapAddToFavoritesButton(): Promise<void> {
    await Gestures.waitAndTap(this.addFavouritesButton, {
      elemDescription: 'Add to favorites button',
    });
  }

  async tapAddBookmarksButton(): Promise<void> {
    await Gestures.waitAndTap(this.addBookmarkButton, {
      elemDescription: 'Add bookmarks button',
    });
  }

  async tapBackToSafetyButton(): Promise<void> {
    await Gestures.waitAndTap(this.backToSafetyButton, {
      elemDescription: 'Back to safety button',
    });
  }

  async tapReturnHomeButton(): Promise<void> {
    await Gestures.waitAndTap(this.returnHomeButton, {
      elemDescription: 'Return home button',
    });
  }

  async tapDappInFavorites(): Promise<void> {
    if (device.getPlatform() === 'ios') {
      await Gestures.tap(this.testDappURLInFavouritesTab, {
        elemDescription: 'Test dapp URL in favorites tab',
      });
    } else {
      await Gestures.tap(this.homePageFavouritesTab, {
        elemDescription: 'Home page favorites tab',
      });
      await Gestures.tap(this.testDappURLInFavouritesTab, {
        elemDescription: 'Test dapp URL in favorites tab',
      });
    }
  }

  async expectUrlNotEqualTo(text: string, description?: string): Promise<void> {
    await Assertions.expectElementToNotHaveText(this.urlInputBoxID, text, {
      description: description ?? `URL input box text is not "${text}"`,
    });
  }

  async navigateToURL(
    url: string,
    options: { skipUrlEditorDismissal?: boolean } = {},
  ): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.typeText(this.urlInputBoxID, url, {
          hideKeyboard: true,
          elemDescription: 'URL input box',
        });
        if (!options.skipUrlEditorDismissal) {
          if (
            await Utilities.isElementVisible(this.cancelUrlInputButton, 1000)
          ) {
            await Gestures.waitAndTap(this.cancelUrlInputButton, {
              elemDescription: 'Cancel URL input (dismiss URL editor)',
            });
          }
        }
      },
      appium: async () => {
        await Assertions.expectElementToBeVisible(this.urlInputBoxID, {
          elemDescription: 'URL input box (focused)',
          timeout: 5000,
        });
        const urlInput = await asPlaywrightElement(this.urlInputBoxID);
        if (PlatformDetector.isAndroid()) {
          // clearValue() can hang when Appium IME is unavailable on CI emulators.
          await urlInput.fill(url);
          await PlaywrightGestures.submitAndroidUrlBar();
        } else {
          await urlInput.clear();
          await urlInput.fill(url);
          await PlaywrightGestures.tapKeyboardReturnKey('Go');
        }
        // Allow WebView navigation to start before dismissing the URL editor.
        if (PlatformDetector.isAndroid()) {
          await TestHelpers.delay(2000);
        }
        if (!options.skipUrlEditorDismissal) {
          if (
            await Utilities.isElementVisible(this.cancelUrlInputButton, 1000)
          ) {
            await Gestures.waitAndTap(this.cancelUrlInputButton, {
              elemDescription: 'Cancel URL input (dismiss URL editor)',
            });
          }
        }
      },
    });
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
    const dappUrl = getDappUrl(0);

    for (let attempt = 1; attempt <= DAPP_NAVIGATION_MAX_ATTEMPTS; attempt++) {
      await this.dismissUrlEditorIfOpen();
      await this.tapUrlInputBox();
      await this.navigateToURL(dappUrl, { skipUrlEditorDismissal: true });

      const navigated = await this.waitForDappNavigation(dappUrl);

      if (navigated) {
        await this.dismissUrlEditorIfOpen();
        if (FrameworkDetector.isAppium() && PlatformDetector.isIOS()) {
          await PlaywrightContextHelpers.scrollWebViewToTop(dappUrl);
        }
        return;
      }

      if (attempt === DAPP_NAVIGATION_MAX_ATTEMPTS) {
        throw new Error(
          `Failed to navigate to test dapp at ${dappUrl} after ${DAPP_NAVIGATION_MAX_ATTEMPTS} attempts (URL bar still shows Portfolio or another page)`,
        );
      }
    }
  }

  async navigateToSecondTestDApp(): Promise<void> {
    await this.tapUrlInputBox();
    await this.navigateToURL(getDappUrl(1));
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
      `${getTestDappLocalUrl()}/request?method=eth_sendTransaction&params=${encodedParams}`,
    );
  }

  async reloadTab() {
    await this.tapUrlInputBox();

    const urlInputBox = (await this.urlInputBoxID) as IndexableNativeElement;
    await urlInputBox.typeText('\n');
  }
}

export default new Browser();
