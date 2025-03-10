import { BrowserActionTypes } from '../../actions/browser';
import AppConstants from '../../core/AppConstants';
import { appendURLParams } from '../../util/browser';

const initialState = {
  history: [],
  whitelist: [],
  tabs: [],
  favicons: [],
  activeTab: null,
  // Keep track of viewed Dapps, which is used for MetaMetricsEvents.DAPP_VIEWED event
  visitedDappsByHostname: {},
};
const browserReducer = (state = initialState, action) => {
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
    case 'ADD_TO_BROWSER_HISTORY': {
      const { url, name } = action;

      return {
        ...state,
        history: [...state.history, { url, name }].slice(-50),
      };
    }
    case 'ADD_TO_BROWSER_WHITELIST':
      return {
        ...state,
        whitelist: [...state.whitelist, action.url],
      };
    case 'CLEAR_BROWSER_HISTORY':
      return {
        ...state,
        history: [],
        favicons: [],
        tabs: [
          {
            url: appendURLParams(AppConstants.HOMEPAGE_URL, {
              metricsEnabled: action.metricsEnabled,
              marketingEnabled: action.marketingEnabled,
            }).href,
            id: action.id,
          },
        ],
        activeTab: action.id,
      };
    case 'CLOSE_ALL_TABS':
      return {
        ...state,
        tabs: [],
      };
    case 'CREATE_NEW_TAB':
      return {
        ...state,
        tabs: [
          ...state.tabs,
          {
            url: action.url,
            ...(action.linkType && { linkType: action.linkType }),
            id: action.id,
          },
        ],
      };
    case 'CLOSE_TAB':
      return {
        ...state,
        tabs: state.tabs.filter((tab) => tab.id !== action.id),
      };
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.id,
      };
    case 'UPDATE_TAB':
      return {
        ...state,
        tabs: state.tabs.map((tab) => {
          if (tab.id === action.id) {
            return { ...tab, ...action.data };
          }
          return { ...tab };
        }),
      };
    case 'STORE_FAVICON_URL':
      return {
        ...state,
        favicons: [
          { origin: action.origin, url: action.url },
          ...state.favicons,
        ].slice(0, AppConstants.FAVICON_CACHE_MAX_SIZE),
      };
    default:
      return state;
  }
};
export default browserReducer;
