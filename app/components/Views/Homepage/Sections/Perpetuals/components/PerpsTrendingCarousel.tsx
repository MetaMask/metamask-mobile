import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { PerpsMarketDataWithVolumeNumber } from '../../../../../UI/Perps/hooks/usePerpsMarkets';
import PerpsMarketTileCard from './PerpsMarketTileCard';
import ViewMoreCard from '../../../components/ViewMoreCard';

export interface PerpsTrendingCarouselProps {
  markets: PerpsMarketDataWithVolumeNumber[];
  watchlistSymbolSet: Set<string>;
  sparklines: Record<string, number[] | undefined>;
  onPressMarket: (market: PerpsMarketData) => void;
  onPressViewMore: () => void;
}

const PerpsTrendingCarousel = ({
  markets,
  watchlistSymbolSet,
  sparklines,
  onPressMarket,
  onPressViewMore,
}: PerpsTrendingCarouselProps) => {
  const tw = useTailwind();
  if (markets.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('px-4 gap-2.5')}
      testID="homepage-trending-perps-carousel"
    >
      {markets.map((market) => (
        <PerpsMarketTileCard
          key={market.symbol}
          market={market}
          sparklineData={sparklines[market.symbol]}
          showFavoriteTag={watchlistSymbolSet.has(market.symbol)}
          onPress={onPressMarket}
        />
      ))}
      <ViewMoreCard
        onPress={onPressViewMore}
        twClassName="w-[180px] flex-1"
        testID="perps-view-more-card"
      />
    </ScrollView>
  );
};

export default PerpsTrendingCarousel;
