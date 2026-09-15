import type { Dispatch, AnyAction } from 'redux';
import Routes from '../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../core/NavigationService/types';
import { markMetricsOptInUISeen } from '../metrics/metricsOptInUIUtils';
import {
  finalizeOnboardingCompletion,
  type FinalizeOnboardingCompletionParams,
} from './finalizeOnboardingCompletion';
import type { OnboardingConsentFlowParams } from './onboardingConsentFlow';

interface ContinueOnboardingAfterConsentParams {
  navigation: Pick<AppNavigationProp, 'navigate' | 'reset'>;
  consentParams: Pick<
    OnboardingConsentFlowParams,
    'onContinue' | 'successFlow' | 'accountType'
  >;
  accountType: string | undefined;
  shouldShowQuestionnaire: boolean;
  isMetricsOptedIn: boolean;
  isBasicFunctionalityEnabled: boolean;
  walletSetupAttributionProps: FinalizeOnboardingCompletionParams['walletSetupAttributionProps'];
  dispatch: Dispatch<AnyAction>;
  needsQrProvisioning: boolean;
  discoverAccountsLogContext?: string;
}

/**
 * Finishes onboarding after consent screens: optional interest questionnaire,
 * then completion side effects and home (or a custom onContinue).
 */
export async function continueOnboardingAfterConsent({
  navigation,
  consentParams,
  accountType,
  shouldShowQuestionnaire,
  isMetricsOptedIn,
  isBasicFunctionalityEnabled,
  walletSetupAttributionProps,
  dispatch,
  needsQrProvisioning,
  discoverAccountsLogContext = 'OnboardingConsent',
}: ContinueOnboardingAfterConsentParams): Promise<void> {
  const finish = async () => {
    await markMetricsOptInUISeen();

    finalizeOnboardingCompletion({
      successFlow: consentParams.successFlow,
      accountType,
      isBasicFunctionalityEnabled,
      walletSetupAttributionProps,
      dispatch,
      discoverAccountsLogContext,
      needsQrProvisioning,
    });

    if (consentParams.onContinue) {
      return consentParams.onContinue();
    }

    navigation.reset({
      routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
    });
  };

  if (isMetricsOptedIn && shouldShowQuestionnaire) {
    navigation.navigate(Routes.ONBOARDING.INTEREST_QUESTIONNAIRE, {
      onComplete: finish,
      ...(accountType && { accountType }),
    });
    return;
  }

  await finish();
}
