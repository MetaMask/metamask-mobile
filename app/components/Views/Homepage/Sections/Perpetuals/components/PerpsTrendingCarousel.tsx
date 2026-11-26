import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { PerpsMarketDataWithVolumeNumber } from '../../../../../UI/Perps/hooks/usePerpsMarkets';
import PerpsMarketTileCard, {
  type PerpsTileDeviceTiers,
} from './PerpsMarketTileCard';
import ViewMoreCard from '../../../components/ViewMoreCard';

export interface PerpsTrendingCarouselProps {
  markets: PerpsMarketDataWithVolumeNumber[];
  watchlistSymbolSet: Set<string>;
  sparklines: Record<string, number[] | undefined>;
  onPressMarket: (market: PerpsMarketData) => void;
  onPressViewMore: () => void;
  deviceCapability?: PerpsTileDeviceTiers;
}

const PerpsTrendingCarousel = ({
  markets,
  watchlistSymbolSet,
  sparklines,
  onPressMarket,
  onPressViewMore,
  deviceCapability,
}: PerpsTrendingCarouselProps) => {
  const tw = useTailwind();
  if (markets.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('px-4 gap-3')}
      testID="homepage-trending-perps-carousel"
    >
      {markets.map((market) => (
        <PerpsMarketTileCard
          key={market.symbol}
          market={market}
          sparklineData={sparklines[market.symbol]}
          showFavoriteTag={watchlistSymbolSet.has(market.symbol)}
          onPress={onPressMarket}
          deviceCapability={deviceCapability}
        />
      ))}
      <ViewMoreCard
        onPress={onPressViewMore}
        className="w-[180px] h-[180px] flex-1 self-center"
        testID="perps-view-more-card"
      />
    </ScrollView>
  );
};

export default PerpsTrendingCarousel;
