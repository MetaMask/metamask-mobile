import AppConstants from '../../core/AppConstants';
import { AvatarAccountType } from '../../component-library/components/Avatars/Avatar/variants/AvatarAccount/AvatarAccount.types';
import { CLEAR_ONBOARDING } from '../../actions/onboarding';

const initialState = {
  searchEngine: AppConstants.DEFAULT_SEARCH_ENGINE,
  primaryCurrency: 'ETH',
  lockTime: -1, // Disabled by default,
  avatarAccountType: AvatarAccountType.Maskicon,
  hideZeroBalanceTokens: true,
  basicFunctionalityEnabled: true,
  isBasicFunctionalityConsolidatedEnabled: false,
  hasLinkedSocialLoginProfile: false,
  basicFunctionalityMigrationNotification: null,
  basicFunctionalityMigrationNotificationDismissed: false,
  deepLinkModalDisabled: false,
  hapticsEnabled: true,
  // Whether this account is shown on the Top Traders leaderboard. Local mirror
  // of the backend opt-in/out state; defaults to shown. Not persisted to AUS.
  showAccountOnLeaderboard: true,
  // Perps chart preferences
  perpsChartPreferences: {
    preferredCandlePeriod: '15m', // Default to 15 minutes
  },
  // Perps market list category / watchlist filter (TAT-3706 / TAT-3736)
  perpsMarketListPreferences: {
    marketTypeFilter: 'all',
    showFavoritesOnly: false,
    // TAT-4407: persisted venue filter for the markets list. Undefined means
    // all available venues; the selector intersects with available venues and
    // falls back to all of them, so a stale saved choice can never hide every
    // market. Positions and orders always show every provider.
    selectedProviderIds: undefined,
  },
  // Lowercase EVM addresses of accounts that already acknowledged the
  // first-time cross margin risks (acknowledged once per account, not market).
  perpsCrossMarginConfirmedAccounts: {},
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
    case 'SET_BASIC_FUNCTIONALITY_CONSOLIDATED_ENABLED':
      return {
        ...state,
        isBasicFunctionalityConsolidatedEnabled:
          action.isBasicFunctionalityConsolidatedEnabled,
      };
    case 'SET_HAS_LINKED_SOCIAL_LOGIN_PROFILE':
      return {
        ...state,
        hasLinkedSocialLoginProfile: action.hasLinkedSocialLoginProfile,
      };
    case 'SET_BASIC_FUNCTIONALITY_MIGRATION_NOTIFICATION':
      return {
        ...state,
        basicFunctionalityMigrationNotification:
          action.basicFunctionalityMigrationNotification,
      };
    case 'DISMISS_BASIC_FUNCTIONALITY_MIGRATION_NOTIFICATION':
      return {
        ...state,
        basicFunctionalityMigrationNotification: null,
        basicFunctionalityMigrationNotificationDismissed: true,
      };
    // Cohort membership and its notice belong to the wallet that migrated, but
    // this slice outlives it: deleting a wallet leaves them behind, so the next
    // wallet restored on this install reads as already migrated and is never
    // offered the notice. `CLEAR_ONBOARDING` is the wallet-delete signal.
    case CLEAR_ONBOARDING:
      return {
        ...state,
        isBasicFunctionalityConsolidatedEnabled:
          initialState.isBasicFunctionalityConsolidatedEnabled,
        hasLinkedSocialLoginProfile: initialState.hasLinkedSocialLoginProfile,
        basicFunctionalityMigrationNotification:
          initialState.basicFunctionalityMigrationNotification,
        basicFunctionalityMigrationNotificationDismissed:
          initialState.basicFunctionalityMigrationNotificationDismissed,
        perpsCrossMarginConfirmedAccounts:
          initialState.perpsCrossMarginConfirmedAccounts,
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
    case 'SET_HAPTICS_ENABLED':
      return {
        ...state,
        hapticsEnabled: action.hapticsEnabled,
      };
    case 'SET_SHOW_ACCOUNT_ON_LEADERBOARD':
      return {
        ...state,
        showAccountOnLeaderboard: action.showAccountOnLeaderboard,
      };
    case 'SET_PERPS_CHART_PREFERRED_CANDLE_PERIOD':
      return {
        ...state,
        perpsChartPreferences: {
          ...state.perpsChartPreferences,
          preferredCandlePeriod: action.preferredCandlePeriod,
        },
      };
    case 'SET_PERPS_MARKET_LIST_PREFERENCES': {
      const next = action.preferences ?? {};
      // TAT-4407: the venue filter must always keep at least one venue — an
      // empty saved list is refused, and the selector's available-venue
      // intersection is the second line of defense.
      const requestedSelectedProviderIds = Array.isArray(
        next.selectedProviderIds,
      )
        ? next.selectedProviderIds.filter(
            (id) =>
              typeof id === 'string' &&
              (id === 'hyperliquid' || id === 'lighter'),
          )
        : undefined;
      const selectedProviderIds =
        requestedSelectedProviderIds && requestedSelectedProviderIds.length > 0
          ? requestedSelectedProviderIds
          : state.perpsMarketListPreferences?.selectedProviderIds;
      return {
        ...state,
        perpsMarketListPreferences: {
          marketTypeFilter:
            typeof next.marketTypeFilter === 'string'
              ? next.marketTypeFilter
              : (state.perpsMarketListPreferences?.marketTypeFilter ?? 'all'),
          showFavoritesOnly:
            typeof next.showFavoritesOnly === 'boolean'
              ? next.showFavoritesOnly
              : (state.perpsMarketListPreferences?.showFavoritesOnly ?? false),
          selectedProviderIds,
        },
      };
    }
    case 'SET_PERPS_CROSS_MARGIN_CONFIRMED': {
      const address = action.address?.toLowerCase();
      if (!address) {
        return state;
      }
      return {
        ...state,
        perpsCrossMarginConfirmedAccounts: {
          ...state.perpsCrossMarginConfirmedAccounts,
          [address]: true,
        },
      };
    }
    default:
      return state;
  }
};
export default settingsReducer;
