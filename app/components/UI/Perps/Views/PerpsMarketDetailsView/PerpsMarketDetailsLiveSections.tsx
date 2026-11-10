import React, { useEffect, useRef, type ReactNode } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { Position, PriceUpdate } from '@metamask/perps-controller';
import PerpsMarketStatisticsCard, {
  type PerpsMarketStatisticsCardProps,
} from '../../components/PerpsMarketStatisticsCard';
import PerpsStopLossPromptBanner from '../../components/PerpsStopLossPromptBanner';
import {
  usePerpsLiveFocusedPrice,
  usePerpsLivePrices,
} from '../../hooks/stream';
import { usePerpsMarketStats } from '../../hooks/usePerpsMarketStats';
import type { PerpsMarketDetailSectionState } from '../../hooks/usePerpsMarketDetailSession';
import {
  useStopLossPrompt,
  type StopLossPromptVariant,
} from '../../hooks/useStopLossPrompt';

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

/** Chart price wins. Live price fills the pause. Last price covers the reload. */
export function resolveMarketDetailDisplayPrice(
  chartPrice: number,
  livePrice: number,
  lastPrice: number,
): number {
  if (chartPrice > 0) {
    return chartPrice;
  }
  if (livePrice > 0) {
    return livePrice;
  }
  return lastPrice;
}

interface PerpsStopLossPromptSectionProps {
  position: Position | null | undefined;
  positionOpenedTimestamp?: number;
  onSetStopLoss: (suggestedStopLossPrice: string) => void;
  onAddMargin: () => void;
  isSettingStopLoss: boolean;
  isStopLossSuccess: boolean;
  onFadeOutComplete: () => void;
  testID: string;
}

/** Owns the mark-price subscription so stop-loss ticks do not re-render the screen. */
export const PerpsStopLossPromptSection = ({
  position,
  positionOpenedTimestamp,
  onSetStopLoss,
  onAddMargin,
  isSettingStopLoss,
  isStopLossSuccess,
  onFadeOutComplete,
  testID,
}: PerpsStopLossPromptSectionProps) => {
  const currentPrice = usePerpsCurrentPrice(
    position?.symbol ?? '',
    Boolean(position),
  );
  const {
    variant: bannerVariantFromHook,
    liquidationDistance,
    suggestedStopLossPrice,
    suggestedStopLossPercent,
    isVisible: isBannerVisible,
    onDismissComplete,
  } = useStopLossPrompt({
    position,
    currentPrice,
    positionOpenedTimestamp,
  });
  const preservedBannerVariantRef = useRef<StopLossPromptVariant | null>(null);

  useEffect(() => {
    preservedBannerVariantRef.current = null;
  }, [position?.symbol]);

  useEffect(() => {
    if (bannerVariantFromHook && !isStopLossSuccess) {
      preservedBannerVariantRef.current = bannerVariantFromHook;
    }
  }, [bannerVariantFromHook, isStopLossSuccess]);

  const bannerVariant = isStopLossSuccess
    ? preservedBannerVariantRef.current
    : bannerVariantFromHook;

  const handleSetStopLoss = () => {
    if (!suggestedStopLossPrice) {
      return;
    }
    onSetStopLoss(suggestedStopLossPrice);
  };

  const handleFadeOutComplete = () => {
    onFadeOutComplete();
    onDismissComplete();
  };

  if ((!isBannerVisible && !isStopLossSuccess) || !bannerVariant) {
    return null;
  }

  return (
    <Box twClassName="px-4 mb-4">
      <PerpsStopLossPromptBanner
        variant={bannerVariant}
        liquidationDistance={liquidationDistance ?? 0}
        suggestedStopLossPrice={suggestedStopLossPrice ?? undefined}
        suggestedStopLossPercent={suggestedStopLossPercent ?? undefined}
        onSetStopLoss={handleSetStopLoss}
        onAddMargin={onAddMargin}
        isLoading={isSettingStopLoss}
        isSuccess={isStopLossSuccess}
        onFadeOutComplete={handleFadeOutComplete}
        testID={testID}
      />
    </Box>
  );
};
