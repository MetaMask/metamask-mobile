import { Appearance } from 'react-native';
import { store } from '../../../store';
import { UserProfileProperty } from './UserProfileAnalyticsMetaData.types';
import { getConfiguredCaipChainIds } from '../MultichainAPI/networkMetricUtils';
import type { AnalyticsUserTraits } from '@metamask/analytics-controller';
import {
  AccountType,
  getSocialAccountType,
} from '../../../constants/onboarding';

// Resolves the user's account_type trait. Prefers the deterministic value
// stored in onboarding redux. For users created before that field existed,
// falls back to inferring the social-login variant from
// SeedlessOnboardingController.authConnection (treated as an existing user
// since the vault already exists). Legacy SRP users remain undefined —
// we cannot distinguish Metamask vs Imported after the fact.
const resolveAccountType = (
  reduxState: ReturnType<typeof store.getState>,
): AccountType | undefined => {
  const stored = reduxState?.onboarding?.accountType;
  if (stored) {
    return stored;
  }
  const authConnection =
    reduxState?.engine?.backgroundState?.SeedlessOnboardingController
      ?.authConnection;
  if (!authConnection) {
    return undefined;
  }
  return getSocialAccountType(authConnection, true);
};

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

  const accountType = resolveAccountType(reduxState);

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
    [UserProfileProperty.HAS_MARKETING_CONSENT]: Boolean(
      isDataCollectionForMarketingEnabled,
    ),
    [UserProfileProperty.CHAIN_IDS]: chainIds,
  };
  if (accountType) {
    traits[UserProfileProperty.ACCOUNT_TYPE] = accountType;
  }
  return traits;
};

export default generateUserProfileAnalyticsMetaData;
