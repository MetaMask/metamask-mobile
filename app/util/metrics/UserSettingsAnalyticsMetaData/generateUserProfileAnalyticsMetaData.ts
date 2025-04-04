import { Appearance } from 'react-native';
import { store } from '../../../store';
import {
  UserProfileMetaData,
  UserProfileProperty,
} from './UserProfileAnalyticsMetaData.types';

/**
 * Generate user profile analytics meta data
 * To be used in the Segment identify call
 */
const generateUserProfileAnalyticsMetaData = (): UserProfileMetaData => {
  const reduxState = store.getState();
  const preferencesController =
    reduxState?.engine?.backgroundState?.PreferencesController;
  const appTheme = reduxState?.user?.appTheme;
  // This will return either "light" or "dark"
  const appThemeStyle =
    appTheme === 'os' ? Appearance.getColorScheme() : appTheme;
  const isDataCollectionForMarketingEnabled =
      reduxState?.security?.dataCollectionForMarketing;

  return {
    [UserProfileProperty.ENABLE_OPENSEA_API]:
      preferencesController?.displayNftMedia
        ? UserProfileProperty.ON
        : UserProfileProperty.OFF,
    [UserProfileProperty.NFT_AUTODETECTION]:
      preferencesController?.useNftDetection
        ? UserProfileProperty.ON
        : UserProfileProperty.OFF,
    [UserProfileProperty.THEME]: appThemeStyle,
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
    [UserProfileProperty.HAS_MARKETING_CONSENT]: isDataCollectionForMarketingEnabled
        ? UserProfileProperty.ON
        : UserProfileProperty.OFF,
  };
};

export default generateUserProfileAnalyticsMetaData;
