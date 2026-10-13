import {
  EM_DASH,
  formatPercent,
  formatTradeUnitPrice,
} from '../../SocialFeed/utils/formatters';
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

const formatSignedFiat = (usd: number, conversion: UsdToFiatRate): string => {
  const converted = convertUsdToFiat(usd, conversion);
  return formatFiat(converted.value, converted.currency);
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
  // Unit prices for sub-cent assets collapse to $0.00 at two decimals.
  if (converted.currency === 'USD') {
    return formatTradeUnitPrice(averageCostUsd);
  }
  return formatFiatAmount(converted.value, converted.currency);
};

/**
 * Collapsed header for the sticky footer.
 * A ready position shows its current value and unrealized PnL.
 * Anything else shows the wallet's fiat balance and hides PnL.
 */
export const toOpenPositionHeader = ({
  position,
  isLoading,
  walletFiatBalance,
  conversion,
}: {
  position: OpenPositionPnl | null;
  isLoading: boolean;
  walletFiatBalance: string | undefined;
  conversion: UsdToFiatRate;
}): OpenPositionHeaderModel => {
  if (position?.pnlStatus === 'ready') {
    const unrealized = computeOpenUnrealizedPnl(position);
    const currentValue =
      position.currentValueUSD == null
        ? undefined
        : convertUsdToFiat(position.currentValueUSD, conversion);
    const positionValue = currentValue
      ? formatFiatAmount(currentValue.value, currentValue.currency)
      : walletFiatBalance;

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
        // The open-position route does not return a buy timestamp.
        holdTime: EM_DASH,
      },
      isLoading: false,
    };
  }

  if (walletFiatBalance) {
    return { positionValue: walletFiatBalance, isLoading: false };
  }

  return { isLoading };
};
