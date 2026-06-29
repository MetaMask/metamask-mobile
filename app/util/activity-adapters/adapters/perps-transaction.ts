/**
 * Maps Perps provider transaction items (HyperLiquid etc.) into the shared
 * `ActivityListItem` shape. Lives in mobile until shared
 * `@metamask/activity-adapters` publishes an equivalent.
 *
 * Source: `PerpsTransaction` from `app/components/UI/Perps/types/transactionHistory.ts`,
 * produced by the perps domain layer's `transform*ToTransactions` helpers.
 *
 * Defaults (pending product confirmation — see TMCU-860):
 * trade/funding amounts are rendered USD-fiat style via the structured
 * `*Number` fields; `sourceToken` carries the position size (e.g. `2.01 ETH`)
 * or funding market so rows can render it as a subtitle. `status` defaults to
 * `'success'` for trades/funding (already executed) and is derived from
 * `depositWithdrawal.status` for funds movements. `chainId` is caller-injected
 * (HyperLiquid has no public CAIP-2; callers pass Arbitrum). Open `order`
 * entries are not mapped — the feed only surfaces executed history.
 */
import type { CaipChainId } from '@metamask/utils';
import {
  FillType,
  PerpsOrderTransactionStatus,
  PerpsOrderTransactionStatusType,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
  type PerpsTransaction,
} from '../../../components/UI/Perps/types/transactionHistory';
import type { ActivityListItem, Status, TokenAmount } from '../types';

interface QuoteAsset {
  /** Display symbol for trade/funding amounts, e.g. `"USD"`. */
  symbol: string;
  /** Optional CAIP-19 asset id; perps PnL is synthetic so usually omitted. */
  assetId?: string;
}

interface MapPerpsTransactionArgs {
  transaction: PerpsTransaction;
  chainId: CaipChainId;
  /** Currency used for trade/funding amounts. Defaults to `USD` if omitted. */
  quoteAsset?: QuoteAsset;
  /**
   * CAIP-19 asset id for the perps collateral token (Arbitrum USDC for
   * HyperLiquid). Applied to deposit/withdrawal tokens so rows can render the
   * token icon.
   */
  collateralAssetId?: string;
}

const DEFAULT_QUOTE: QuoteAsset = { symbol: 'USD' };

function toToken(
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

function toAssetToken(
  amount: string,
  symbol: string,
  direction: TokenAmount['direction'],
): TokenAmount {
  return { amount, symbol, direction };
}

function mapDepositWithdrawalStatus(
  status: NonNullable<PerpsTransaction['depositWithdrawal']>['status'],
): Status {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'failed';
    case 'pending':
    case 'bridging':
      return 'pending';
    default:
      return 'pending';
  }
}

function mapTradeKind(
  shortTitle: string,
  fillType: FillType,
): ActivityListItem['type'] | null {
  if (shortTitle === 'Opened long') {
    return 'perpsOpenLong';
  }
  if (shortTitle === 'Opened short') {
    return 'perpsOpenShort';
  }
  if (shortTitle === 'Closed long') {
    switch (fillType) {
      case FillType.Liquidation:
        return 'perpsCloseLongLiquidated';
      case FillType.StopLoss:
        return 'perpsCloseLongStopLoss';
      case FillType.TakeProfit:
        return 'perpsCloseLongTakeProfit';
      case FillType.Standard:
      case FillType.AutoDeleveraging:
      default:
        return 'perpsCloseLong';
    }
  }
  if (shortTitle === 'Closed short') {
    switch (fillType) {
      case FillType.Liquidation:
        return 'perpsCloseShortLiquidated';
      case FillType.StopLoss:
        return 'perpsCloseShortStopLoss';
      case FillType.TakeProfit:
        return 'perpsCloseShortTakeProfit';
      case FillType.Standard:
      case FillType.AutoDeleveraging:
      default:
        return 'perpsCloseShort';
    }
  }
  return null;
}

function mapOrderStatus(
  order: NonNullable<PerpsTransaction['order']>,
): Status | null {
  if (
    order.statusType === PerpsOrderTransactionStatusType.Filled ||
    order.text === PerpsOrderTransactionStatus.Filled ||
    order.text === PerpsOrderTransactionStatus.Triggered
  ) {
    return 'success';
  }

  if (order.text === PerpsOrderTransactionStatus.Rejected) {
    return 'failed';
  }

  if (
    order.statusType === PerpsOrderTransactionStatusType.Canceled ||
    order.text === PerpsOrderTransactionStatus.Canceled
  ) {
    return 'cancelled';
  }

  return null;
}

/**
 * Classifies a historical `order` entry into an Activity row type.
 *
 * Direction (long/short) and open vs close come from the display `title` the
 * perps domain produces ("Limit short", "Market close short", …) — fragile, but
 * the only side/close signal on the record. Limit vs market, however, is taken
 * from the *structured* `order.type`, so a limit order is never displayed as a
 * market order.
 *
 * The shared `ActivityListItem` union only models *short* order kinds today, so
 * long orders are explicitly excluded (return `null`) rather than silently
 * mismatched onto a "short" kind.
 * TODO: add long order kinds to the union and map them here.
 */
