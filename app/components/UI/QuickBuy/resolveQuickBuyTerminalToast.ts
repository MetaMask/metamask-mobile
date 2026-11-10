import { isCrossChain, StatusTypes } from '@metamask/bridge-controller';
import { REFRESH_INTERVAL_MS } from '@metamask/bridge-status-controller';
import { TransactionStatus as KeyringTransactionStatus } from '@metamask/keyring-api';
import { toast } from '@metamask/design-system-react-native';
import Engine from '../../../core/Engine';
import {
  playErrorNotification,
  playSuccessNotification,
} from '../../../util/haptics';
import { strings } from '../../../../locales/i18n';
import {
  incrementShareSheetCount,
  markClaimSheetSeen,
} from '../../../util/social/postTradePromptStorage';
import { patchPostTradeShareSession } from '../../Views/SocialLeaderboard/PostTradeShareBottomSheet/postTradeShareSession';
import {
  buildSpotPostTradeComposerParams,
  openPostTradeComposer,
} from '../../Views/SocialLeaderboard/PostTradeShareBottomSheet/postTradeComposerParams';
import {
  buildQuickBuyToastOptions,
  type QuickBuyToastLinkButtonOptions,
} from './quickBuyToastOptions';
import {
  getTrackedQuickBuyTrade,
  markQuickBuyTradeSettled,
  type TrackedQuickBuyTrade,
} from './quickBuyTradeTracker';
import type { QuickBuyTradeMode } from './types';

type TerminalOutcome = 'complete' | 'failed';

/**
 * How long a completed bridge may lack its destination hash before the trade
 * settles without one. `BridgeStatusController` writes that hash in the same
 * update that marks the bridge complete and then stops polling, so one
 * refresh interval covers a late write without leaving the trade pending.
 */
export const QUICK_BUY_DESTINATION_TX_HASH_WAIT_MS = REFRESH_INTERVAL_MS;

interface BridgeTerminalResolution {
  outcome: TerminalOutcome;
  transactionHash?: string;
  /** Bridged buy: the hash is the destination-chain transaction. */
  sharesDestinationTxHash: boolean;
  /** Complete, but the destination-chain hash has not been reported yet. */
  isAwaitingDestinationTxHash?: boolean;
}

/** When each bridged buy first completed without a destination hash. */
const awaitingDestinationTxHashSince = new Map<string, number>();

/** Clears the destination-hash wait state. Intended for test isolation. */
export function clearAwaitingDestinationTxHashes(): void {
  awaitingDestinationTxHashSince.clear();
}

/**
 * Authoritative terminal status from `BridgeStatusController`. Covers EVM swaps
 * (marked `COMPLETE` on `TransactionController:transactionConfirmed`) and all
 * cross-chain bridges, incl. Solana → EVM (settled via Bridge API polling).
 *
 * The swap comment names the position token's chain: the bought token is
 * received on the destination chain, the sold token leaves from the source
 * chain. A completed bridged buy therefore reports `status.destChain.txHash`;
 * every other trade reports the source transaction.
 */
