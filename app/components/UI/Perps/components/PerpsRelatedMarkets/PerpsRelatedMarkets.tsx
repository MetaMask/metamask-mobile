import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  getMarketTypeFilter,
  PERPS_EVENT_PROPERTY,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PillScrollList } from '../../../Trending/components/PillScrollList';
import { SectionPillsSkeleton } from '../../../Trending/components/SectionPillsSkeleton';
import { PerpsPillItem } from '../PerpsPillItem';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsNavigation } from '../../hooks/usePerpsNavigation';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
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

const styles = StyleSheet.create({
  rail: {
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

const PerpsRelatedMarkets: React.FC<PerpsRelatedMarketsProps> = ({
  currentMarket,
}) => {
  const navigation = useNavigation();
  const { track } = usePerpsEventTracking();
  const { navigateToMarketList } = usePerpsNavigation();

  const { markets: allMarkets } = usePerpsMarkets();
  const relatedMarketsResult = useMemo(
    () => getRelatedMarketsForMarket(currentMarket, allMarkets),
    [currentMarket, allMarkets],
  );
  const collectionId = relatedMarketsResult?.collection.id;
  const markets = relatedMarketsResult?.markets;

  const feedItems: PerpsFeedItem[] = useMemo(
    () => (markets ?? []).map((market) => ({ market, isWatchlisted: false })),
    [markets],
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

    const resolvedCategory = getMarketTypeFilter(currentMarket);

    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]: RELATED_MARKETS_HEADER_TAPPED,
      [RELATED_MARKETS_EVENT_PROPERTY.SOURCE_MARKET]: currentMarket.symbol,
      [RELATED_MARKETS_EVENT_PROPERTY.CATEGORY]: collectionId,
    });

    navigateToMarketList({
      source: RELATED_MARKETS_SOURCE,
      defaultMarketTypeFilter: resolvedCategory,
    });
  }, [collectionId, currentMarket, navigateToMarketList, track]);

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
    <View
      style={styles.rail}
      testID={PerpsRelatedMarketsSelectorsIDs.RAIL}
      accessibilityLabel={`${strings('perps.market.related_markets')} - ${collection.label}`}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={handleHeaderPress}
        testID={PerpsRelatedMarketsSelectorsIDs.HEADER}
        accessibilityRole="button"
      >
        <View style={styles.headerLeft}>
          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            {strings('perps.market.related_markets')}
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconDefault}
          />
        </View>
      </TouchableOpacity>

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
    </View>
  );
};

export default memo(PerpsRelatedMarkets);