function mapOrderKind(
  transaction: PerpsTransaction,
): ActivityListItem['type'] | null {
  const title = transaction.title.toLowerCase();

  // Long orders aren't representable yet — drop them explicitly so they don't
  // fall through and get misclassified as a short order below.
  if (title.includes('long') || title.includes('buy')) {
    return null;
  }

  // Stop orders are a triggered market close with their own dedicated kind.
  if (title.includes('stop')) {
    return 'stopMarketCloseShort';
  }

  const isLimit = transaction.order?.type === 'limit';

  if (title.includes('close')) {
    return isLimit ? 'limitCloseShort' : 'marketCloseShort';
  }
  if (title.includes('short') || title.includes('sell')) {
    return isLimit ? 'limitShort' : 'marketShort';
  }
  return null;
}

/**
 * Returns `null` for source entries that don't belong in the activity feed
 * (e.g. open `order` entries, unrecognized trades).
 */
export function mapPerpsTransaction({
  transaction,
  chainId,
  quoteAsset = DEFAULT_QUOTE,
  collateralAssetId,
}: MapPerpsTransactionArgs): ActivityListItem | null {
  const { id, timestamp } = transaction;

  if (transaction.type === 'deposit' || transaction.type === 'withdrawal') {
    const dw = transaction.depositWithdrawal;
    if (!dw) {
      return null;
    }
    const isDeposit = transaction.type === 'deposit';
    return {
      type: isDeposit ? 'perpsAddFunds' : 'perpsWithdraw',
      chainId,
      status: mapDepositWithdrawalStatus(dw.status),
      timestamp,
      hash: dw.txHash || id,
      raw: { type: 'perpsTransaction', data: transaction },
      data: {
        token: {
          ...toAssetToken(
            String(dw.amountNumber),
            dw.asset,
            isDeposit ? 'in' : 'out',
          ),
          assetId: collateralAssetId,
        },
      },
    };
  }

  if (transaction.type === 'funding') {
    const f = transaction.fundingAmount;
    if (!f) {
      return null;
    }
    const direction: TokenAmount['direction'] = f.isPositive ? 'in' : 'out';
    return {
      type: f.isPositive ? 'perpsReceivedFundingFees' : 'perpsPaidFundingFees',
      chainId,
      status: 'success',
      timestamp,
      hash: id,
      raw: { type: 'perpsTransaction', data: transaction },
      data: {
        token: toToken(f.feeNumber, direction, quoteAsset),
        // Market the funding accrued on (e.g. BTC) — rows render it as the
        // subtitle. No amount: funding is denominated in the quote currency.
        sourceToken: { symbol: transaction.asset, direction },
      },
    };
  }

  if (transaction.type === 'trade') {
    const fill = transaction.fill;
    if (!fill) {
      return null;
    }
    const kind = mapTradeKind(fill.shortTitle, fill.fillType);
    if (!kind) {
      return null;
    }
    // Sign follows the displayed amount: opens show the fee paid (negative),
    // closes show net PnL which can be either sign (liquidations negative).
    const direction: TokenAmount['direction'] = fill.isPositive ? 'in' : 'out';
    const isOpen = kind === 'perpsOpenLong' || kind === 'perpsOpenShort';
    return {
      type: kind,
      chainId,
      status: 'success',
      timestamp,
      hash: id,
      raw: { type: 'perpsTransaction', data: transaction },
      data: {
        token: toToken(fill.amountNumber, direction, quoteAsset),
        // Position leg (e.g. "2.01 ETH") — rows render it as the subtitle.
        sourceToken: {
          amount: fill.size,
          symbol: transaction.asset,
          direction: isOpen ? 'in' : 'out',
        },
      },
    } as ActivityListItem;
  }

  if (transaction.type === 'order') {
    const order = transaction.order;
    if (!order) {
      return null;
    }

    const status = mapOrderStatus(order);
    const kind = mapOrderKind(transaction);
    if (!status || !kind) {
      return null;
    }

    // The perps domain formats the position size into the subtitle as
    // "<size> <symbol>", so reuse that asset quantity for the row's size leg.
    // Guard against the subtitle format drifting: only use the leading token
    // when it parses as a positive number, otherwise omit it (the row shows the
    // symbol alone) rather than rendering a garbage value. Subtitle-format drift
    // is also caught by the transformOrdersToTransactions integration test.
    const [subtitleSize] = transaction.subtitle?.trim().split(/\s+/) ?? [];
    const parsedSubtitleSize = Number(subtitleSize);
    const assetSize =
      subtitleSize &&
      Number.isFinite(parsedSubtitleSize) &&
      parsedSubtitleSize > 0
        ? subtitleSize
        : undefined;

    return {
      type: kind,
      chainId,
      status,
      timestamp,
      hash: id,
      raw: { type: 'perpsTransaction', data: transaction },
      data: {
        token: toToken(Number(order.size), 'out', quoteAsset),
        sourceToken: {
          ...(assetSize ? { amount: assetSize } : {}),
          symbol: transaction.asset,
          direction: 'out',
        },
      },
    } as ActivityListItem;
  }

  return null;
}
