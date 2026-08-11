import {
  appendFeesToQuotes,
  BridgeClientId,
  fetchBridgeQuoteStream,
  type BridgeControllerMessenger,
  type FeatureId,
  type GenericQuoteRequest,
  type L1GasFees,
  type NonEvmFees,
  type QuoteResponse,
} from '@metamask/bridge-controller';
import semver from 'semver';
import Engine from '../../../../../../../core/Engine';
import { handleBridgeFetch } from '../../../../../../../core/Engine/controllers/bridge-controller/bridge-controller-init';
import { BRIDGE_API_BASE_URL } from '../../../../../../../constants/bridge';
import { getBaseSemVerVersion } from '../../../../../../../util/version';

/**
 * A streamed quote enriched with fee metadata. Matches the shape the one-shot
 * `BridgeController.fetchQuotes` path returns so the two paths feed the same
 * `selectBridgeQuotes` enrichment in `useQuickBuyQuotes`.
 */
export type StreamedQuickBuyQuote = QuoteResponse & L1GasFees & NonEvmFees;

type BridgeStreamingFlags =
  | { sse?: { enabled: boolean; minimumVersion: string } }
  | undefined;

/**
 * Whether SSE quote streaming is enabled for this client.
 *
 * Mirrors the gate the BridgeController applies internally (`sse.enabled` plus a
 * minimum client version) so QuickBuy's direct-call path streams only when the
 * controller's own polling path would.
 *
 * @param bridgeFeatureFlags - The bridge feature flags (from `selectBridgeFeatureFlags`).
 * @returns True when streaming should be used.
 */
export function isQuoteStreamingEnabled(
  bridgeFeatureFlags: BridgeStreamingFlags,
): boolean {
  const sse = bridgeFeatureFlags?.sse;
  if (!sse?.enabled) {
    return false;
  }
  try {
    return semver.gte(getBaseSemVerVersion(), sse.minimumVersion);
  } catch {
    return false;
  }
}

export interface StreamQuickBuyQuotesHandlers {
  /**
   * Invoked once per provider quote — fee-enriched — the moment it arrives over
   * the stream.
   */
  onQuote: (quote: StreamedQuickBuyQuote) => void;
}

/**
 * Streams QuickBuy quotes from the bridge-api's SSE endpoint, surfacing each
 * provider's quote (fee-enriched) via `onQuote` as soon as it lands.
 *
 * Resolves when the stream closes (server `complete` / all providers done) and
 * rejects if the stream errors. Aborting `signal` cancels the connection.
 *
 * Replicates the dependency wiring the BridgeController does internally, but
 * invokes the caller's callback instead of writing to controller state — so
 * QuickBuy keeps the local-state isolation documented in `useQuickBuyQuotes`.
 *
 * @param params - The quote request.
 * @param featureId - The QuickBuy feature id (for quote attribution).
 * @param signal - Abort signal that cancels the stream.
 * @param handlers - Stream callbacks.
 */
export async function streamQuickBuyQuotes(
  params: GenericQuoteRequest,
  featureId: FeatureId,
  signal: AbortSignal,
  { onQuote }: StreamQuickBuyQuotesHandlers,
): Promise<void> {
  const jwt = await Engine.context.AuthenticationController.getBearerToken();

  const walletAddress =
    typeof params.walletAddress === 'string' ? params.walletAddress : undefined;
  const selectedAccount = walletAddress
    ? Engine.context.AccountsController.getAccountByAddress(walletAddress)
    : undefined;

  // `appendFeesToQuotes` only reaches the messenger for non-EVM (Snap) fee
  // computation; EVM quotes never invoke it. The root messenger satisfies the
  // `SnapController:handleRequest` action it needs.
  const messenger =
    Engine.controllerMessenger as unknown as BridgeControllerMessenger;

  const getLayer1GasFee: Parameters<typeof appendFeesToQuotes>[2] = (request) =>
    Engine.context.TransactionController.getLayer1GasFee(
      request as Parameters<
        typeof Engine.context.TransactionController.getLayer1GasFee
      >[0],
    );

  await fetchBridgeQuoteStream(
    handleBridgeFetch as Parameters<typeof fetchBridgeQuoteStream>[0],
    [params],
    signal,
    featureId,
    BridgeClientId.MOBILE,
    jwt,
    BRIDGE_API_BASE_URL,
    {
      onQuoteValidationFailure: () => undefined,
      onValidQuoteReceived: async (rawQuote) => {
        const [enriched] = await appendFeesToQuotes(
          [rawQuote],
          messenger,
          getLayer1GasFee,
          selectedAccount,
        );
        if (enriched) {
          onQuote(enriched as StreamedQuickBuyQuote);
        }
      },
      onTokenWarning: () => undefined,
      onComplete: () => undefined,
      onClose: () => undefined,
    },
    getBaseSemVerVersion(),
  );
}
