import { useCallback, useMemo, useRef } from 'react';
import { StatusTypes } from '@metamask/bridge-controller';
import type { ToastRef } from '../../../../../../../component-library/components/Toast/Toast.types';
import type { ToastRegistration } from '../../../../../../Nav/App/ControllerEventToastBridge';
import { useAppThemeFromContext } from '../../../../../../../util/theme';
import Engine from '../../../../../../../core/Engine';
import {
  getTrackedQuickBuyTrade,
  getTrackedQuickBuyTradeIds,
  untrackQuickBuyTrade,
} from '../quickBuyTradeTracker';
import { buildQuickBuyToastOptions } from '../quickBuyToastOptions';

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
  // Dedupes repeated stateChange emissions for the same terminal status.
  const processedRef = useRef<Set<string>>(new Set());

  const handleBridgeStatusChange = useCallback(
    (_payload: unknown, showToast: ToastRef['showToast']): void => {
      const trackedIds = getTrackedQuickBuyTradeIds();
      if (trackedIds.length === 0) {
        return;
      }

      trackedIds.forEach((txMetaId) => {
        const historyItem =
          Engine.context.BridgeStatusController.getBridgeHistoryItemByTxMetaId(
            txMetaId,
          );
        const status = historyItem?.status?.status;
        if (status !== StatusTypes.COMPLETE && status !== StatusTypes.FAILED) {
          return;
        }

        const trade = getTrackedQuickBuyTrade(txMetaId);
        if (!trade) {
          return;
        }

        const dedupeKey = `${txMetaId}-${status}`;
        if (processedRef.current.has(dedupeKey)) {
          return;
        }
        processedRef.current.add(dedupeKey);

        showToast(
          buildQuickBuyToastOptions(
            status === StatusTypes.COMPLETE ? 'complete' : 'failed',
            { trade, theme },
          ),
        );
        untrackQuickBuyTrade(txMetaId);
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
