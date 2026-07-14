import { useCallback, useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import type { ImmersveNextAction } from '../util/immersvePrerequisites';

interface RouteContext {
  email?: string;
  countryKey?: string;
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

  return useCallback(
    (action: ImmersveNextAction, ctx: RouteContext = {}) => {
      const { email, countryKey } = ctx;
      switch (action.type) {
        case 'contact':
          navigation.navigate(Routes.CARD.ONBOARDING.SET_PHONE_NUMBER, {
            countryKey,
            immersve: true,
            email,
          });
          break;
        case 'kyc':
        case 'pending':
        case 'expected_spend':
          navigation.navigate(Routes.CARD.ONBOARDING.KYC_PROCESSING, {
            countryKey,
          });
          break;
        case 'funding':
          // ponytail: navigation only — the Immersve ERC-20 approve wiring
          // inside SpendingLimit is branch 6b.
          navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
            flow: 'onboarding',
          });
          break;
        case 'rejected':
          navigation.reset({
            index: 0,
            routes: [{ name: Routes.CARD.ONBOARDING.KYC_FAILED }],
          });
          break;
        case 'active':
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
          navigation.reset({
            index: 0,
            routes: [{ name: Routes.CARD.HOME }],
          });
          break;
        default:
          break;
      }
    },
    [navigation, toastRef, colors],
  );
};
