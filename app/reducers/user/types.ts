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
  ambiguousAddressEntries: Record<string, string[]>;
  appServicesReady: boolean;
  existingUser: boolean;
  isConnectionRemoved: boolean;
  multichainAccountsIntroModalSeen: boolean;
  musdConversionEducationSeen: boolean;
}
