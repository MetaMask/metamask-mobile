import { useCallback, useEffect, useMemo } from 'react';
import type { ToastRef } from '../../../../../../../component-library/components/Toast/Toast.types';
import { useAppThemeFromContext } from '../../../../../../../util/theme';
import { registerNotificationSkipPredicate } from '../../../../../../../core/notificationSkipPredicates';
import type { ToastRegistration } from '../../../../../../Nav/App/ControllerEventToastBridge';
import {
  getTrackedQuickBuyTradeIds,
  isQuickBuyTransaction,
} from '../quickBuyTradeTracker';
import { resolveQuickBuyTerminalToast } from '../resolveQuickBuyTerminalToast';

/**
 * App-root registration that surfaces QuickBuy swap outcomes as toasts.
 *
 * Mounted via `ControllerEventToastBridge` in `App.tsx`, so it outlives the
 * QuickBuy bottom sheet and the trigger screen — the `complete` / `failed`
 * toast fires even after the user navigates away (important for slow
 * cross-chain swaps). The handler is scoped to QuickBuy-initiated trades via
 * `quickBuyTradeTracker` and reads the authoritative lifecycle status from
 * `BridgeStatusController` — falling back to `MultichainTransactionsController`
 * for same-chain Solana swaps, which never reach a terminal bridge status.
 */
export const useQuickBuyToastRegistrations = (): ToastRegistration[] => {
  const theme = useAppThemeFromContext();

  // Opt QuickBuy-initiated transactions out of the generic transaction
  // notifications so the user only sees QuickBuy's own toasts. Registered at
  // the app root so it covers submissions regardless of sheet lifecycle.
  useEffect(() => registerNotificationSkipPredicate(isQuickBuyTransaction), []);

  // Shared by both controller subscriptions: `resolveQuickBuyTerminalToast`
  // checks each tracked trade against whichever controller is authoritative for
  // it, so we can fan out the same scan regardless of which event fired.
  const handleControllerStateChange = useCallback(
    (_payload: unknown, showToast: ToastRef['showToast']): void => {
      const trackedIds = getTrackedQuickBuyTradeIds();
      if (trackedIds.length === 0) {
        return;
      }

      // `resolveQuickBuyTerminalToast` untracks on the first terminal hit, so
      // repeated emissions for the same trade become no-ops (built-in dedupe).
      trackedIds.forEach((txMetaId) => {
        resolveQuickBuyTerminalToast(txMetaId, showToast, theme);
      });
    },
    [theme],
  );

  return useMemo(
    () => [
      {
        eventName: 'BridgeStatusController:stateChange',
        handler: handleControllerStateChange,
      },
      {
        eventName: 'MultichainTransactionsController:stateChange',
        handler: handleControllerStateChange,
      },
    ],
    [handleControllerStateChange],
  );
};
