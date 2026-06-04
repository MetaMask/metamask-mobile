import { useCallback, useMemo } from 'react';
import type { ToastRef } from '../../../../../../../component-library/components/Toast/Toast.types';
import type { ToastRegistration } from '../../../../../../Nav/App/ControllerEventToastBridge';
import { useAppThemeFromContext } from '../../../../../../../util/theme';
import { getTrackedQuickBuyTradeIds } from '../quickBuyTradeTracker';
import { resolveQuickBuyTerminalToast } from '../resolveQuickBuyTerminalToast';

/**
 * App-root registration that surfaces QuickBuy swap outcomes as toasts.
 *
 * Mounted via `ControllerEventToastBridge` in `App.tsx`, so it outlives the
 * QuickBuy bottom sheet and the trigger screen — the `complete` / `failed`
 * toast fires even after the user navigates away (important for slow
 * cross-chain swaps). The handler is scoped to QuickBuy-initiated trades via
 * `quickBuyTradeTracker` and reads the authoritative lifecycle status from
 * `BridgeStatusController`.
 */
export const useQuickBuyToastRegistrations = (): ToastRegistration[] => {
  const theme = useAppThemeFromContext();

  const handleBridgeStatusChange = useCallback(
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
        handler: handleBridgeStatusChange,
      },
    ],
    [handleBridgeStatusChange],
  );
};
