import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import type { PerpsNavigationParamList } from '../../../../../UI/Perps/types/navigation';
import { selectPerpsWatchlistMarkets } from '../../../../../UI/Perps/selectors/perpsController';
import { useHomepageSparklines } from '../../../../Homepage/Sections/Perpetuals/hooks/useHomepageSparklines';
import PerpsMarketTileCard from '../../../../Homepage/Sections/Perpetuals/components/PerpsMarketTileCard';
import PerpsMarketTileCardSkeleton from '../../../../Homepage/Sections/Perpetuals/components/PerpsMarketTileCardSkeleton';
import ViewMoreCard from '../../../../Homepage/components/ViewMoreCard';
import Routes from '../../../../../../constants/navigation/Routes';
import type { SectionId } from '../../../sections.config';

const MAX_ITEMS = 5;

export interface PerpsExploreSectionProps {
  sectionId: SectionId;
  data: unknown[];
  isLoading: boolean;
}

/**
 * Self-contained section that batches sparkline subscriptions and watchlist
 * reads for all visible perps tiles, then renders tiles directly.
 */
const PerpsExploreSection: React.FC<PerpsExploreSectionProps> = ({
  data,
  isLoading,
}) => {
  const navigation = useNavigation();
  const tw = useTailwind();

  const displayMarkets = useMemo(
    () => (data as PerpsMarketData[]).slice(0, MAX_ITEMS),
    [data],
  );
  const displaySymbols = useMemo(
    () => displayMarkets.map((m) => m.symbol),
    [displayMarkets],
  );
  const { sparklines } = useHomepageSparklines(displaySymbols);
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets) ?? [];

  return (
    <Box twClassName="-mx-4 mb-6">
      {isLoading ? (
        <Box twClassName="px-4">
          <PerpsMarketTileCardSkeleton />
        </Box>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw.style('px-4 gap-2.5')}
          testID="explore-perps-carousel"
        >
          {displayMarkets.map((market) => (
            <PerpsMarketTileCard
              key={market.symbol}
              market={market}
              sparklineData={sparklines[market.symbol]}
              showFavoriteTag={watchlistSymbols.includes(market.symbol)}
              testID={`perps-market-tile-card-${market.symbol}`}
              onPress={() => {
                (
                  navigation as NavigationProp<PerpsNavigationParamList>
                )?.navigate(Routes.PERPS.ROOT, {
                  screen: Routes.PERPS.MARKET_DETAILS,
                  params: {
                    market,
                    source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
                  },
                });
              }}
            />
          ))}
          <ViewMoreCard
            onPress={() =>
              navigation.navigate(Routes.PERPS.ROOT, {
                screen: Routes.PERPS.MARKET_LIST,
                params: {
                  defaultMarketTypeFilter: 'all',
                  source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
                },
              })
            }
            twClassName="w-[180px] flex-1"
            testID="perps-view-more-card"
          />
        </ScrollView>
      )}
    </Box>
  );
};

export default PerpsExploreSection;
