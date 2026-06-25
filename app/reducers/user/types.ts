import { AppThemeKey } from '../../util/theme/models';
import { ChartType } from '../../components/UI/Charts/AdvancedChart/AdvancedChart.types';

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
  musdConversionAssetDetailCtasSeen: Record<string, boolean>;
  moneyOnboardingSeen: boolean;
  tokenOverviewChartType: ChartType;
  /** Candle interval (e.g. '15m') when technical indicators chart is enabled. */
  tokenOverviewChartInterval: string;
  tokenIndicators: string[];
  onboardingStepperProgress: Record<string, number>;
}
