import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';

/**
 * Shows the "Verification in progress" toast used when KYC is still under
 * review after the in-flow polling window. Replaces the old full-screen
 * "Awaiting approval" (KYC pending) screen: the user lands back on wallet home
 * and this toast tells them the review is still running.
 */
export const showKycInProgressToast = () => {
  toast({
    severity: ToastSeverity.Default,
    title: strings('card.card_onboarding.kyc_in_progress_toast.title'),
    description: strings(
      'card.card_onboarding.kyc_in_progress_toast.description',
    ),
    hasNoTimeout: false,
  });
};
