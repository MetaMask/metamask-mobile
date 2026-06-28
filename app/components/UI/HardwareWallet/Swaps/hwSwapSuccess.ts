import type { RefObject } from 'react';

import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { resetHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { IconName as ToastIconName } from '../../../../component-library/components/Icons/Icon';
import type { ToastRef } from '../../../../component-library/components/Toast/Toast.types';

export interface CompleteHwSwapSuccessParams {
  dispatch: (action: ReturnType<typeof resetHardwareWalletsSwaps>) => void;
  navigation: { navigate: (route: string) => void };
  toastRef: RefObject<ToastRef | null> | undefined;
}

/**
 * Terminal success handler shared by Ledger (via `useHwSwapLifecycle`) and QR
 * (via `HwQrScanner` on the final camera scan, or `useHwSwapLifecycle` when
 * the user is still on the progress/disconnected screen). Shows the submitted
 * toast, resets `hardwareWalletsSwaps` Redux state, and navigates to activity
 * view. Callers guard against duplicate invocation (`hasAutoNavigatedRef` in
 * the lifecycle hook, `hasCompletedOnSuccessRef` in HwQrScanner).
 */
export function completeHwSwapSuccess({
  dispatch,
  navigation,
  toastRef,
}: CompleteHwSwapSuccessParams): void {
  toastRef?.current?.showToast({
    variant: ToastVariants.Icon,
    iconName: ToastIconName.Check,
    hasNoTimeout: false,
    labelOptions: [
      {
        label: strings('bridge.hardware_wallet_progress.submitted_title'),
      },
    ],
  });
  dispatch(resetHardwareWalletsSwaps());
  navigation.navigate(Routes.TRANSACTIONS_VIEW);
}
