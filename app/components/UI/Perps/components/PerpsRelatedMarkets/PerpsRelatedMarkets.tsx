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

export interface PerpsRelatedMarketsProps {
  currentMarket: PerpsMarketData;
}

const MAX_PILLS = 12;
const PILLS_PER_ROW = 6;

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
  pillGrid: {
    paddingHorizontal: 16,
    gap: 10,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  const markets = useMemo(
    () => relatedMarketsResult?.markets.slice(0, MAX_PILLS),
    [relatedMarketsResult?.markets],
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

  if (!relatedMarketsResult || !markets) {
    return null;
  }

  const { collection } = relatedMarketsResult;

  const row1 = markets.slice(0, PILLS_PER_ROW);
  const row2 = markets.slice(PILLS_PER_ROW, MAX_PILLS);

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

      <View
        style={styles.pillGrid}
        testID={PerpsRelatedMarketsSelectorsIDs.PILL_GRID}
      >
        <View style={styles.pillRow}>
          {row1.map((market, index) => (
            <PerpsPillItem
              key={market.symbol}
              item={{ market, isWatchlisted: false }}
              onNavigateToMarketDetails={() => handleMarketPress(market, index)}
            />
          ))}
        </View>
        {row2.length > 0 && (
          <View style={styles.pillRow}>
            {row2.map((market, index) => (
              <PerpsPillItem
                key={market.symbol}
                item={{ market, isWatchlisted: false }}
                onNavigateToMarketDetails={() =>
                  handleMarketPress(market, index + PILLS_PER_ROW)
                }
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export default memo(PerpsRelatedMarkets);
