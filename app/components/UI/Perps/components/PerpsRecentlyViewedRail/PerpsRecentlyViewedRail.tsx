import React, { memo, useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  SectionHeader,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  PERPS_EVENT_PROPERTY,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { formatPercentChange } from '../../../Trending/utils/formatPercentChange';
import { ExplorePill } from '../../../Trending/components/ExplorePill';
import PerpsTokenLogo from '../PerpsTokenLogo/PerpsTokenLogo';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsLivePrices } from '../../hooks/stream';
import { formatPercentage } from '../../utils/formatUtils';
import { PerpsRecentlyViewedRailSelectorsIDs } from '../../Perps.testIds';

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
const LOGO_SIZE = 24;

const PerpsRecentlyViewedPill: React.FC<{
  market: PerpsMarketData;
  index: number;
  onPress: (market: PerpsMarketData, index: number) => void;
}> = ({ market, index, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(market, index);
  }, [onPress, market, index]);

  // Same live-price overlay as PerpsMarketRowItem so the pill % matches the list.
  const livePrices = usePerpsLivePrices({
    symbols: [market.symbol],
    throttleMs: 3000,
  });

  const change24hPercent = useMemo(() => {
    const livePercentChange = livePrices[market.symbol]?.percentChange24h;
    if (livePercentChange === undefined || livePercentChange === '') {
      return market.change24hPercent;
    }
    return formatPercentage(Number.parseFloat(livePercentChange));
  }, [livePrices, market.change24hPercent, market.symbol]);

  const { changeTextColor } = useMemo(
    () => formatPercentChange(change24hPercent),
    [change24hPercent],
  );

  return (
    <ExplorePill
      onPress={handlePress}
      testID={`perps-recently-viewed-tile-${market.symbol}`}
      leading={
        <PerpsTokenLogo
          symbol={market.symbol}
          size={LOGO_SIZE}
          recyclingKey={market.symbol}
        />
      }
      title={getPerpsDisplaySymbol(market.symbol)}
      changeLabel={change24hPercent}
      changeTextColor={changeTextColor}
    />
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
    <Box testID={PerpsRecentlyViewedRailSelectorsIDs.RAIL} twClassName="pb-1">
      <SectionHeader
        title={strings('perps.recently_viewed')}
        twClassName="pt-1"
        titleProps={{
          variant: TextVariant.BodySm,
          color: TextColor.TextAlternative,
        }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        testID={PerpsRecentlyViewedRailSelectorsIDs.PILL_GRID}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          gap={3}
          twClassName="px-4 pb-1"
        >
          {visibleMarkets.map((market, index) => (
            <PerpsRecentlyViewedPill
              key={market.symbol}
              market={market}
              index={index}
              onPress={handlePress}
            />
          ))}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default memo(PerpsRecentlyViewedRail);
