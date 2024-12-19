import { type BrowserAction, BrowserActionTypes } from '../../actions/browser';
import { type BrowserState } from './types';
import AppConstants from '../../core/AppConstants';

export * from './types';

/**
 * Initial browser state
 */
export const initialBrowserState: BrowserState = {
  history: [],
  whitelist: [],
  tabs: [],
  favicons: [],
  activeTab: null,
  // Keep track of viewed Dapps, which is used for MetaMetricsEvents.DAPP_VIEWED event
  visitedDappsByHostname: {},
};

/**
 * Browser reducer
 */
/* eslint-disable @typescript-eslint/default-param-last */
const browserReducer = (
  state: BrowserState = initialBrowserState,
  action: BrowserAction,
): BrowserState => {
  switch (action.type) {
    case BrowserActionTypes.ADD_TO_VIEWED_DAPP: {
      const { hostname } = action;
      return {
        ...state,
        visitedDappsByHostname: {
          ...state.visitedDappsByHostname,
          [hostname]: true,
        },
      };
    }
    case BrowserActionTypes.ADD_TO_BROWSER_HISTORY: {
      const { url, name } = action;

      return {
        ...state,
        history: [...state.history, { url, name }].slice(0, 50),
      };
    }
    case BrowserActionTypes.ADD_TO_BROWSER_WHITELIST: {
      const { url } = action;

      return {
        ...state,
        whitelist: [...state.whitelist, url],
      };
    }
    case BrowserActionTypes.CLEAR_BROWSER_HISTORY: {
      return {
        ...state,
        history: [],
        favicons: [],
        tabs: [{ url: AppConstants.HOMEPAGE_URL, id: action.id }],
        activeTab: action.id,
      };
    }
    case BrowserActionTypes.CLOSE_ALL_TABS: {
      return {
        ...state,
        tabs: [],
      };
    }
    case BrowserActionTypes.CREATE_NEW_TAB: {
      const { url, linkType, id } = action;

      return {
        ...state,
        tabs: [
          ...state.tabs,
          {
            url,
            id,
            ...(linkType && { linkType }),
          },
        ],
      };
    }
    case BrowserActionTypes.CLOSE_TAB: {
      const { id } = action;

      return {
        ...state,
        tabs: state.tabs.filter((tab) => tab.id !== id),
      };
    }
    case BrowserActionTypes.SET_ACTIVE_TAB: {
      const { id } = action;

      return {
        ...state,
        activeTab: id,
      };
    }
    case BrowserActionTypes.UPDATE_TAB: {
      return {
        ...state,
        tabs: state.tabs.map((tab) => {
          if (tab.id === action.id) {
            return { ...tab, ...action.data };
          }
          return { ...tab };
        }),
      };
    }
    case BrowserActionTypes.STORE_FAVICON_URL: {
      const { origin, url } = action;

      return {
        ...state,
        favicons: [
          { origin: action.origin, url: action.url },
          ...state.favicons,
        ].slice(0, AppConstants.FAVICON_CACHE_MAX_SIZE),
      };
    }
    default:
      return state;
  }
};
export default browserReducer;
