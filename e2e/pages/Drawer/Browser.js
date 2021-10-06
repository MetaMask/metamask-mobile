import TestHelpers from '../../helpers';

const BROWSER_SCREEN_ID = 'browser-screen';
const BOTTOM_NAVIGATION_SEARCH_BAR_ID = 'search-button';
const URL_INPUT_BOX_ID = 'url-input';
const ANDROID_CLEAR_INPUT_BUTTON_ID = 'android-cancel-url-button';
const OPTIONS_BUTTON_ID = 'options-button';
const ADD_BOOKMARKS_SCREEN_ID = 'add-bookmark-screen';
const ADD_BOOKMARKS_BUTTON_ID = 'add-bookmark-confirm-button';
const HOME_BUTTON_ID = 'home-button';

export default class Browser {
	static async tapBrowser() {
		await TestHelpers.tapByText('Browser');
		await TestHelpers.delay(1000);
	}

	static async tapBottomSearchBar() {
		await TestHelpers.tap(BOTTOM_NAVIGATION_SEARCH_BAR_ID);
	}

	static async tapOptionsButton() {
		await TestHelpers.waitAndTap(OPTIONS_BUTTON_ID);
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
}
