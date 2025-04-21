import { AppThemeKey } from '../../util/theme/models';

/**
 * User state
 */
export interface UserState {
  loadingMsg: string;
  loadingSet: boolean;
  passwordSet: boolean;
  seedphraseBackedUp: boolean;
  backUpSeedphraseVisible: boolean;
  protectWalletModalVisible: boolean;
  gasEducationCarouselSeen: boolean;
  userLoggedIn: boolean;
  isAuthChecked: boolean;
  initialScreen: string;
  appTheme: AppThemeKey;
  ambiguousAddressEntries: Record<string, unknown>;
  appServicesReady: boolean;
  oauth2LoginError: string | null;
  oauth2LoginSuccess: boolean;
  oauth2LoginExistingUser: boolean;
}
