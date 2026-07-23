import React, { memo, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import {
  PERPS_EVENT_PROPERTY,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { Box, SectionHeader } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PillScrollList } from '../../../Trending/components/PillScrollList';
import { SectionPillsSkeleton } from '../../../Trending/components/SectionPillsSkeleton';
import { PerpsPillItem } from '../PerpsPillItem';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsNavigation } from '../../hooks/usePerpsNavigation';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import { usePerpsLivePrices } from '../../hooks/stream';
import { formatPercentage } from '../../utils/formatUtils';
import { PerpsRelatedMarketsSelectorsIDs } from '../../Perps.testIds';
import {
  getRelatedMarketsForMarket,
  RELATED_MARKETS_EVENT_PROPERTY,
  RELATED_MARKET_CLICKED,
  RELATED_MARKETS_HEADER_TAPPED,
  RELATED_MARKETS_SOURCE,
} from '../../utils/relatedMarkets';
import type { PerpsFeedItem } from '../../types/perpsFeedTypes';

export interface PerpsRelatedMarketsProps {
  currentMarket: PerpsMarketData;
}

const MAX_PILLS = 12;
const ROW_COUNT = 2;
const LIVE_PRICES_THROTTLE_MS = 3000;

const PerpsRelatedMarkets: React.FC<PerpsRelatedMarketsProps> = ({
  currentMarket,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { track } = usePerpsEventTracking();
  const { navigateToMarketList } = usePerpsNavigation();

  const { markets: allMarkets } = usePerpsMarkets();
  const relatedMarketsResult = useMemo(
    () => getRelatedMarketsForMarket(currentMarket, allMarkets),
    [currentMarket, allMarkets],
  );
  const collectionId = relatedMarketsResult?.collection.id;
  const markets = relatedMarketsResult?.markets;

  const symbols = useMemo(
    () => (markets ?? []).map((m) => m.symbol),
    [markets],
  );
  const livePrices = usePerpsLivePrices({
    symbols,
    throttleMs: LIVE_PRICES_THROTTLE_MS,
  });

  const feedItems: PerpsFeedItem[] = useMemo(
    () =>
      (markets ?? []).map((market) => {
        const livePrice = livePrices[market.symbol];
        if (!livePrice?.percentChange24h) {
          return { market, isWatchlisted: false };
        }
        const changePercent = Number.parseFloat(livePrice.percentChange24h);
        if (Number.isNaN(changePercent)) {
          return { market, isWatchlisted: false };
        }
        return {
          market: {
            ...market,
            change24hPercent: formatPercentage(changePercent),
          },
          isWatchlisted: false,
        };
      }),
    [markets, livePrices],
  );

  const handleMarketPress = useCallback(
    (market: PerpsMarketData, index: number) => {
      if (!collectionId) {
        return;
      }

      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]: RELATED_MARKET_CLICKED,
        [RELATED_MARKETS_EVENT_PROPERTY.SOURCE_MARKET]: currentMarket.symbol,
        [RELATED_MARKETS_EVENT_PROPERTY.MARKET]: market.symbol,
        [RELATED_MARKETS_EVENT_PROPERTY.CATEGORY]: collectionId,
        [RELATED_MARKETS_EVENT_PROPERTY.POSITION]: index + 1,
      });

      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market,
          source: RELATED_MARKETS_SOURCE,
        },
      });
    },
    [collectionId, currentMarket.symbol, navigation, track],
  );

  const handleHeaderPress = useCallback(() => {
    if (!collectionId) {
      return;
    }

    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]: RELATED_MARKETS_HEADER_TAPPED,
      [RELATED_MARKETS_EVENT_PROPERTY.SOURCE_MARKET]: currentMarket.symbol,
      [RELATED_MARKETS_EVENT_PROPERTY.CATEGORY]: collectionId,
    });

    navigateToMarketList({
      source: RELATED_MARKETS_SOURCE,
      defaultMarketTypeFilter: collectionId,
    });
  }, [collectionId, currentMarket.symbol, navigateToMarketList, track]);

  const renderPill = useCallback(
    (item: PerpsFeedItem, index: number) => (
      <PerpsPillItem
        item={item}
        onNavigateToMarketDetails={() => handleMarketPress(item.market, index)}
      />
    ),
    [handleMarketPress],
  );

  if (!relatedMarketsResult || !markets) {
    return null;
  }

  const { collection } = relatedMarketsResult;

  return (
    <Box
      paddingBottom={3}
      testID={PerpsRelatedMarketsSelectorsIDs.RAIL}
      accessibilityLabel={`${strings('perps.market.related_markets')} - ${collection.label}`}
    >
      <SectionHeader
        title={strings('perps.market.related_markets')}
        isInteractive
        onPress={handleHeaderPress}
        testID={PerpsRelatedMarketsSelectorsIDs.HEADER}
      />

      <PillScrollList<PerpsFeedItem>
        data={feedItems}
        isLoading={false}
        renderItem={renderPill}
        keyExtractor={(item) => item.market.symbol}
        Skeleton={SectionPillsSkeleton}
        rowCount={ROW_COUNT}
        maxPills={MAX_PILLS}
        wrapperTwClassName="bg-transparent"
        listTestId={PerpsRelatedMarketsSelectorsIDs.PILL_GRID}
      />
    </Box>
  );
};

export default memo(PerpsRelatedMarkets);
