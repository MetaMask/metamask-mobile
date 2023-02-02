import TestHelpers from '../../helpers';
import { strings } from '../../../locales/i18n';

export const BROWSER_SCREEN_ID = 'browser-screen';

const ANDROID_BROWSER_WEBVIEW_ID = 'browser-webview';
const ADD_BOOKMARKS_SCREEN_ID = 'add-bookmark-screen';
const ADD_BOOKMARKS_BUTTON_ID = 'add-bookmark-confirm-button';
const ANDROID_CLEAR_INPUT_BUTTON_ID = 'cancel-url-button';
const BOTTOM_NAVIGATION_SEARCH_BAR_ID = 'search-button';
const HOME_BUTTON_ID = 'home-button';
const GO_BACK_BUTTON_ID = 'go-back-button';
const OPTIONS_BUTTON_ID = 'options-button';
const URL_INPUT_BOX_ID = 'url-input';
const RETURN_HOME_TEXT = strings('webview_error.return_home');
const BACK_TO_SAFETY_TEXT = strings('phishing.back_to_safety');

export class Browser {
  static async tapUrlInputBox() {
    await TestHelpers.tapByText('home.metamask.io');
    await TestHelpers.delay(1000);
  }

  static async tapBottomSearchBar() {
    await TestHelpers.tap(BOTTOM_NAVIGATION_SEARCH_BAR_ID);
  }

  static async tapOptionsButton() {
    await TestHelpers.waitAndTap(OPTIONS_BUTTON_ID);
  }

  static async tapOpenTabButton() {
    await TestHelpers.tapByText('New tab');
  }

  static async tapAddToFavoritesButton() {
    await TestHelpers.tapByText('Add to Favorites');
  }

  static async tapAddBookmarksButton() {
    await TestHelpers.tap(ADD_BOOKMARKS_BUTTON_ID);
  }
  static async tapHomeButton() {
    await TestHelpers.tap(HOME_BUTTON_ID);
  }

  static async tapBackToSafetyButton() {
    await TestHelpers.tapByText(BACK_TO_SAFETY_TEXT);
  }
  static async tapReturnHomeButton() {
    await TestHelpers.tapByText(RETURN_HOME_TEXT);
  }
  static async tapBrowserBackButton() {
    // This action is android specific
    await TestHelpers.tap(GO_BACK_BUTTON_ID);
  }

  static async navigateToURL(url) {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.clearField(URL_INPUT_BOX_ID);
      await TestHelpers.typeTextAndHideKeyboard(URL_INPUT_BOX_ID, url);
      await TestHelpers.delay(2000);
    } else {
      await TestHelpers.tap(ANDROID_CLEAR_INPUT_BUTTON_ID);
      await TestHelpers.replaceTextInField(URL_INPUT_BOX_ID, url);
      await element(by.id(URL_INPUT_BOX_ID)).tapReturnKey();
    }
  }
  static async scrollToTakeTourOnBrowserPage() {
    // Scroll on browser to show tutorial box and tap to skip
    if (device.getPlatform() === 'ios') {
      await TestHelpers.swipe(BROWSER_SCREEN_ID, 'up');
    } else {
      await TestHelpers.checkIfExists(ANDROID_BROWSER_WEBVIEW_ID);
      await TestHelpers.swipe(ANDROID_BROWSER_WEBVIEW_ID, 'up');
      await TestHelpers.delay(1000);
    }
  }

  static async waitForBrowserPageToLoad() {
    await TestHelpers.delay(5000);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(BROWSER_SCREEN_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(BROWSER_SCREEN_ID);
  }

  static async isAddBookmarkScreenVisible() {
    await TestHelpers.checkIfVisible(ADD_BOOKMARKS_SCREEN_ID);
  }

  static async isAddBookmarkScreenNotVisible() {
    await TestHelpers.checkIfNotVisible(ADD_BOOKMARKS_SCREEN_ID);
  }

  static async isBrowserFavoriteVisible(browserFavoriteName) {
    await TestHelpers.checkIfElementWithTextIsVisible(browserFavoriteName);
  }

  static async isBackToSafetyButtonVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible('Back to safety');
  }
}
