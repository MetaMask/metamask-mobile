import { StatusTypes } from '@metamask/bridge-controller';
import type { ToastRef } from '../../../../../../component-library/components/Toast/Toast.types';
import type { Theme } from '../../../../../../util/theme/models';
import Engine from '../../../../../../core/Engine';
import {
  playSuccessNotification,
  playErrorNotification,
} from '../../../../../../util/haptics';
import {
  getTrackedQuickBuyTrade,
  untrackQuickBuyTrade,
} from './quickBuyTradeTracker';
import { buildQuickBuyToastOptions } from './quickBuyToastOptions';

/**
 * Reconciles a single tracked QuickBuy trade against the authoritative
 * `BridgeStatusController` history and, if the swap has reached a terminal
 * state, surfaces the matching `complete` / `failed` toast (plus haptic) and
 * stops tracking it.
 *
 * `untrackQuickBuyTrade` doubles as the dedupe/claim: the first caller to see a
 * terminal status removes the trade, so any later `stateChange` emission — or
 * the controller's immediate post-submit reconcile — becomes a no-op. This lets
 * both entry points (the app-root `stateChange` handler and the controller,
 * right after it learns the tx meta id) share one code path without
 * double-firing.
 *
 * @returns `true` when a terminal toast was shown, `false` otherwise (untracked,
 * still pending, or no history yet).
 */
export function resolveQuickBuyTerminalToast(
  txMetaId: string,
  showToast: ToastRef['showToast'],
  theme: Theme,
): boolean {
  const trade = getTrackedQuickBuyTrade(txMetaId);
  if (!trade) {
    return false;
  }

  const historyItem =
    Engine.context.BridgeStatusController.getBridgeHistoryItemByTxMetaId(
      txMetaId,
    );
  const status = historyItem?.status?.status;
  if (status !== StatusTypes.COMPLETE && status !== StatusTypes.FAILED) {
    return false;
  }

  // Claim the trade atomically so a concurrent path doesn't re-fire the toast.
  untrackQuickBuyTrade(txMetaId);

  const isComplete = status === StatusTypes.COMPLETE;
  showToast(
    buildQuickBuyToastOptions(isComplete ? 'complete' : 'failed', {
      trade,
      theme,
    }),
  );
  // Terminal feedback pairs with the toast: success buzz on settlement, error
  // buzz on failure — fires even if the user navigated away.
  if (isComplete) {
    playSuccessNotification();
  } else {
    playErrorNotification();
  }

  return true;
}
