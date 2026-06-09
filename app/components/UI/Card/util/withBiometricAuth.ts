import { ReauthenticateErrorType } from '../../../../core/Authentication/types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { strings } from '../../../../../locales/i18n';
import { createPasswordBottomSheetNavigationDetails } from '../components/PasswordBottomSheet';

interface BiometricAuthParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reauthenticate: (...args: any[]) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: { navigate: (...args: any[]) => void };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toastRef: React.RefObject<any> | null | undefined;
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
  toastRef,
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
      navigation.navigate(
        ...createPasswordBottomSheetNavigationDetails({
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

    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [
        { label: strings('card.card_home.biometric_verification_required') },
      ],
      hasNoTimeout: false,
      iconName: IconName.Warning,
    });
  }
}
