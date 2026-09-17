import type { TransactionMeta } from '@metamask/transaction-controller';
import type {
  QuoteMetadata,
  QuoteResponse,
  MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import type { TransactionActiveAbTestEntry } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import Routes from '../../../../constants/navigation/Routes';
import type { PostTradeBottomSheetParams } from '../../Bridge/components/PostTradeBottomSheet/PostTradeBottomSheet.types';
import type { BridgeToken } from '../../Bridge/types';

/**
 * Signing-session origin. Bridge is the default; send activates only when
 * `routeParams.flow === Flow.Send`.
 */
export enum Flow {
  Bridge = 'bridge',
  Send = 'send',
}

/**
 * Kind of navigation to perform when the user cancels.
 * - `GoBack`: pop the current screen (send flow — multiple entry points).
 * - `Navigate`: push a specific route (bridge flow — always `BRIDGE_VIEW`).
 */
export enum CancelTargetType {
  GoBack = 'goBack',
  Navigate = 'navigate',
}

/** Where to navigate on cancel. Discriminated by `type`. */
export interface CancelTarget {
  type: CancelTargetType;
  /** Route to push. Required when `type === CancelTargetType.Navigate`. */
  route?: string;
  /** Additional params to pass. Used when `type === CancelTargetType.Navigate`. */
  params?: Record<string, unknown>;
}

/** Bridge-only submission payload (a selected quote + analytics context). */
export interface SubmissionParams {
  quoteResponse: QuoteResponse & QuoteMetadata;
  location?: MetaMetricsSwapsEventSource;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  /** Token/amount context for the post-trade modal after HW signing completes. */
  postTradeModalParams?: Pick<
    PostTradeBottomSheetParams,
    'sourceAmount' | 'destAmount' | 'sourceToken' | 'destToken'
  >;
}

/**
 * Route params the screen consumes. Bridge sends `submissionParams`; send
 * sends `flow:'send'` + prepared tx + gas-token + display context.
 */
export interface HardwareWalletsSwapsRouteParams {
  flow?: Flow;
  submissionParams?: SubmissionParams;
  preparedTxMeta?: TransactionMeta;
  gasTokenAddress?: string;
  /** Pending-approval id (send only). Asserted against `useApprovalRequest()`'s id before accepting — WALLET SAFETY. */
  approvalRequestId?: string;
  displayContext?: {
    amount?: string;
    tokenSymbol?: string;
    /** Symbol of the gas-fee token (may differ from the sent token). */
    gasTokenSymbol?: string;
    recipient?: string;
  };
}

/**
 * Resolved bridge-vs-send strategy. The screen reads this object instead of
 * branching on `flow` inline, so the per-flow knowledge lives in exactly one
 * place ({@link resolveFlowStrategy}) rather than smeared across the component.
 */
export interface FlowStrategy {
  flow: Flow;
  /** Convenience boolean for the few downstream APIs that take `isSendFlow: boolean`. */
  isSendFlow: boolean;
  /** Address of the signing wallet. Send: from prepared tx; bridge: bridge selector. */
  walletAddress?: string;
  /** Display amount for step rows. Send: route-params displayContext; bridge: source selector. */
  displayedAmount?: string;
  /** Display symbol for step rows. Send: route-params displayContext; bridge: source selector. */
  displayedTokenSymbol?: string;
  /** Bridge only: destination amount for same-chain swap step titles. */
  displayedDestAmount?: string;
  /** Bridge only: destination token symbol for same-chain swap step titles. */
  displayedDestTokenSymbol?: string;
  /**
   * True when the bridge flow is a same-chain SWAP (source and dest token on
   * the same chain) AND destination data is present. Send flows are never
   * swaps. When true, the final transaction step shows swap copy instead of
   * send copy.
   */
  isSwap: boolean;
  /** Send only: gas-fee token symbol for the FeeTransfer step (may differ from displayedTokenSymbol). */
  gasTokenSymbol?: string;
  /** Inputs for `useHwBatchSignTracker`. */
  trackerOptions: {
    flow: Flow;
    gasTokenAddress?: string;
    deferredApprovalRequestId?: string;
    expectedBatchTransactionCount?: number;
  };
  /** Inputs for `useHardwareWalletSubmit`. */
  submitOptions: {
    preparedTxMeta?: TransactionMeta;
    approvalRequestId?: string;
    submissionParams?: SubmissionParams;
  };
  /** Where to navigate when the user cancels. */
  cancelTarget: CancelTarget;
}

/**
 * Resolves the bridge-vs-send fork into one strategy object.
 *
 * Bridge is the default and is byte-identical to pre-send behavior — send
 * activates only when `routeParams.flow === 'send'`. Centralizing the fork
 * here means the screen never needs `isSendFlow ?` branches inline.
 *
 * Same-chain swap detection (extension parity, extension-2 `9f7b4ffc9ef`):
 * when the bridge source and dest tokens live on the same chain, the flow is
 * a SWAP and the final transaction step is titled "Swap X FROM for Y TO".
 * Missing destination data falls back to send copy.
 *
 * Destination data prefers the confirm-time-locked `postTradeModalParams`
 * locked onto the route by `useBridgeConfirm` (extension lockedQuote parity
 * — the locked quote is the source of truth, never live UI state). The live
 * slice selectors passed via `destAmount`/`destToken` are fallback only:
 * `state.destAmount` is not reliably populated in production.
 */
export function resolveFlowStrategy(input: {
  routeParams?: HardwareWalletsSwapsRouteParams;
  bridgedWalletAddress?: string;
  sourceAmount?: string;
  sourceToken?: BridgeToken;
  /**
   * Fallback destination amount for same-chain swap titles (bridge only).
   * Locked `postTradeModalParams` dest data takes precedence.
   */
  destAmount?: string;
  /**
   * Fallback destination token for same-chain swap titles (bridge only).
   * Locked `postTradeModalParams` dest data takes precedence.
   */
  destToken?: BridgeToken;
}): FlowStrategy {
  const {
    routeParams = {},
    bridgedWalletAddress,
    sourceAmount,
    sourceToken,
    destAmount,
    destToken,
  } = input;

  if (routeParams.flow === Flow.Send) {
    const batchTransactionCount =
      routeParams.preparedTxMeta?.batchTransactions?.length ?? 0;
    const expectedBatchTransactionCount =
      routeParams.gasTokenAddress && batchTransactionCount > 0
        ? // +1 for the FeeTransfer (gas token payment) step — when
          // gasTokenAddress is set, the sendbundle includes an extra tx to
          // pay gas with the fee token, making the total batch size
          // batchTransactionCount + 1.
          batchTransactionCount + 1
        : undefined;

    return {
      flow: Flow.Send,
      isSendFlow: true,
      // Send flows are never swaps — even with dest data present, send copy wins.
      isSwap: false,
      walletAddress: routeParams.preparedTxMeta?.txParams.from,
      displayedAmount: routeParams.displayContext?.amount,
      displayedTokenSymbol: routeParams.displayContext?.tokenSymbol,
      gasTokenSymbol: routeParams.displayContext?.gasTokenSymbol,
      trackerOptions: {
        flow: Flow.Send,
        gasTokenAddress: routeParams.gasTokenAddress,
        deferredApprovalRequestId: routeParams.approvalRequestId,
        expectedBatchTransactionCount,
      },
      submitOptions: {
        preparedTxMeta: routeParams.preparedTxMeta,
        approvalRequestId: routeParams.approvalRequestId,
      },
      cancelTarget: {
        type: CancelTargetType.Navigate,
        route: Routes.SEND.DEFAULT,
        params: { screen: Routes.SEND.AMOUNT },
      },
    };
  }

  // Dest data prefers the confirm-time-locked postTradeModalParams (extension
  // lockedQuote parity); the live slice selectors are fallback only, since
  // state.destAmount is never populated in production.
  const lockedDest = routeParams.submissionParams?.postTradeModalParams;
  const effectiveDestAmount = lockedDest?.destAmount ?? destAmount;
  const effectiveDestToken = lockedDest?.destToken ?? destToken;

  // Same-chain swap: both chainIds must be defined and equal. Both tokens are
  // `BridgeToken`, so `chainId` (Hex | CaipChainId) compares like-for-like.
  // Missing dest token or dest amount degrades to send copy (extension parity).
  const isSwap =
    sourceToken?.chainId !== undefined &&
    sourceToken?.chainId === effectiveDestToken?.chainId;

  return {
    flow: Flow.Bridge,
    isSendFlow: false,
    walletAddress: bridgedWalletAddress,
    displayedAmount: sourceAmount,
    displayedTokenSymbol: sourceToken?.symbol,
    displayedDestAmount: effectiveDestAmount,
    displayedDestTokenSymbol: effectiveDestToken?.symbol,
    isSwap,
    gasTokenSymbol: undefined,
    trackerOptions: { flow: Flow.Bridge },
    submitOptions: { submissionParams: routeParams.submissionParams },
    cancelTarget: {
      type: CancelTargetType.Navigate,
      route: Routes.BRIDGE.BRIDGE_VIEW,
    },
  };
}
