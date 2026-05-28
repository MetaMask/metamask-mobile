import React, { memo, useCallback, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Box, BoxAlignItems, Card } from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
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
import PerpsTokenLogo from '../PerpsTokenLogo';

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
    gap: 8,
  },
  tile: {
    width: 64,
    minHeight: 112,
  },
});

const isPositiveChange = (market: PerpsMarketData) =>
  !market.change24hPercent?.startsWith('-') &&
  !market.change24h?.startsWith('-');

const PerpsRelatedMarkets: React.FC<PerpsRelatedMarketsProps> = ({
  currentMarket,
  collection,
  markets,
}) => {
  const navigation = useNavigation();
  const { track } = usePerpsEventTracking();
  const hasTrackedSlide = useRef(false);

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

  const renderedMarkets = useMemo(() => markets.slice(0, 20), [markets]);

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
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
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
        {renderedMarkets.map((market, index) => {
          const changeColor = isPositiveChange(market)
            ? TextColor.Success
            : TextColor.Error;

          return (
            <Card
              key={market.symbol}
              onPress={() => handleMarketPress(market, index)}
              testID={getPerpsRelatedMarketsSelector.tile(market.symbol)}
              touchableOpacityProps={{ activeOpacity: 0.7 }}
              style={styles.tile}
              twClassName="items-center border-muted bg-default rounded-md px-2 py-3"
            >
              <Box alignItems={BoxAlignItems.Center} gap={2}>
                <PerpsTokenLogo
                  symbol={market.symbol}
                  size={28}
                  testID={getPerpsRelatedMarketsSelector.tileLogo(
                    market.symbol,
                  )}
                />
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                  numberOfLines={1}
                  testID={getPerpsRelatedMarketsSelector.tileSymbol(
                    market.symbol,
                  )}
                >
                  {getPerpsDisplaySymbol(market.symbol)}
                </Text>
                <Text
                  variant={TextVariant.BodyXS}
                  color={TextColor.Alternative}
                  numberOfLines={1}
                  testID={getPerpsRelatedMarketsSelector.tilePrice(
                    market.symbol,
                  )}
                >
                  {market.price}
                </Text>
                <Text
                  variant={TextVariant.BodyXS}
                  color={changeColor}
                  numberOfLines={1}
                  testID={getPerpsRelatedMarketsSelector.tileChange(
                    market.symbol,
                  )}
                >
                  {market.change24hPercent}
                </Text>
              </Box>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default memo(PerpsRelatedMarkets);
