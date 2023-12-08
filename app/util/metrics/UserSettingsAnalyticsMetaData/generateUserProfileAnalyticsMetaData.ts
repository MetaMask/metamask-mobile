import { Appearance } from 'react-native';
import { store } from '../../../store';
import {
  UserProfileMetaData,
  UserProfilePropery,
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

  return {
    [UserProfilePropery.ENABLE_OPENSEA_API]:
      preferencesController?.displayNftMedia
        ? UserProfilePropery.ON
        : UserProfilePropery.OFF,
    [UserProfilePropery.NFT_AUTODETECTION]:
      preferencesController?.useNftDetection
        ? UserProfilePropery.ON
        : UserProfilePropery.OFF,
    [UserProfilePropery.THEME]: appThemeStyle,
    [UserProfilePropery.TOKEN_DETECTION]:
      preferencesController.useTokenDetection
        ? UserProfilePropery.ON
        : UserProfilePropery.OFF,
    [UserProfilePropery.MULTI_ACCOUNT_BALANCE]:
      preferencesController.isMultiAccountBalancesEnabled
        ? UserProfilePropery.ON
        : UserProfilePropery.OFF,
    [UserProfilePropery.SECURITY_PROVIDERS]:
      preferencesController?.securityAlertsEnabled ? 'blockaid' : '',
  };
};

export default generateUserProfileAnalyticsMetaData;