function resolveFromBridgeStatus(
  txMetaId: string,
  tradeMode: QuickBuyTradeMode,
): BridgeTerminalResolution | undefined {
  const historyItem =
    Engine.context.BridgeStatusController.getBridgeHistoryItemByTxMetaId(
      txMetaId,
    );
  const status = historyItem?.status?.status;
  const sharesDestinationTxHash =
    tradeMode === 'buy' &&
    Boolean(
      historyItem?.quote &&
        isCrossChain(
          historyItem.quote.srcChainId,
          historyItem.quote.destChainId,
        ),
    );
  if (status === StatusTypes.COMPLETE) {
    if (sharesDestinationTxHash) {
      const destinationTxHash = historyItem?.status?.destChain?.txHash;
      return destinationTxHash
        ? {
            outcome: 'complete',
            transactionHash: destinationTxHash,
            sharesDestinationTxHash,
          }
        : {
            outcome: 'complete',
            sharesDestinationTxHash,
            isAwaitingDestinationTxHash: true,
          };
    }
    return {
      outcome: 'complete',
      sharesDestinationTxHash,
      transactionHash:
        historyItem?.reportedSubmittedTxHash ??
        historyItem?.status?.srcChain?.txHash,
    };
  }
  if (status === StatusTypes.FAILED) {
    return {
      outcome: 'failed',
      sharesDestinationTxHash,
      transactionHash:
        historyItem?.reportedSubmittedTxHash ??
        historyItem?.status?.srcChain?.txHash,
    };
  }
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

const buildPostToFeedLink = (
  trade: TrackedQuickBuyTrade,
  transactionHash: string | undefined,
): QuickBuyToastLinkButtonOptions | undefined => {
  const prompt = trade.postTradePrompt;
  if (prompt?.kind !== 'post_to_feed_toast' || !transactionHash) {
    return undefined;
  }
  return {
    label: strings('social_leaderboard.post_trade_share.post_to_feed'),
    onPress: () => {
      toast.dismiss();
      openPostTradeComposer(
        buildSpotPostTradeComposerParams({
          transactionHash,
          chain: prompt.tradeInFlightChain,
          preview: prompt.preview,
        }),
      );
    },
  };
};

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
  transactionHash: string | undefined,
  sharesDestinationTxHash: boolean,
): boolean {
  markQuickBuyTradeSettled(txMetaId);
  awaitingDestinationTxHashSince.delete(txMetaId);

  const isComplete = outcome === 'complete';
  const prompt = trade.postTradePrompt;
  if (isComplete && prompt?.kind === 'share_sheet') {
    incrementShareSheetCount(prompt.countKey.address, prompt.countKey.product);
  }
  if (isComplete && prompt?.kind === 'claim_sheet') {
    markClaimSheetSeen('swap');
  }
  if (trade.postTradeShare && trade.postTradeShareSessionId) {
    const sessionUpdated = patchPostTradeShareSession(
      trade.postTradeShareSessionId,
      {
        status: isComplete ? 'complete' : 'failed',
        // A bridged buy session holds the source hash from submit. Replace it,
        // even with nothing, so it is never shared under its source hash.
        ...(transactionHash || sharesDestinationTxHash
          ? { transactionHash }
          : {}),
      },
    );
    if (!sessionUpdated) {
      toast(
        buildQuickBuyToastOptions(isComplete ? 'complete' : 'failed', {
          trade,
        }),
      );
    }
  } else {
    toast(
      buildQuickBuyToastOptions(isComplete ? 'complete' : 'failed', {
        trade,
        linkButtonOptions: isComplete
          ? buildPostToFeedLink(trade, transactionHash)
          : undefined,
      }),
    );
  }
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
 * A completed bridged buy without its destination hash stays pending for up to
 * {@link QUICK_BUY_DESTINATION_TX_HASH_WAIT_MS}. The controller stops polling
 * once a bridge completes, so a timer re-runs this check. If the hash is still
 * missing, the trade settles as complete with no hash and no post is offered.
 *
 * @returns `true` when a terminal toast was shown, `false` otherwise (untracked,
 * still pending, or no history yet).
 */
export function resolveQuickBuyTerminalToast(txMetaId: string): boolean {
  const trade = getTrackedQuickBuyTrade(txMetaId);
  if (!trade) {
    awaitingDestinationTxHashSince.delete(txMetaId);
    return false;
  }

  const bridgeResolution = resolveFromBridgeStatus(txMetaId, trade.tradeMode);
  if (bridgeResolution?.isAwaitingDestinationTxHash) {
    const awaitingSince = awaitingDestinationTxHashSince.get(txMetaId);
    if (awaitingSince === undefined) {
      awaitingDestinationTxHashSince.set(txMetaId, Date.now());
      setTimeout(
        () => resolveQuickBuyTerminalToast(txMetaId),
        QUICK_BUY_DESTINATION_TX_HASH_WAIT_MS,
      );
      return false;
    }
    if (Date.now() - awaitingSince < QUICK_BUY_DESTINATION_TX_HASH_WAIT_MS) {
      return false;
    }
  }

  const sharesDestinationTxHash =
    bridgeResolution?.sharesDestinationTxHash ?? false;
  let outcome = bridgeResolution?.outcome;
  // `txSignature` is the submitted (source) hash, so a bridged buy never falls
  // back to it.
  const transactionHash = sharesDestinationTxHash
    ? bridgeResolution?.transactionHash
    : (bridgeResolution?.transactionHash ?? trade.txSignature);
  if (!outcome && trade.isNonEvmSwap) {
    outcome = resolveFromMultichain(trade.txSignature ?? txMetaId);
  }
  if (!outcome) {
    return false;
  }

  return emitTerminalToast(
    txMetaId,
    trade,
    outcome,
    transactionHash,
    sharesDestinationTxHash,
  );
}
