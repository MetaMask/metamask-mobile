import type { Dispatch, AnyAction } from 'redux';
import { setWalletHomeOnboardingStepsEligible } from '../../actions/onboarding';
import type { ONBOARDING_SUCCESS_FLOW } from '../../constants/onboarding';
import { clearAttribution } from '../../core/redux/slices/attribution';
import { MetaMetricsEvents } from '../../core/Analytics';
import Engine from '../../core/Engine/Engine';
import { discoverAccounts } from '../../multichain-accounts/discovery';
import { AnalyticsEventBuilder } from '../analytics/AnalyticsEventBuilder';
import { getOnboardingCompletedAnalyticsPropsFromSuccessFlow } from '../analytics/onboardingCompletedAnalytics';
import type { WalletSetupCompletedAttributionAnalyticsPayload } from '../analytics/walletSetupCompletedAttribution';
import { analytics } from '../analytics/analytics';
import Logger from '../Logger';
import { shouldMarkWalletHomeOnboardingStepsEligible } from './walletHomeOnboardingStepsEligibility';

export interface FinalizeOnboardingCompletionParams {
  successFlow: ONBOARDING_SUCCESS_FLOW | undefined;
  accountType: string | undefined;
  isBasicFunctionalityEnabled: boolean;
  walletSetupAttributionProps: WalletSetupCompletedAttributionAnalyticsPayload;
  dispatch: Dispatch<AnyAction>;
  discoverAccountsLogContext?: string;
}

/**
 * Shared onboarding completion side effects used when finishing onboarding from
 * OptinMetrics (SRP flow) or OnboardingSuccess (wallet-ready screen).
 *
 * No-ops when `successFlow` is undefined so that callers who still navigate to
 * OnboardingSuccess can preserve attribution until that screen's "Done" handler
 * invokes this function with a concrete successFlow.
 *
 * When eligible, tracks ONBOARDING_COMPLETED, marks wallet-home onboarding steps,
 * and discovers accounts. Clears attribution at the end.
 */
export function finalizeOnboardingCompletion({
  successFlow,
  accountType,
  isBasicFunctionalityEnabled,
  walletSetupAttributionProps,
  dispatch,
  discoverAccountsLogContext = 'finalizeOnboardingCompletion',
}: FinalizeOnboardingCompletionParams): void {
  if (!successFlow) {
    return;
  }

  if (shouldMarkWalletHomeOnboardingStepsEligible(successFlow)) {
    const onboardingCompletedProperties =
      getOnboardingCompletedAnalyticsPropsFromSuccessFlow(successFlow, {
        accountType,
        isBasicFunctionalityEnabled,
      });

    const onboardingCompletedEvent = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.ONBOARDING_COMPLETED,
    )
      .addProperties({
        ...onboardingCompletedProperties,
        ...walletSetupAttributionProps,
      })
      .build();

    analytics.trackEvent(onboardingCompletedEvent);

    dispatch(
      setWalletHomeOnboardingStepsEligible(true, {
        skipInitialBalanceWait: true,
      }),
    );

    const keyrings = Engine.context.KeyringController.state.keyrings;
    if (keyrings?.length > 0) {
      discoverAccounts(keyrings[0].metadata.id).catch((error: unknown) => {
        Logger.error(
          error as Error,
          `${discoverAccountsLogContext}: discoverAccounts failed`,
        );
      });
    }
  }

  dispatch(clearAttribution());
}
