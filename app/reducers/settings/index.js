import AppConstants from '../../core/AppConstants';
import { AvatarAccountType } from '../../component-library/components/Avatars/Avatar/variants/AvatarAccount/AvatarAccount.types';

const initialState = {
  searchEngine: AppConstants.DEFAULT_SEARCH_ENGINE,
  primaryCurrency: 'ETH',
  lockTime: -1, // Disabled by default,
  avatarAccountType: AvatarAccountType.Maskicon,
  hideZeroBalanceTokens: false,
  basicFunctionalityEnabled: true,
  deepLinkModalDisabled: false,
  // Perps chart preferences
  perpsChartPreferences: {
    preferredCandlePeriod: '15m', // Default to 15 minutes
  },
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
    case 'SET_HIDE_ZERO_BALANCE_TOKENS':
      return {
        ...state,
        hideZeroBalanceTokens: action.hideZeroBalanceTokens,
      };
    case 'SET_AVATAR_ACCOUNT_TYPE':
      return {
        ...state,
        avatarAccountType: action.avatarAccountType,
      };
    case 'SET_PRIMARY_CURRENCY':
      return {
        ...state,
        primaryCurrency: action.primaryCurrency,
      };
    case 'SET_SHOW_FIAT_ON_TESTNETS':
      return {
        ...state,
        showFiatOnTestnets: action.showFiatOnTestnets,
      };
    case 'TOGGLE_BASIC_FUNCTIONALITY':
      return {
        ...state,
        basicFunctionalityEnabled: action.basicFunctionalityEnabled,
      };
    case 'TOGGLE_DEVICE_NOTIFICATIONS':
      return {
        ...state,
        deviceNotificationEnabled: action.deviceNotificationEnabled,
      };
    case 'SET_DEEP_LINK_MODAL_DISABLED':
      return {
        ...state,
        deepLinkModalDisabled: action.deepLinkModalDisabled,
      };
    case 'SET_PERPS_CHART_PREFERRED_CANDLE_PERIOD':
      return {
        ...state,
        perpsChartPreferences: {
          ...state.perpsChartPreferences,
          preferredCandlePeriod: action.preferredCandlePeriod,
        },
      };
    default:
      return state;
  }
};
export default settingsReducer;
