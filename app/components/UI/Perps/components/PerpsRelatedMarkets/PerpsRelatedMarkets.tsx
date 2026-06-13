import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import PerpsMarketTileCard from '../../../../Views/Homepage/Sections/Perpetuals/components/PerpsMarketTileCard';
import { useHomepageSparklines } from '../../../../Views/Homepage/Sections/Perpetuals/hooks/useHomepageSparklines';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import {
  getPerpsRelatedMarketsSelector,
  PerpsRelatedMarketsSelectorsIDs,
} from '../../Perps.testIds';
import {
  getRelatedMarketsForMarket,
  RELATED_MARKETS_EVENT_PROPERTY,
  RELATED_MARKET_CLICKED,
  RELATED_MARKETS_SOURCE,
} from '../../utils/relatedMarkets';

export interface PerpsRelatedMarketsProps {
  currentMarket: PerpsMarketData;
}

const styles = StyleSheet.create({
  rail: {
    paddingVertical: 16,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  content: {
    paddingHorizontal: 16,
    gap: 10,
  },
});

const PerpsRelatedMarkets: React.FC<PerpsRelatedMarketsProps> = ({
  currentMarket,
}) => {
  const navigation = useNavigation();
  const { track } = usePerpsEventTracking();
  const hasTrackedSlide = useRef(false);

  // Markets come from the StreamManager's marketData channel, so this
  // subscription shares the cache with any other usePerpsMarkets consumer.
  const { markets: allMarkets } = usePerpsMarkets();
  const relatedMarketsResult = useMemo(
    () => getRelatedMarketsForMarket(currentMarket, allMarkets),
    [currentMarket, allMarkets],
  );
  const collectionId = relatedMarketsResult?.collection.id;
  const markets = relatedMarketsResult?.markets;

  useEffect(() => {
    hasTrackedSlide.current = false;
  }, [currentMarket.symbol]);

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

  const handleScrollBeginDrag = useCallback(() => {
    if (hasTrackedSlide.current) {
      return;
    }

    hasTrackedSlide.current = true;
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.SLIDE,
      [PERPS_EVENT_PROPERTY.SECTION_VIEWED]: RELATED_MARKETS_SOURCE,
      [PERPS_EVENT_PROPERTY.LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.PERP_MARKET_DETAILS,
      [PERPS_EVENT_PROPERTY.ASSET]: currentMarket.symbol,
    });
  }, [currentMarket.symbol, track]);

  const symbols = useMemo(
    () => (markets ?? []).map((market) => market.symbol),
    [markets],
  );
  const { sparklines } = useHomepageSparklines(symbols);

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
      <View style={styles.header}>
        <Text
          variant={TextVariant.HeadingMd}
          color={TextColor.TextDefault}
          testID={PerpsRelatedMarketsSelectorsIDs.HEADER}
        >
          {strings('perps.market.related_markets')}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onScrollBeginDrag={handleScrollBeginDrag}
        testID={PerpsRelatedMarketsSelectorsIDs.SCROLL_VIEW}
      >
        {markets.map((market, index) => (
          <PerpsMarketTileCard
            key={market.symbol}
            market={market}
            sparklineData={sparklines[market.symbol]}
            onPress={() => handleMarketPress(market, index)}
            testID={getPerpsRelatedMarketsSelector.tile(market.symbol)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default memo(PerpsRelatedMarkets);
