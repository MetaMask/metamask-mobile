import TestHelpers from '../../helpers';
import {
  BrowserViewSelectorsIDs,
  BrowserViewSelectorsText,
  BrowserViewSelectorsXPaths,
} from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import { AccountOverviewSelectorsIDs } from '../../../app/components/UI/AccountRightButton/AccountOverview.testIds';
import { BrowserURLBarSelectorsIDs } from '../../../app/components/UI/BrowserUrlBar/BrowserURLBar.testIds';
import { AddBookmarkViewSelectorsIDs } from '../../../app/components/Views/AddBookmark/AddBookmarkView.testIds';
import { getDappUrl } from '../../framework/fixtures/FixtureUtils';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';
import { DEFAULT_TAB_ID } from '../../framework/Constants';
import {
  Assertions,
  Gestures,
  Matchers,
  Utilities,
  asPlaywrightElement,
  encapsulated,
  sleep,
} from '../../framework';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import { FrameworkDetector } from '../../framework/FrameworkDetector';
import { executeMobileDeepLink } from '../../framework/PlaywrightUtilities';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { openUrlInBrowserView } from '../../flows/browser.flow';

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
    return Matchers.getElementByID(BrowserViewSelectorsIDs.BROWSER_SCREEN_ID);
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

  /**
   * Tap target for the URL bar when it is unfocused. The visible URL text lives
   * in the `url-input` wrapper; the TextInput testID stays hidden until focused.
   * On Android Appium, tap the displayed URL text so `onPressUrlText` runs focus().
   */
  get urlBarTapTarget(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(BrowserURLBarSelectorsIDs.URL_INPUT),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementByXPath(
            `//*[contains(@resource-id,'${BrowserViewSelectorsIDs.URL_INPUT}')]//*[contains(@text,'http') or contains(@text,'localhost')]`,
          ),
        ios: () =>
          PlaywrightMatchers.getElementById(
            BrowserURLBarSelectorsIDs.URL_INPUT,
          ),
      },
    });
  }

  /**
   * Editable URL field after the bar is focused (Android needs the inner EditText).
   */
  get urlBarTextInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(BrowserURLBarSelectorsIDs.URL_INPUT),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            BrowserURLBarSelectorsIDs.URL_INPUT,
            { exact: false },
          ),
        ios: () =>
          PlaywrightMatchers.getElementById(
            BrowserURLBarSelectorsIDs.URL_INPUT,
          ),
      },
    });
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
    return Matchers.getElementByID('tabs_close_all');
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
        await Gestures.waitAndTap(this.urlInputBoxID, {
          elemDescription: 'URL input box',
        });
      },
      appium: async () => {
        await openUrlInBrowserView();
      },
    });
  }

  /**
   * `dapp://` deeplinks are upgraded to HTTPS in `handleDappUrl` — local test
   * dapps are HTTP-only (`http://localhost:8085`), so they must use the URL bar.
   */
  private requiresHttpUrlBarNavigation(url: string): boolean {
    return /^http:\/\//i.test(url);
  }

  /**
   * Navigate via the browser URL bar (preserves `http://` scheme).
   */
  private async navigateToUrlViaUrlBarAppium(url: string): Promise<void> {
    await this.tapUrlInputBox();

    const input = await asPlaywrightElement(this.urlBarTextInput);
    await input.waitForDisplayed({ timeout: 10_000 });
    await input.clear();
    // Trailing `\n` triggers React Native `onSubmitEditing` (returnKeyType="go").
    await PlaywrightGestures.typeText(input, `${url}\n`);

    const settleMs = process.env.CI === 'true' ? 8_000 : 3_000;
    await sleep(settleMs);
  }

  /**
   * Opens a URL via the in-app dapp:// deeplink handler (bypasses the URL bar).
   * Reliable on Appium where the URL TextInput is often not exposed.
   */
  private async navigateToUrlViaDeeplink(url: string): Promise<void> {
    const hostAndPath = url.replace(/^https?:\/\//, '');
    const deeplink = `dapp://${hostAndPath}`;

    await executeMobileDeepLink(deeplink);
    const isAndroidCi =
      FrameworkDetector.isAppium() &&
      PlatformDetector.isAndroid() &&
      process.env.CI === 'true';
    const settleMs = isAndroidCi ? 8_000 : 3_000;
    await sleep(settleMs);
  }

  private async typeUrlAppium(url: string): Promise<void> {
    if (this.requiresHttpUrlBarNavigation(url)) {
      await this.navigateToUrlViaUrlBarAppium(url);
      return;
    }
    await this.navigateToUrlViaDeeplink(url);
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
    await this.dismissUrlEditorIfOpen();

    if (FrameworkDetector.isAppium()) {
      const closeBtn = await PlaywrightMatchers.getElementById(
        BrowserViewSelectorsIDs.BROWSER_CLOSE_BUTTON,
      );
      await PlaywrightGestures.waitAndTap(closeBtn, { timeout: 10_000 });
      return;
    }

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
    if (FrameworkDetector.isAppium()) {
      await this.typeUrlAppium(url);
      return;
    }
    await Gestures.replaceText(this.urlInputBoxID, url, {
      elemDescription: 'URL input box',
    });
    await Gestures.typeText(this.urlInputBoxID, '\n', {
      clearFirst: false,
      hideKeyboard: false,
      elemDescription: 'URL input submit',
    });

    // After typing the URL + "\n", `onSubmitEditing` triggers navigation but
    // does not always blur the URL bar `TextInput` under RN 0.81 / React 19
    // on Android. The result is that the URL editor "Cancel" button stays
    // mounted while the navigation completes, and the right-side action
    // buttons in the top bar (close, network/account avatar) remain hidden.
    // Defensively tap Cancel to drop the URL bar back into its non-editing
    // state so subsequent gestures can target those buttons.
    //
    // Callers can opt-out via `skipUrlEditorDismissal: true` when the
    // dismissal would race with concurrent app work that breaks Detox sync —
    // notably `browser-phishing.spec.ts`, where phishing detection triggers
    // AsyncStorage v2 writes that interact badly with Detox's
    // `AsyncStorageIdlingResource` if dismissal taps land on top of them.
    if (!options.skipUrlEditorDismissal) {
      if (await Utilities.isElementVisible(this.cancelUrlInputButton, 1000)) {
        await Gestures.waitAndTap(this.cancelUrlInputButton, {
          elemDescription: 'Cancel URL input (dismiss URL editor)',
        });
      }
    }
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
    // Appium: Cancel dismiss resets the bar to the fixture tab URL (…/health-check)
    // if navigation has not committed yet — skip until the dapp page has loaded.
    // Detox: keep default dismissal so top-bar controls (network avatar, close) stay tappable.
    const navigateOptions = FrameworkDetector.isAppium()
      ? { skipUrlEditorDismissal: true as const }
      : {};
    await this.navigateToURL(getDappUrl(0), navigateOptions);
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
      `${getDappUrl(0)}/request?method=eth_sendTransaction&params=${encodedParams}`,
    );
  }

  async reloadTab() {
    await this.tapUrlInputBox();

    const urlInputBox = (await this.urlInputBoxID) as IndexableNativeElement;
    await urlInputBox.typeText('\n');
  }
}

export default new Browser();
