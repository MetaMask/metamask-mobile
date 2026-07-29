import { AppThemeKey } from '../../util/theme/models';
import { ChartType } from '../../components/UI/Charts/AdvancedChart/AdvancedChart.types';

/**
 * Install details captured on first launch and held until the user makes an
 * analytics consent decision. Emission cannot happen at capture time because
 * consent has not been given yet, and the install date must reflect the install
 * rather than the moment consent was granted.
 */
export interface PendingAppInstallAttribution {
  clickedBranchLink: boolean;
  deeplinkPath?: string;
}

export interface PendingAppInstall {
  /** Install date as yyyy-mm-dd, captured on first launch. */
  installDate: string;
  /**
   * Branch attribution captured at install time via getLatestReferringParams.
   * Stored here because branch.subscribe does not fire on iOS cold start after
   * the new RN architecture upgrade, so getFirstReferringParams never gets
   * populated. Reading at capture time (first launch = install session) and
   * persisting avoids the cold-start race entirely.
   */
  branchAttribution?: PendingAppInstallAttribution;
}

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
  moneyEarnBannerDismissedTokens: Record<string, boolean>;
  tokenOverviewChartType: ChartType;
  /** Candle interval (e.g. '15m') when technical indicators chart is enabled. */
  tokenOverviewChartInterval: string;
  tokenIndicators: string[];
  onboardingStepperProgress: Record<string, number>;
  /** Terminal marker: the App Installed event has been emitted post-consent. */
  appInstallEventFired: boolean;
  /** Install awaiting a consent decision, or `null` when nothing is pending. */
  pendingAppInstall: PendingAppInstall | null;
}
