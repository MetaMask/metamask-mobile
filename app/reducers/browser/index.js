import AppConstants from '../../core/AppConstants';

const initialState = {
  history: [],
  whitelist: [],
  tabs: [],
  activeTab: null,
};
const browserReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'ADD_TO_BROWSER_HISTORY':
      return {
        ...state,
        history: [
          ...state.history,
          { url: action.url, name: action.name },
        ].slice(0, 50),
      };
    case 'ADD_TO_BROWSER_WHITELIST':
      return {
        ...state,
        whitelist: [...state.whitelist, action.url],
      };
    case 'CLEAR_BROWSER_HISTORY':
      return {
        ...state,
        history: [],
        tabs: [{ url: AppConstants.HOMEPAGE_URL, id: action.id }],
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
        tabs: [...state.tabs, { url: action.url, id: action.id }],
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
    default:
      return state;
  }
};
export default browserReducer;
