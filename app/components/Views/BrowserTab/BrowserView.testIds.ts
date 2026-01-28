import enContent from '../../../../locales/languages/en.json';
import ExternalSites from '../../../../tests/resources/externalsites.json';

export const BrowserViewSelectorsIDs = {
  BROWSER_WEBVIEW_ID: 'browser-webview',
  TABS_COMPONENT: 'tabs-component',
  AVATAR_IMAGE: 'network-avatar-image',
  URL_INPUT: 'url-input',
  BROWSER_SCREEN_ID: 'browser-screen',
  TABS_NUMBER: 'show-tabs-number',
  BACK_BUTTON: 'back-arrow-button',
  FORWARD_BUTTON: 'go-forward-button',
  RELOAD_BUTTON: 'browser-reload-button',
  BOOKMARK_BUTTON: 'browser-bookmark-button',
  NEW_TAB_BUTTON: 'browser-new-tab-button',
  TABS_BUTTON: 'browser-tabs-button',
  BROWSER_CLOSE_BUTTON: 'browser-tab-close-button',
  ADD_NEW_TAB: 'tabs_add',
  CLOSE_ALL_TABS: 'tabs_close_all',
  NO_TABS_MESSAGE: 'no-tabs-message',
  DONE_BUTTON: 'tabs_done',
} as const;

export const BrowserViewSelectorsText = {
  BACK_TO_SAFETY_BUTTON: enContent.phishing.back_to_safety,
  RETURN_HOME: enContent.webview_error.return_home,
} as const;

export const BrowserViewSelectorsXPaths = {
  FAVORITE_TAB: `//div[@id='root']/div[@class='App']//ol//li[contains(text(), 'Favorites')]`,
  TEST_DAPP_TEXT: '//a[@href="https://metamask.github.io/test-dapp/"]',
  TEST_DAPP_LINK: `//a[contains(@href, '${ExternalSites.TEST_DAPP}')]`,
} as const;

export type BrowserViewSelectorsIDsType = typeof BrowserViewSelectorsIDs;
export type BrowserViewSelectorsTextType = typeof BrowserViewSelectorsText;
export type BrowserViewSelectorsXPathsType = typeof BrowserViewSelectorsXPaths;
