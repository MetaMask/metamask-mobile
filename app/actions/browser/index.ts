import {
  BrowserActionTypes,
  type BrowserRequestLoadAction,
  type BrowserLoadEndAction,
  type BrowserLoadStartAction,
  type AddToViewedDappAction,
  type AddToHistoryAction,
  type ClearHistoryAction,
  type AddToWhitelistAction,
  type CloseAllTabsAction,
  type CreateNewTabAction,
  type CloseTabAction,
  type SetActiveTabAction,
  type UpdateTabAction,
  type StoreFaviconAction,
} from './types';

export * from './types';

/**
 * Adds a new entry to viewed dapps
 *
 * @param {string} hostname - Dapp hostname
 * @returns
 */
export function addToViewedDapp(hostname: string): AddToViewedDappAction {
  return {
    type: BrowserActionTypes.ADD_TO_VIEWED_DAPP,
    hostname,
  };
}

/**
 * Adds a new entry to the browser history
 *
 * @param {Object} website - The website that has been visited
 * @param {string} website.url - The website's url
 * @param {string} website.name - The website name
 */
export function addToHistory({
  url,
  name,
}: {
  url: string;
  name: string;
}): AddToHistoryAction {
  return {
    type: BrowserActionTypes.ADD_TO_BROWSER_HISTORY,
    url,
    name,
  };
}

/**
 * Clears the entire browser history
 */
export function clearHistory(): ClearHistoryAction {
  return {
    type: BrowserActionTypes.CLEAR_BROWSER_HISTORY,
    id: Date.now(),
  };
}

/**
 * Adds a new entry to the whitelist
 *
 * @param {string} url - The website's url
 */
export function addToWhitelist(url: string): AddToWhitelistAction {
  return {
    type: BrowserActionTypes.ADD_TO_BROWSER_WHITELIST,
    url,
  };
}

/**
 * Closes all the opened tabs
 */
export function closeAllTabs(): CloseAllTabsAction {
  return {
    type: BrowserActionTypes.CLOSE_ALL_TABS,
  };
}

/**
 * Creates a new tab
 *
 * @param {string} url - The website's url
 * @param {string} linkType - optional link type
 */
export function createNewTab(
  url: string,
  linkType: string,
): CreateNewTabAction {
  return {
    type: BrowserActionTypes.CREATE_NEW_TAB,
    url,
    linkType,
    id: Date.now(),
  };
}

/**
 * Closes an exiting tab
 *
 * @param {number} id - The Tab ID
 */
export function closeTab(id: string): CloseTabAction {
  return {
    type: BrowserActionTypes.CLOSE_TAB,
    id,
  };
}

/**
 * Selects an exiting tab
 *
 * @param {number} id - The Tab ID
 */
export function setActiveTab(id: string): SetActiveTabAction {
  return {
    type: BrowserActionTypes.SET_ACTIVE_TAB,
    id,
  };
}

/**
 * Selects an exiting tab
 *
 * @param {number} id - The Tab ID
 * @param {string} url - The website's url
 */
export function updateTab(
  id: string,
  data: { url: string; image?: string },
): UpdateTabAction {
  return {
    type: BrowserActionTypes.UPDATE_TAB,
    id,
    data,
  };
}

/**
 * Stores the favicon url using the origin as key
 * @param {Object} favicon - favicon to store
 * @param {string} favicon.origin - the origin of the favicon as key
 * @param {string} favicon.url - the favicon image url
 * @returns {{favicon, type: string}}
 */
export function storeFavicon({
  origin,
  url,
}: {
  origin: string;
  url: string;
}): StoreFaviconAction {
  return {
    type: BrowserActionTypes.STORE_FAVICON_URL,
    origin,
    url,
  };
}

/**
 * Triggers when the browser requests to load
 */
export function setBrowserRequestLoad(): BrowserRequestLoadAction {
  return {
    type: BrowserActionTypes.SET_BROWSER_REQUEST_LOAD,
  };
}

/**
 * Triggers when the browser starts load
 * @param url - The website's url
 */
export function setBrowserLoadStart(url: string): BrowserLoadStartAction {
  return {
    type: BrowserActionTypes.SET_BROWSER_LOAD_START,
    payload: {
      url,
    },
  };
}

/**
 * Triggers when the browser ends load
 * @param url - The website's url
 */
export function setBrowserLoadEnd(url: string): BrowserLoadEndAction {
  return {
    type: BrowserActionTypes.SET_BROWSER_LOAD_END,
    payload: {
      url,
    },
  };
}
