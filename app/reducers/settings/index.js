import AppConstants from '../../core/AppConstants';

const initialState = {
  searchEngine: AppConstants.DEFAULT_SEARCH_ENGINE,
  primaryCurrency: 'ETH',
  lockTime: -1, // Disabled by default
  useBlockieIcon: true,
  hideZeroBalanceTokens: false,
};

const settingsReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_SEARCH_ENGINE':
      return {
        ...state,
        searchEngine: action.searchEngine,
      };
    case 'SET_LOCK_TIME':
      return {
        ...state,
        lockTime: action.lockTime,
      };
    case 'SET_SHOW_HEX_DATA':
      return {
        ...state,
        showHexData: action.showHexData,
      };
    case 'SET_SHOW_CUSTOM_NONCE':
      return {
        ...state,
        showCustomNonce: action.showCustomNonce,
      };
    case 'SET_HIDE_ZERO_BALANCE_TOKENS':
      return {
        ...state,
        hideZeroBalanceTokens: action.hideZeroBalanceTokens,
      };
    case 'SET_USE_BLOCKIE_ICON':
      return {
        ...state,
        useBlockieIcon: action.useBlockieIcon,
      };
    case 'SET_PRIMARY_CURRENCY':
      return {
        ...state,
        primaryCurrency: action.primaryCurrency,
      };
    default:
      return state;
  }
};
export default settingsReducer;
