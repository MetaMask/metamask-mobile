import { TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { CreatedLimitOrderTransaction } from '../../api/limitOrders/create/schema';
import {
  LimitOrderState,
  type LimitOrder,
} from '../../api/limitOrders/getLimitOrders/types';
import { formatLimitOrderDate } from '../../utils/limitOrders/formatLimitOrderDate';

/**
 * Status the API reports for the fill attempt that filled the order.
 */
const EXECUTED_TRANSACTION_STATUS = 'executed';

export interface LimitOrderActivityStatus {
  label: string;
  color: TextColor;
}

/**
 * Resolves the page title, which reads as the outcome of the order, e.g.
 * "Swapped ETH to USDC" or "ETH to USDC expired".
 */
export function getLimitOrderActivityTitle(
  state: LimitOrder['state'],
  source: string,
  dest: string,
): string {
  switch (state) {
    case LimitOrderState.Filled:
      return strings('bridge.limit.activity_title_filled', { source, dest });
    case LimitOrderState.Expired:
      return strings('bridge.limit.activity_title_expired', { source, dest });
    case LimitOrderState.Cancelled:
      return strings('bridge.limit.activity_title_canceled', { source, dest });
    case LimitOrderState.Failed:
      return strings('bridge.limit.activity_title_failed', { source, dest });
    default:
      return strings('bridge.limit.pair', { source, dest });
  }
}

/**
 * Resolves the status row label and color for the order's state.
 */
export function getLimitOrderActivityStatus(
  order: LimitOrder,
): LimitOrderActivityStatus {
  switch (order.state) {
    case LimitOrderState.Filled:
      return {
        label: strings('bridge.limit.filled'),
        color: TextColor.SuccessDefault,
      };
    case LimitOrderState.Expired:
      return {
        label: strings('bridge.limit.expired_at_status', {
          date: formatLimitOrderDate(
            order.timingData.closedAt ?? order.timingData.expiresAt,
          ),
        }),
        color: TextColor.TextAlternative,
      };
    case LimitOrderState.Cancelled:
      return {
        label: strings('bridge.limit.canceled'),
        color: TextColor.ErrorDefault,
      };
    case LimitOrderState.Failed:
      return {
        label: strings('bridge.limit.failed'),
        color: TextColor.ErrorDefault,
      };
    default:
      // The history tab only lists orders that have closed, but an order
      // still in flight reads as such rather than as a made-up outcome.
      return {
        label: strings('bridge.limit.in_progress'),
        color: TextColor.WarningDefault,
      };
  }
}

/**
 * Picks the fill attempt the page links to: the one that filled the order,
 * or else the latest attempt that reached the chain, e.g. a reverted one.
 *
 * @param transactions - The order's fill attempts.
 * @returns The transaction, or `undefined` when none carries a hash.
 */
export function getLimitOrderActivityTransaction(
  transactions: CreatedLimitOrderTransaction[] | undefined,
): CreatedLimitOrderTransaction | undefined {
  const onChainTransactions = (transactions ?? []).filter(
    (transaction) => transaction.txHash,
  );

  return (
    onChainTransactions.find(
      (transaction) => transaction.status === EXECUTED_TRANSACTION_STATUS,
    ) ??
    [...onChainTransactions].sort(
      (a, b) =>
        Date.parse(b.timingData.createdAt) - Date.parse(a.timingData.createdAt),
    )[0]
  );
}
