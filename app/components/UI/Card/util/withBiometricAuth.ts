import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { ReauthenticateErrorType } from '../../../../core/Authentication/types';
import { navigateWithDetails } from '../../../../util/navigation/navUtils';
import { strings } from '../../../../../locales/i18n';
import { createPasswordBottomSheetNavigationDetails } from '../components/PasswordBottomSheet';

interface BiometricAuthParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reauthenticate: (...args: any[]) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: { navigate: (...args: any[]) => void };
  onSuccess: () => void | Promise<void>;
  passwordDescription?: string;
}

/**
 * Shared pattern for biometric-gated actions: attempt biometric auth,
 * fall back to password bottom sheet, handle cancellation silently.
 */
export async function withBiometricAuth({
  reauthenticate,
  navigation,
  onSuccess,
  passwordDescription,
}: BiometricAuthParams): Promise<void> {
  try {
    await reauthenticate();
    await onSuccess();
  } catch (err) {
    const errorMessage = (err as Error).message;

    if (
      errorMessage.includes(
        ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS,
      )
    ) {
      navigateWithDetails(
        navigation,
        createPasswordBottomSheetNavigationDetails({
          onSuccess: async () => {
            await onSuccess();
          },
          ...(passwordDescription ? { description: passwordDescription } : {}),
        }),
      );
      return;
    }

    if (errorMessage.includes(ReauthenticateErrorType.BIOMETRIC_ERROR)) {
      return;
    }

    toast({
      title: strings('card.card_home.biometric_verification_required'),
      severity: ToastSeverity.Warning,
      hasNoTimeout: false,
      showCloseButton: false,
    });
  }
}
