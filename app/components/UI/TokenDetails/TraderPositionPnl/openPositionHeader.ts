import {
  EM_DASH,
  formatHoldDuration,
  formatPercent,
  formatTradeUnitPrice,
} from '../../SocialFeed/utils/formatters';
import { tradeTimestampToMs } from '../../SocialFeed/utils/tradeTimestamp';
import {
  convertUsdToFiat,
  formatFiat,
  formatFiatAmount,
  type UsdToFiatRate,
} from './fiat';
import type { OpenPositionPnl } from './types';
import { computeOpenUnrealizedPnl } from './unrealizedPnl';

export interface OpenPositionExpandedDetails {
  averageCost: string;
  realizedPnl: string;
  unrealizedPnl: string;
  holdTime: string;
}

export interface OpenPositionHeaderModel {
  positionValue?: string;
  pnl?: {
    amount: string;
    percentage?: string;
    isProfit: boolean;
  };
  /** Rows shown when the position footer is expanded. */
  expandedDetails?: OpenPositionExpandedDetails;
  isLoading: boolean;
}

const formatHoldTime = (
  earliestTradeAt: number | null | undefined,
  nowMs: number,
): string => {
  if (
    earliestTradeAt == null ||
    !Number.isFinite(earliestTradeAt) ||
    earliestTradeAt <= 0
  ) {
    return EM_DASH;
  }
  return formatHoldDuration(nowMs - tradeTimestampToMs(earliestTradeAt));
};

const formatSignedFiat = (usd: number, conversion: UsdToFiatRate): string => {
  const converted = convertUsdToFiat(usd, conversion);
  return formatFiat(converted.value, converted.currency);
};

/** Same precision as the USD unit price, with the selected currency symbol. */
const formatUnitPrice = (value: number, currency: string): string => {
  const usdLabel = formatTradeUnitPrice(value);
  if (usdLabel === EM_DASH || currency === 'USD') {
    return usdLabel;
  }

  const amount = usdLabel.startsWith('$') ? usdLabel.slice(1) : usdLabel;
  // Hermes has no NumberFormat.formatToParts, so the symbol comes from a
  // formatted zero, which every device can produce.
  const sample = formatFiatAmount(0, currency);
  const symbol = sample.replace(/[\d\s.,\u00a0\u202f+-]+/g, '') || currency;
  const symbolComesFirst = sample.trim().startsWith(symbol);

  return symbolComesFirst ? `${symbol}${amount}` : `${amount} ${symbol}`;
};

const formatAverageCost = (
  position: OpenPositionPnl,
  conversion: UsdToFiatRate,
): string => {
  if (
    !Number.isFinite(position.positionAmount) ||
    position.positionAmount <= 0 ||
    !Number.isFinite(position.costBasis)
  ) {
    return EM_DASH;
  }

  const averageCostUsd = position.costBasis / position.positionAmount;
  const converted = convertUsdToFiat(averageCostUsd, conversion);
  return formatUnitPrice(converted.value, converted.currency);
};

/**
 * Collapsed header for the sticky footer.
 * "Your position" is this wallet's fiat balance for the token. A ready
 * position also shows unrealized PnL. The social current value is only a
 * fallback when the wallet balance is not available yet.
 */
export const toOpenPositionHeader = ({
  position,
  isLoading,
  walletFiatBalance,
  conversion,
  earliestTradeAt,
  nowMs = Date.now(),
}: {
  position: OpenPositionPnl | null;
  isLoading: boolean;
  walletFiatBalance: string | undefined;
  conversion: UsdToFiatRate;
  /** Earliest fill on the open-position row. Seconds or milliseconds. */
  earliestTradeAt?: number | null;
  nowMs?: number;
}): OpenPositionHeaderModel => {
  if (position?.pnlStatus === 'ready') {
    const unrealized = computeOpenUnrealizedPnl(position);
    const currentValue =
      position.currentValueUSD == null
        ? undefined
        : convertUsdToFiat(position.currentValueUSD, conversion);
    const positionValue =
      walletFiatBalance ??
      (currentValue
        ? formatFiatAmount(currentValue.value, currentValue.currency)
        : undefined);

    if (unrealized.usd == null) {
      return { positionValue, isLoading: false };
    }

    const converted = convertUsdToFiat(unrealized.usd, conversion);

    return {
      positionValue,
      pnl: {
        amount: formatFiat(converted.value, converted.currency),
        percentage:
          unrealized.percent == null
            ? undefined
            : formatPercent(unrealized.percent),
        // Zero reads as neutral-to-positive, matching `positionDisplay.ts`.
        isProfit: unrealized.usd >= 0,
      },
      expandedDetails: {
        averageCost: formatAverageCost(position, conversion),
        realizedPnl: formatSignedFiat(position.realizedPnl, conversion),
        unrealizedPnl: formatSignedFiat(unrealized.usd, conversion),
        holdTime: formatHoldTime(earliestTradeAt, nowMs),
      },
      isLoading: false,
    };
  }

  if (walletFiatBalance) {
    return { positionValue: walletFiatBalance, isLoading: false };
  }

  return { isLoading };
};
