import type { RefObject } from 'react';

import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { resetHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { IconName as ToastIconName } from '../../../../component-library/components/Icons/Icon';
import type { ToastRef } from '../../../../component-library/components/Toast/Toast.types';

/** The navigation surface this module needs (Pick-style, to avoid coupling to
 * the caller's exact NavigationProp variant). */
export interface HwFlowNavigation {
  navigate: (route: string) => void;
  canGoBack?: () => boolean;
  goBack?: () => void;
}

/**
 * Navigates to the activity view at the end of a hardware-wallet signing flow.
 *
 * The send origin registers `HardwareWalletsSwaps` on the ROOT stack
 * (`Nav/App/App.tsx`), but `TRANSACTIONS_VIEW` only exists deeper in the tree
 * (inside `MainNavigator` / the tab navigator). Dispatching the activity
 * navigation while this screen is still mounted therefore makes React
 * Navigation resolve the action in a child navigator and then cascade focus
 * back UP, which pops the root stack and remounts the activity tab
 * (`UnmountOnBlur`) in the same frame. iOS absorbs that; Android's native stack
 * does not, and the user is left on a blank, unusable screen.
 *
 * Leaving the signing screen first settles the root stack, so the follow-up
 * navigation no longer has to pop it as part of the focus cascade.
 *
 * Bridge is unaffected: it registers the screen inside `BridgeScreenStack`
 * (a `MainNavigator` child), so it keeps its original single `navigate`.
 */
export function navigateToActivityFromHwFlow(
  navigation: HwFlowNavigation,
  isSendFlow?: boolean,
): void {
  if (isSendFlow && navigation.canGoBack?.()) {
    navigation.goBack?.();
  }
  navigation.navigate(Routes.TRANSACTIONS_VIEW);
}

export interface CompleteHwSwapSuccessParams {
  dispatch: (action: ReturnType<typeof resetHardwareWalletsSwaps>) => void;
  navigation: HwFlowNavigation;
  toastRef: RefObject<ToastRef | null> | undefined;
  /** True for the send origin, which needs the root-stack pop described in
   * {@link navigateToActivityFromHwFlow}. Bridge omits it. */
  isSendFlow?: boolean;
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
  isSendFlow,
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
  navigateToActivityFromHwFlow(navigation, isSendFlow);
}
