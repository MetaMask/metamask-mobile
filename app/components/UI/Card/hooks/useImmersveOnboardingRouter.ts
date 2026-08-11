import { useCallback, useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import { navigateWithDetails } from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { CardProviderIds } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import type { ImmersveNextAction } from '../util/immersvePrerequisites';
import { CardActions, withCardProvider } from '../util/metrics';

interface RouteContext {
  email?: string;
  countryKey?: string;
  /** SignUp-only "already have an account" toast; sign-in re-entry passes false. Defaults to shown. */
  showAccountExistsToast?: boolean;
  /** Callers outside the OnboardingNavigator (CardAuthentication) hop via ONBOARDING.ROOT. */
  navigateFromRoot?: boolean;
}

function destinationForAction(action: ImmersveNextAction): string {
  switch (action.type) {
    case 'contact':
      return Routes.CARD.ONBOARDING.SIGN_UP;
    case 'kyc':
    case 'pending':
    case 'expected_spend':
      return Routes.CARD.ONBOARDING.KYC_PROCESSING;
    case 'funding':
      return Routes.CARD.ONBOARDING.FUNDING_APPROVAL;
    case 'rejected':
      return Routes.CARD.ONBOARDING.KYC_FAILED;
    case 'active':
      return Routes.CARD.HOME;
    default:
      return 'unknown';
  }
}

/**
 * Maps a derived `ImmersveNextAction` to the screen where the user resumes
 * onboarding. Shared by SignUp (post-SIWE entry) and ImmersveKYCProcessing
 * (terminal transitions after polling) so the action→destination mapping lives
 * in one place.
 *
 * Note: `kyc` and `pending` are handled in-screen by ImmersveKYCProcessing
 * (open the webview / keep polling); it must not pass those here or it would
 * navigate to itself. From SignUp they legitimately route to KYC_PROCESSING.
 */
export const useImmersveOnboardingRouter = () => {
  const navigation = useNavigation();
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useAnalytics();

  return useCallback(
    (action: ImmersveNextAction, ctx: RouteContext = {}) => {
      const { countryKey, showAccountExistsToast, navigateFromRoot } = ctx;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(CardProviderIds.Immersve, {
              action: CardActions.IMMERSVE_ONBOARDING_ROUTED,
              next_action: action.type,
              destination: destinationForAction(action),
            }),
          )
          .build(),
      );

      const goToOnboarding = (
        screen: string,
        params: Record<string, unknown>,
      ) => {
        if (navigateFromRoot) {
          navigation.navigate(Routes.CARD.ONBOARDING.ROOT, { screen, params });
        } else {
          navigateWithDetails(navigation, [screen, params]);
        }
      };

      switch (action.type) {
        case 'contact':
          goToOnboarding(Routes.CARD.ONBOARDING.SIGN_UP, {});
          break;
        case 'kyc':
        case 'pending':
        case 'expected_spend':
          goToOnboarding(Routes.CARD.ONBOARDING.KYC_PROCESSING, {
            countryKey,
            kycUrl: action.type === 'kyc' ? action.url : undefined,
          });
          break;
        case 'funding':
          goToOnboarding(Routes.CARD.ONBOARDING.FUNDING_APPROVAL, {
            countryKey,
          });
          break;
        case 'rejected':
          if (navigateFromRoot) {
            navigation.navigate(Routes.CARD.ONBOARDING.ROOT, {
              screen: Routes.CARD.ONBOARDING.KYC_FAILED,
            });
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: Routes.CARD.ONBOARDING.KYC_FAILED }],
            });
          }
          break;
        case 'active':
          if (showAccountExistsToast !== false) {
            toastRef?.current?.showToast({
              variant: ToastVariants.Icon,
              labelOptions: [
                {
                  label: strings(
                    'card.card_onboarding.sign_up.account_exists_toast',
                  ),
                },
              ],
              iconName: IconName.Confirmation,
              iconColor: colors.success.default,
              hasNoTimeout: false,
            });
          }
          navigation.reset({
            index: 0,
            routes: [{ name: Routes.CARD.HOME }],
          });
          break;
        default:
          break;
      }
    },
    [navigation, toastRef, colors, trackEvent, createEventBuilder],
  );
};
