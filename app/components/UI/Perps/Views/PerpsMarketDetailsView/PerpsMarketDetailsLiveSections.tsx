import React, { useEffect, type ReactNode } from 'react';
import type { PriceUpdate } from '@metamask/perps-controller';
import PerpsMarketStatisticsCard, {
  type PerpsMarketStatisticsCardProps,
} from '../../components/PerpsMarketStatisticsCard';
import {
  usePerpsLiveFocusedPrice,
  usePerpsLivePrices,
} from '../../hooks/stream';
import { usePerpsMarketStats } from '../../hooks/usePerpsMarketStats';
import type { PerpsMarketDetailSectionState } from '../../hooks/usePerpsMarketDetailSession';

const toPrice = (priceData: PriceUpdate | undefined): number => {
  if (priceData?.markPrice) {
    return Number.parseFloat(priceData.markPrice);
  }
  if (priceData?.price) {
    return Number.parseFloat(priceData.price);
  }
  return 0;
};

/**
 * Mark price for one symbol: the fast focused stream first, the allMids
 * baseline until the first focused tick arrives. Re-renders only its caller.
 */
export function usePerpsCurrentPrice(symbol: string, enabled = true): number {
  const isEnabled = enabled && Boolean(symbol);
  const livePrices = usePerpsLivePrices({
    symbols: isEnabled ? [symbol] : [],
    throttleMs: 1000,
  });
  const focusedPrice = usePerpsLiveFocusedPrice({
    symbol,
    enabled: isEnabled,
  });
  if (!isEnabled) {
    return 0;
  }
  return toPrice(focusedPrice ?? livePrices[symbol]);
}

interface PerpsLiveCurrentPriceProps {
  symbol: string;
  enabled?: boolean;
  children: (currentPrice: number) => ReactNode;
}

/** Scopes price ticks to the subtree that renders the price. */
export const PerpsLiveCurrentPrice = ({
  symbol,
  enabled = true,
  children,
}: PerpsLiveCurrentPriceProps) => {
  const currentPrice = usePerpsCurrentPrice(symbol, enabled);
  return <>{children(currentPrice)}</>;
};

interface PerpsCurrentPriceSyncProps {
  symbol: string;
  onPriceChange: (currentPrice: number) => void;
}

/** Keeps the latest price readable from press handlers without re-rendering the screen. */
export const PerpsCurrentPriceSync = ({
  symbol,
  onPriceChange,
}: PerpsCurrentPriceSyncProps) => {
  const currentPrice = usePerpsCurrentPrice(symbol);
  useEffect(() => {
    onPriceChange(currentPrice);
  }, [currentPrice, onPriceChange]);
  return null;
};

type PerpsLiveMarketStatisticsCardProps = Omit<
  PerpsMarketStatisticsCardProps,
  'marketStats'
> & {
  /** Reports the stats section state. Fires only when the state changes. */
  onSectionStateChange: (state: PerpsMarketDetailSectionState) => void;
};

/** Owns the market stats stream so its ticks re-render only this card. */
export const PerpsLiveMarketStatisticsCard = ({
  onSectionStateChange,
  ...cardProps
}: PerpsLiveMarketStatisticsCardProps) => {
  const marketStats = usePerpsMarketStats(cardProps.symbol);
  const hasLiveData =
    !marketStats.hasError &&
    marketStats.dataSymbol === cardProps.symbol &&
    marketStats.hasLiveData;
  let sectionState: PerpsMarketDetailSectionState = 'loading';
  if (hasLiveData) {
    sectionState = 'content';
  } else if (marketStats.hasError) {
    sectionState = 'error';
  }

  useEffect(() => {
    onSectionStateChange(sectionState);
  }, [onSectionStateChange, sectionState]);

  return <PerpsMarketStatisticsCard {...cardProps} marketStats={marketStats} />;
};
