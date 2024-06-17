import enContent from '../../../locales/languages/en.json';
import ExternalSites from '../../resources/externalsites.json';
export const BrowserViewSelectorsIDs = {
  BROWSER_WEBVIEW_ID: 'browser-webview',
  AVATAR_IMAGE: 'network-avatar-image',
  DAPP_EIP1559_BUTTON: 'sendEIP1559Button',
  DAPP_CONNECT_BUTTON: 'connectButton',
  URL_INPUT: 'url-input',
  BROWSER_SCREEN_ID: 'browser-screen',
  TABS_NUMBER: 'show-tabs-number',
  BACK_BUTTON: 'back-arrow-button',
  HOME_BUTTON: 'home-button',
  FORWARD_BUTTON: 'go-forward-button',
  SEARCH_BUTTON: 'search-button',
  OPTIONS_BUTTON: 'options-button',
  ACCOUNT_BUTTON: 'navbar-account-button',
  TABS_BUTTON: 'show-tabs-button',
  CANCEL_BUTTON_ON_BROWSER_ID: 'cancel-url-button',
  URL_CLEAR_ICON: 'url-clear-icon',
};

export const BrowserViewSelectorsText = {
  ADD_FAVORITES_BUTTON: enContent.browser.add_to_favorites,
  BACK_TO_SAFETY_BUTTON: enContent.phishing.back_to_safety,
  CONFIRM_BUTTON: enContent.confirmation_modal.confirm_cta,
  RETURN_HOME: enContent.webview_error.return_home,
  METAMASK_TEST_DAPP_URL: 'metamask.github.io',
  CLOSE_ALL_BUTTON: enContent.browser.tabs_close_all,
};
export const BrowserViewSelectorsXPaths = {
  FAVORITE_TAB: `//div[@id='root']/div[@class='App']//ol//li[contains(text(), 'Favorites')]`,
  TEST_DAPP_TEXT: `//div[@id='root']/div[@class='App']//p[contains(text(), 'metamask.github.io/test-dapp/')]`,
  TEST_DAPP_LINK: `//a[contains(@href, '${ExternalSites.TEST_DAPP}')]`,
};
