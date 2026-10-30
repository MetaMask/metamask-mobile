import type { CaipChainId } from '@metamask/utils';
import type {
  ActivityListItem,
  TokenAmount,
} from '../../../../../../util/activity-adapters';
import type { PredictActivityEntry, PredictAmount } from '../../../types';

/** Canonical Activity is USD Balance movement, not a token transfer. */
const toUsdToken = (
  amount: PredictAmount,
  direction: TokenAmount['direction'],
): TokenAmount => ({
  amount,
  symbol: 'USD',
  direction,
  amountIsHumanReadable: true,
});

/**
 * Maps one canonical Activity entry to the shared {@link ActivityListItem}.
 * `hash` carries the canonical id, which is the row's identity and its details
 * key, so the row has no explorer link. `status` is always `success`: canonical
 * Activity only holds executed Trades and completed Settlements.
 *
 * @param entry - A canonical Trade or Settlement.
 * @param chainId - The Venue's Activity chain id from `getVenueActivityChainId`.
 * @returns The shared Activity item.
 */
export const mapActivityEntry = (
  entry: PredictActivityEntry,
  chainId: CaipChainId,
): ActivityListItem => {
  const { context } = entry;
  const base = {
    chainId,
    status: 'success' as const,
    timestamp: Date.parse(entry.timestamp),
    hash: entry.id,
  };
  const presentation = {
    eventTitle: context?.eventTitle,
    icon: context?.imageUrl,
  };

  if (entry.type === 'settlement') {
    return {
      ...base,
      type: 'predictionSettled',
      data: {
        ...presentation,
        token: toUsdToken(entry.proceeds, 'in'),
        outcomeLabel: context?.outcomeLabel,
        marketQuestion: context?.marketQuestion,
        side: entry.side,
        result: entry.result,
        shares: entry.shares,
        realizedPnl: entry.realizedPnl,
      },
    };
  }

  const isBuy = entry.action === 'buy';
  return {
    ...base,
    type: isBuy ? 'predictionPlaced' : 'predictionCashedOut',
    data: {
      ...presentation,
      token: toUsdToken(entry.amount, isBuy ? 'out' : 'in'),
    },
  };
};
