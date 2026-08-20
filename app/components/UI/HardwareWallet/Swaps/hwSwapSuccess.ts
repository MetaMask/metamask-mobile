import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { resetHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';

export interface CompleteHwSwapSuccessParams {
  dispatch: (action: ReturnType<typeof resetHardwareWalletsSwaps>) => void;
  navigation: { navigate: (route: string) => void };
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
}: CompleteHwSwapSuccessParams): void {
  toast({
    title: strings('bridge.hardware_wallet_progress.submitted_title'),
    severity: ToastSeverity.Success,
    hasNoTimeout: false,
  });
  dispatch(resetHardwareWalletsSwaps());
  navigation.navigate(Routes.TRANSACTIONS_VIEW);
}
