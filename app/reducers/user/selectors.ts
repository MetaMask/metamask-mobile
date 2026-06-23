import { RootState } from '..';
import { ChartType } from '../../components/UI/Charts/AdvancedChart/AdvancedChart.types';
import {
  DEFAULT_TOKEN_OVERVIEW_CHART_INTERVAL,
  isTokenOverviewChartInterval,
} from '../../components/UI/AssetOverview/Price/tokenOverviewChart.constants';

/**
 * Selects the user state
 */
export const selectUserState = (state: RootState) => state.user;

/**
 * Selects the appServicesReady state
 */
export const selectAppServicesReady = (state: RootState) =>
  state.user.appServicesReady;

/**
 * Selects the userLoggedIn state
 */
export const selectUserLoggedIn = (state: RootState) => state.user.userLoggedIn;

/**
 * Selects the passwordSet state
 */
export const selectPasswordSet = (state: RootState) => state.user.passwordSet;

/**
 * Selects the seedphraseBackedUp state
 */
export const selectSeedphraseBackedUp = (state: RootState) =>
  state.user.seedphraseBackedUp;

/**
 * Selects the existingUser state
 */
export const selectExistingUser = (state: RootState) => state.user.existingUser;

/**
 * Selects the isConnectionRemoved state
 */
export const selectIsConnectionRemoved = (state: RootState) =>
  state.user.isConnectionRemoved;

/**
 * Selects the multichainAccountsIntroModalSeen state
 */
export const selectMultichainAccountsIntroModalSeen = (state: RootState) =>
  state.user?.multichainAccountsIntroModalSeen ?? false;

/**
 * Selects the musdConversionEducationSeen state
 */
export const selectMusdConversionEducationSeen = (state: RootState) =>
  state.user?.musdConversionEducationSeen ?? false;

/**
 * Selects the musdConversionAssetDetailCtasSeen state
 */
export const selectMusdConversionAssetDetailCtasSeen = (state: RootState) =>
  state.user?.musdConversionAssetDetailCtasSeen ?? {};

/**
 * Selects the moneyOnboardingSeen state
 */
export const selectMoneyOnboardingSeen = (state: RootState) =>
  state.user?.moneyOnboardingSeen ?? false;

/**
 * Selects the token overview chart type preference
 */
export const selectTokenOverviewChartType = (state: RootState) =>
  state.user?.tokenOverviewChartType ?? ChartType.Line;

/**
 * Selects the persisted candle interval for token overview charts (technical indicators path).
 */
export const selectTokenOverviewChartInterval = (state: RootState): string => {
  const interval = state.user?.tokenOverviewChartInterval;
  return isTokenOverviewChartInterval(interval)
    ? interval
    : DEFAULT_TOKEN_OVERVIEW_CHART_INTERVAL;
};

/**
 * Selects the active technical indicators for token charts
 */
export const selectTokenIndicators = (state: RootState): string[] =>
  state.user?.tokenIndicators ?? [];

/**
 * Selects the onboarding stepper progress record (keyed by stepper ID)
 */
export const selectOnboardingStepperProgress = (state: RootState) =>
  state.user?.onboardingStepperProgress ?? {};
