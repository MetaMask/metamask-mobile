/**
 * Browser actions for Redux
 */
export enum BrowserActionTypes {
  ADD_TO_VIEWED_DAPP = 'ADD_TO_VIEWED_DAPP',
  SET_BROWSER_REQUEST_LOAD = 'SET_BROWSER_REQUEST_LOAD',
  SET_BROWSER_LOAD_START = 'SET_BROWSER_LOAD_START',
  SET_BROWSER_LOAD_END = 'SET_BROWSER_LOAD_END',
  ADD_TO_BROWSER_HISTORY = 'ADD_TO_BROWSER_HISTORY',
  CLEAR_BROWSER_HISTORY = 'CLEAR_BROWSER_HISTORY',
  ADD_TO_BROWSER_WHITELIST = 'ADD_TO_BROWSER_WHITELIST',
  CLOSE_ALL_TABS = 'CLOSE_ALL_TABS',
  CREATE_NEW_TAB = 'CREATE_NEW_TAB',
  CLOSE_TAB = 'CLOSE_TAB',
  SET_ACTIVE_TAB = 'SET_ACTIVE_TAB',
  UPDATE_TAB = 'UPDATE_TAB',
  STORE_FAVICON_URL = 'STORE_FAVICON_URL',
}

export type AddToViewedDappAction = {
  type: BrowserActionTypes.ADD_TO_VIEWED_DAPP;
  hostname: string;
};

export type BrowserRequestLoadAction = {
  type: BrowserActionTypes.SET_BROWSER_REQUEST_LOAD;
};

export type BrowserLoadStartAction = {
  type: BrowserActionTypes.SET_BROWSER_LOAD_START;
  payload: {
    url: string;
  };
};

export type BrowserLoadEndAction = {
  type: BrowserActionTypes.SET_BROWSER_LOAD_END;
  payload: {
    url: string;
  };
};

export type AddToHistoryAction = {
  type: BrowserActionTypes.ADD_TO_BROWSER_HISTORY;
  url: string;
  name: string;
};

export type ClearHistoryAction = {
  type: BrowserActionTypes.CLEAR_BROWSER_HISTORY;
  id: number;
};

export type AddToWhitelistAction = {
  type: BrowserActionTypes.ADD_TO_BROWSER_WHITELIST;
  url: string;
};

export type CloseAllTabsAction = {
  type: BrowserActionTypes.CLOSE_ALL_TABS;
};

export type CreateNewTabAction = {
  type: BrowserActionTypes.CREATE_NEW_TAB;
  url: string;
  id: number;
  linkType: string;
};

export type CloseTabAction = {
  type: BrowserActionTypes.CLOSE_TAB;
  id: string;
};

export type SetActiveTabAction = {
  type: BrowserActionTypes.SET_ACTIVE_TAB;
  id: string;
};

export type UpdateTabAction = {
  type: BrowserActionTypes.UPDATE_TAB;
  id: string;
  data: {
    url: string;
    image?: string;
  };
};

export type StoreFaviconAction = {
  type: BrowserActionTypes.STORE_FAVICON_URL;
  origin: string;
  url: string;
};

export type BrowserAction =
  | AddToViewedDappAction
  | BrowserRequestLoadAction
  | BrowserLoadStartAction
  | BrowserLoadEndAction
  | AddToHistoryAction
  | ClearHistoryAction
  | AddToWhitelistAction
  | CloseAllTabsAction
  | CreateNewTabAction
  | CloseTabAction
  | SetActiveTabAction
  | UpdateTabAction
  | StoreFaviconAction;
