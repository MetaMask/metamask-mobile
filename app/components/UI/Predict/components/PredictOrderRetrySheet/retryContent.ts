import { strings } from '../../../../../../locales/i18n';
import {
  formatCents,
  formatPositionSize,
  formatPrice,
  formatSlippageBand,
} from '../../utils/format';
import {
  getPredictExchangeFee,
  getPredictSellNetProceeds,
  getPredictSellWorstCaseProceeds,
} from '../../utils/orders';
import { getMinAmountReceivedWithSlippage } from '../../providers/polymarket/protocol/slippage';
import { Side, type OrderPreview } from '../../types';

export type PredictOrderRetrySheetVariant =
  | 'busy'
  | 'confirm'
  | 'price_moved'
  | 'failed'
  | 'quote_unavailable'
  | 'no_match'
  | 'timeout';

const PRICE_FORMAT = { minimumDecimals: 2, maximumDecimals: 2 };

export interface PredictRetryQuoteRow {
  label: string;
  value: string;
}

export function buildPredictRetryQuoteRows({
  preview,
  expectedSize,
}: {
  preview: OrderPreview;
  expectedSize: number | null;
}): PredictRetryQuoteRow[] {
  const feesTotal =
    (preview.fees?.metamaskFee ?? 0) + getPredictExchangeFee(preview.fees);
  const priceRow = {
    label: strings('predict.order.retry_price_label'),
    value: formatCents(preview.sharePrice),
  };
  const worstCaseRow = {
    label: strings('predict.order.retry_worst_case_label', {
      band: formatSlippageBand(preview.slippage),
    }),
    value:
      preview.side === Side.SELL
        ? formatPrice(getPredictSellWorstCaseProceeds(preview), PRICE_FORMAT)
        : formatPrice(getMinAmountReceivedWithSlippage(preview), PRICE_FORMAT),
  };
  const feesRow = {
    label: strings('predict.order.retry_fees_label'),
    value: formatPrice(feesTotal, PRICE_FORMAT),
  };

  if (preview.side === Side.SELL) {
    return [
      priceRow,
      // Read-only expected full fill; partial execution is never offered.
      ...(expectedSize !== null
        ? [
            {
              label: strings('predict.order.retry_expected_fill_label'),
              value: strings('predict.order.retry_expected_fill_value', {
                shares: formatPositionSize(expectedSize, PRICE_FORMAT),
              }),
            },
          ]
        : []),
      {
        label: strings('predict.order.retry_proceeds_label'),
        value: formatPrice(getPredictSellNetProceeds(preview), PRICE_FORMAT),
      },
      worstCaseRow,
      feesRow,
    ];
  }

  return [
    priceRow,
    {
      label: strings('predict.order.retry_payout_label'),
      value: formatPrice(preview.minAmountReceived, PRICE_FORMAT),
    },
    worstCaseRow,
    feesRow,
  ];
}

export function getPredictRetryTitle(
  variant: PredictOrderRetrySheetVariant,
): string {
  switch (variant) {
    case 'failed':
      return strings('predict.order.order_failed_title');
    case 'quote_unavailable':
      return strings('predict.order.price_unavailable_title');
    case 'price_moved':
      return strings('predict.order.price_moved_title');
    case 'no_match':
      return strings('predict.order.no_match_title');
    case 'timeout':
      return strings('predict.order.market_timeout_title');
    default:
      return strings('predict.order.market_busy_title');
  }
}

export function getPredictRetryBody({
  variant,
  previousPrice,
  currentPrice,
}: {
  variant: PredictOrderRetrySheetVariant;
  previousPrice: number | null | undefined;
  currentPrice: number | null | undefined;
}): string {
  switch (variant) {
    case 'failed':
      return strings('predict.order.order_failed_body');
    case 'quote_unavailable':
      return strings('predict.order.price_unavailable_body');
    case 'no_match':
      return strings('predict.order.no_match_body');
    case 'timeout':
      return strings('predict.order.market_timeout_body');
    case 'busy':
      return strings('predict.order.getting_price_body');
    case 'price_moved':
      return strings('predict.order.price_moved_body', {
        previousPrice: formatCents(previousPrice ?? 0),
        currentPrice: formatCents(currentPrice ?? 0),
      });
    default:
      return strings('predict.order.price_updated_body');
  }
}

/** True when the variant asks the user to confirm a refreshed quote. */
export const isPredictRetryQuoteVariant = (
  variant: PredictOrderRetrySheetVariant,
  preview: OrderPreview | null | undefined,
): preview is OrderPreview =>
  (variant === 'confirm' || variant === 'price_moved') && !!preview;
