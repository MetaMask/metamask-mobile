import { formatPercent } from '../../SocialFeed/utils/formatters';
import {
  convertUsdToFiat,
  formatFiat,
  formatFiatAmount,
  type UsdToFiatRate,
} from './fiat';
import type { OpenPositionPnl } from './types';
import { computeOpenUnrealizedPnl } from './unrealizedPnl';

export interface OpenPositionHeaderModel {
  positionValue?: string;
  pnl?: {
    amount: string;
    percentage?: string;
    isProfit: boolean;
  };
  isLoading: boolean;
}

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
        isProfit: unrealized.usd > 0,
      },
      isLoading: false,
    };
  }

  if (walletFiatBalance) {
    return { positionValue: walletFiatBalance, isLoading: false };
  }

  return { isLoading };
};
