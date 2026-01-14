import { Appearance } from 'react-native';
import { store } from '../../../store';
import { UserProfileProperty } from './UserProfileAnalyticsMetaData.types';
import { getConfiguredCaipChainIds } from '../MultichainAPI/networkMetricUtils';
import type { AnalyticsUserTraits } from '@metamask/analytics-controller';

/**
 * Generate user profile analytics meta data
 * To be used in the Segment identify call
 * Returns AnalyticsUserTraits-compatible object
 */
const generateUserProfileAnalyticsMetaData = (): AnalyticsUserTraits => {
  const reduxState = store.getState();
  const preferencesController =
    reduxState?.engine?.backgroundState?.PreferencesController;
  const appTheme = reduxState?.user?.appTheme;
  // This will return either "light" or "dark"
  const appThemeStyle =
    appTheme === 'os' ? Appearance.getColorScheme() : appTheme;
  const isDataCollectionForMarketingEnabled =
    reduxState?.security?.dataCollectionForMarketing;

  const chainIds = getConfiguredCaipChainIds();

  const traits: AnalyticsUserTraits = {
    [UserProfileProperty.ENABLE_OPENSEA_API]:
      preferencesController?.displayNftMedia
        ? UserProfileProperty.ON
        : UserProfileProperty.OFF,
    [UserProfileProperty.NFT_AUTODETECTION]:
      preferencesController?.useNftDetection
        ? UserProfileProperty.ON
        : UserProfileProperty.OFF,
    [UserProfileProperty.THEME]: appThemeStyle ?? null,
    [UserProfileProperty.TOKEN_DETECTION]:
      preferencesController?.useTokenDetection
        ? UserProfileProperty.ON
        : UserProfileProperty.OFF,
    [UserProfileProperty.MULTI_ACCOUNT_BALANCE]:
      preferencesController?.isMultiAccountBalancesEnabled
        ? UserProfileProperty.ON
        : UserProfileProperty.OFF,
    [UserProfileProperty.SECURITY_PROVIDERS]:
      preferencesController?.securityAlertsEnabled ? 'blockaid' : '',
    [UserProfileProperty.HAS_MARKETING_CONSENT]:
      isDataCollectionForMarketingEnabled
        ? UserProfileProperty.ON
        : UserProfileProperty.OFF,
    [UserProfileProperty.CHAIN_IDS]: chainIds,
  };
  return traits;
};

export default generateUserProfileAnalyticsMetaData;
