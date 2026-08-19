/**
 * Maps Predict provider activity entries (Polymarket etc.) into the shared
 * `ActivityListItem` shape. Lives in mobile until shared `@metamask/activity-adapters`
 * publishes an equivalent.
 *
 * Source: `PredictActivity` from `app/components/UI/Predict/types`, returned by
 * each provider's `getActivity({ address })`.
 *
 * Defaults (pending product confirmation — see TMCU-860):
 * `token` is rendered fiat-style (USD amount, caller-supplied symbol/assetId)
 * since users think in dollars on Polymarket; outcome-token quantities are
 * recoverable from `amount / price` if needed later. `status` is hard-coded
 * to `'success'` — provider feeds only surface settled history items.
 */
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { PredictActivity } from '../../../components/UI/Predict/types';
import type { CaipChainId } from '@metamask/utils';
import type { ActivityListItem, TokenAmount } from '../types';

interface QuoteAsset {
  /** Display symbol, e.g. `"USDC"`. */
  symbol: string;
  /** Optional CAIP-19 asset id for the provider's quote currency. */
  assetId?: string;
}

interface MapPredictActivityArgs {
  activity: PredictActivity;
  /** CAIP-2 chain id for the provider (Polymarket = `eip155:137`). */
  chainId: CaipChainId;
  /**
   * The fiat-equivalent currency the provider denominates bets in.
   * Polymarket → USDC. Caller injects so the adapter stays provider-agnostic.
   */
  quoteAsset: QuoteAsset;
}

function toFiatToken(
  amount: number,
  direction: TokenAmount['direction'],
  quoteAsset: QuoteAsset,
): TokenAmount {
  return {
    amount: String(amount),
    symbol: quoteAsset.symbol,
    assetId: quoteAsset.assetId,
    direction,
  };
}

/**
 * Returns `null` for entries that don't map to a feed item — including
 * unrecognized future entry variants. The activity feed must never throw on a
 * single malformed entry, so this stays total rather than exhaustive.
 */
export function mapPredictActivity({
  activity,
  chainId,
  quoteAsset,
}: MapPredictActivityArgs): ActivityListItem | null {
  const { entry, id } = activity;
  // Provider timestamps are Unix seconds; ActivityListItem.timestamp is in
  // milliseconds (used by date grouping and the row date headers).
  const timestamp = entry.timestamp * 1000;
  const raw = { type: 'predictActivity', data: activity } as const;
  // `id` is a synthetic composite (getPolymarketActivityId), NOT the bare tx
  // hash — one on-chain tx can yield several activities, so the tx hash isn't
  // unique per row. We use it as `hash` for stable identity / React keys, but
  // it means a claim (a real redeemPositions tx) won't dedup against its EVM
  // copy. Safe today only because `ActivityTypeFilter.All` is disabled. See the
  // cross-source dedup note in `adapters/dedup.ts` before re-enabling "All".

  switch (entry.type) {
    case 'buy':
      return {
        type: 'predictionPlaced',
        chainId,
        status: 'success',
        timestamp,
        hash: id,
        raw,
        data: {
          token: toFiatToken(entry.amount, 'out', quoteAsset),
        },
      };

    case 'sell':
      return {
        type: 'predictionCashedOut',
        chainId,
        status: 'success',
        timestamp,
        hash: id,
        raw,
        data: {
          token: toFiatToken(entry.amount, 'in', quoteAsset),
        },
      };

    case 'claimWinnings':
      return {
        type: 'predictionClaimWinnings',
        chainId,
        status: 'success',
        timestamp,
        hash: id,
        raw,
        data: {
          token: toFiatToken(entry.amount, 'in', quoteAsset),
        },
      };

    default:
      // Unknown/future entry variant — skip it rather than crash the feed.
      return null;
  }
}
