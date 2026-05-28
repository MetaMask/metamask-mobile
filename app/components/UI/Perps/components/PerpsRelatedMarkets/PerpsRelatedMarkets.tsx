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
import {
  getPerpsRelatedMarketsSelector,
  PerpsRelatedMarketsSelectorsIDs,
} from '../../Perps.testIds';
import {
  RELATED_MARKETS_EVENT_PROPERTY,
  RELATED_MARKET_CLICKED,
  RELATED_MARKETS_SOURCE,
  type RelatedMarketCollection,
} from '../../utils/relatedMarkets';

export interface PerpsRelatedMarketsProps {
  currentMarket: PerpsMarketData;
  collection: RelatedMarketCollection;
  markets: PerpsMarketData[];
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
  collection,
  markets,
}) => {
  const navigation = useNavigation();
  const { track } = usePerpsEventTracking();
  const hasTrackedSlide = useRef(false);

  useEffect(() => {
    hasTrackedSlide.current = false;
  }, [currentMarket.symbol]);

  const handleMarketPress = useCallback(
    (market: PerpsMarketData, index: number) => {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]: RELATED_MARKET_CLICKED,
        [RELATED_MARKETS_EVENT_PROPERTY.SOURCE_MARKET]: currentMarket.symbol,
        [RELATED_MARKETS_EVENT_PROPERTY.MARKET]: market.symbol,
        [RELATED_MARKETS_EVENT_PROPERTY.CATEGORY]: collection.id,
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
    [collection.id, currentMarket.symbol, navigation, track],
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

  const renderedMarkets = markets;
  const symbols = useMemo(
    () => renderedMarkets.map((market) => market.symbol),
    [renderedMarkets],
  );
  const { sparklines } = useHomepageSparklines(symbols);

  if (renderedMarkets.length === 0) {
    return null;
  }

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
        {renderedMarkets.map((market, index) => (
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
