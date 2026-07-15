import React, { memo, useCallback } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import {
  SectionHeader,
  TextVariant as DSTextVariant,
  TextColor as DSTextColor,
} from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import PerpsTokenLogo from '../PerpsTokenLogo/PerpsTokenLogo';
import { PerpsLeverage } from '../PerpsLeverage';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsRecentlyViewedRailSelectorsIDs } from '../../Perps.testIds';
import styleSheet from './PerpsRecentlyViewedRail.styles';

/** `source_section` value for market-details navigation and analytics originating from this rail. */
export const RECENTLY_VIEWED_SOURCE_SECTION = 'recently_viewed';
export const RECENTLY_VIEWED_MARKET_CLICKED = 'recently_viewed_market_clicked';

export const RECENTLY_VIEWED_EVENT_PROPERTY = {
  MARKET: 'market',
  POSITION: 'position',
} as const;

export interface PerpsRecentlyViewedRailProps {
  /** Full market objects for recently viewed symbols, newest-first. Already capped/TTL-filtered upstream. */
  markets: PerpsMarketData[];
  /** Invoked when a pill is pressed; the parent owns navigation. */
  onMarketPress: (market: PerpsMarketData, index: number) => void;
}

/** Mirrors the core `PERPS_CONSTANTS.RecentlyViewedMarketsLimit`; belt-and-suspenders cap. */
const MAX_TILES = 10;

const PerpsRecentlyViewedTile: React.FC<{
  market: PerpsMarketData;
  index: number;
  onPress: (market: PerpsMarketData, index: number) => void;
}> = ({ market, index, onPress }) => {
  const { styles } = useStyles(styleSheet, {});

  const handlePress = useCallback(() => {
    onPress(market, index);
  }, [onPress, market, index]);

  const isPositiveChange = !market.change24h.startsWith('-');
  const changeColor = isPositiveChange ? TextColor.Success : TextColor.Error;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.tile}
      testID={`perps-recently-viewed-tile-${market.symbol}`}
      accessibilityRole="button"
      accessibilityLabel={`${market.symbol} recently viewed market`}
    >
      <PerpsTokenLogo symbol={market.symbol} size={32} />

      <View style={styles.symbolRow}>
        <Text
          variant={TextVariant.BodySMMedium}
          color={TextColor.Default}
          numberOfLines={1}
        >
          {market.symbol}
        </Text>
        <PerpsLeverage maxLeverage={market.maxLeverage} />
      </View>

      <View style={styles.priceRow}>
        <Text
          variant={TextVariant.BodyXS}
          color={TextColor.Default}
          style={styles.priceLabel}
          numberOfLines={1}
        >
          {market.price}
        </Text>
        <Text
          variant={TextVariant.BodyXS}
          color={changeColor}
          numberOfLines={1}
        >
          {market.change24hPercent}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Horizontal rail of the markets the user has most recently viewed
 * (newest-first, TTL/limit enforced by the core `PerpsController`).
 * Renders nothing when there is no qualifying history.
 */
const PerpsRecentlyViewedRail: React.FC<PerpsRecentlyViewedRailProps> = ({
  markets,
  onMarketPress,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { track } = usePerpsEventTracking();

  const handlePress = useCallback(
    (market: PerpsMarketData, index: number) => {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]: RECENTLY_VIEWED_MARKET_CLICKED,
        [RECENTLY_VIEWED_EVENT_PROPERTY.MARKET]: market.symbol,
        [RECENTLY_VIEWED_EVENT_PROPERTY.POSITION]: index + 1,
      });
      onMarketPress(market, index);
    },
    [onMarketPress, track],
  );

  if (markets.length === 0) {
    return null;
  }

  const visibleMarkets = markets.slice(0, MAX_TILES);

  return (
    <View style={styles.rail} testID={PerpsRecentlyViewedRailSelectorsIDs.RAIL}>
      <SectionHeader
        title={strings('perps.recently_searched')}
        titleProps={{
          variant: DSTextVariant.BodySm,
          color: DSTextColor.TextAlternative,
        }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        testID={PerpsRecentlyViewedRailSelectorsIDs.PILL_GRID}
      >
        {visibleMarkets.map((market, index) => (
          <PerpsRecentlyViewedTile
            key={market.symbol}
            market={market}
            index={index}
            onPress={handlePress}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default memo(PerpsRecentlyViewedRail);
