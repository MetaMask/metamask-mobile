import { StatusTypes } from '@metamask/bridge-controller';
import { TransactionStatus as KeyringTransactionStatus } from '@metamask/keyring-api';
import type { ToastRef } from '../../../../../../component-library/components/Toast/Toast.types';
import Engine from '../../../../../../core/Engine';
import {
  playErrorNotification,
  playSuccessNotification,
} from '../../../../../../util/haptics';
import type { Theme } from '../../../../../../util/theme/models';
import { buildQuickBuyToastOptions } from './quickBuyToastOptions';
import {
  getTrackedQuickBuyTrade,
  markQuickBuyTradeSettled,
  type TrackedQuickBuyTrade,
} from './quickBuyTradeTracker';

type TerminalOutcome = 'complete' | 'failed';

/**
 * Authoritative terminal status from `BridgeStatusController`. Covers EVM swaps
 * (marked `COMPLETE` on `TransactionController:transactionConfirmed`) and all
 * cross-chain bridges, incl. Solana → EVM (settled via Bridge API polling).
 */
function resolveFromBridgeStatus(
  txMetaId: string,
): TerminalOutcome | undefined {
  const historyItem =
    Engine.context.BridgeStatusController.getBridgeHistoryItemByTxMetaId(
      txMetaId,
    );
  const status = historyItem?.status?.status;
  if (status === StatusTypes.COMPLETE) return 'complete';
  if (status === StatusTypes.FAILED) return 'failed';
  return undefined;
}

/**
 * Terminal status for same-chain non-EVM (Solana) swaps. `BridgeStatusController`
 * never terminalizes these (no polling, and the Solana tx is not tracked by
 * `TransactionController` so `transactionConfirmed` never fires), so we read the
 * authoritative confirmation from `MultichainTransactionsController` instead —
 * the same signal `useCardDelegation` waits on. The multichain tx `id` equals
 * the Solana signature returned from `submitTx`.
 */
function resolveFromMultichain(signature: string): TerminalOutcome | undefined {
  const { nonEvmTransactions } =
    Engine.context.MultichainTransactionsController.state;
  for (const accountTransactions of Object.values(nonEvmTransactions)) {
    for (const chainEntry of Object.values(accountTransactions)) {
      const transaction = chainEntry?.transactions?.find(
        (tx) => tx.id === signature,
      );
      if (!transaction) continue;
      if (transaction.status === KeyringTransactionStatus.Confirmed) {
        return 'complete';
      }
      if (transaction.status === KeyringTransactionStatus.Failed) {
        return 'failed';
      }
      // Found but not yet terminal (e.g. submitted) — keep waiting.
      return undefined;
    }
  }
  return undefined;
}

/**
 * Claims the trade atomically (settling doubles as the dedupe), surfaces the
 * matching `complete` / `failed` toast and fires the paired haptic. The first
 * caller to reach a terminal status settles the trade, so any later
 * `stateChange` emission — or a concurrent resolve from the other controller —
 * becomes a no-op. Settling (rather than a plain untrack) keeps the id known to
 * `isQuickBuyTransaction` so the delayed generic success/error toast is still
 * suppressed.
 */
function emitTerminalToast(
  txMetaId: string,
  trade: TrackedQuickBuyTrade,
  outcome: TerminalOutcome,
  showToast: ToastRef['showToast'],
  theme: Theme,
): boolean {
  markQuickBuyTradeSettled(txMetaId);

  const isComplete = outcome === 'complete';
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

/**
 * Reconciles a single tracked QuickBuy trade against the authoritative
 * lifecycle status and, if the swap has reached a terminal state, surfaces the
 * matching `complete` / `failed` toast (plus haptic) and stops tracking it.
 *
 * `BridgeStatusController` is the source of truth for EVM swaps and every
 * cross-chain bridge. Same-chain Solana swaps never reach a terminal status
 * there, so those (`trade.isNonEvmSwap`) fall back to
 * `MultichainTransactionsController`. See `quickBuyTradeTracker` and the bridge
 * team thread on the upstream gap.
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

  let outcome = resolveFromBridgeStatus(txMetaId);
  if (!outcome && trade.isNonEvmSwap) {
    outcome = resolveFromMultichain(trade.txSignature ?? txMetaId);
  }
  if (!outcome) {
    return false;
  }

  return emitTerminalToast(txMetaId, trade, outcome, showToast, theme);
}
