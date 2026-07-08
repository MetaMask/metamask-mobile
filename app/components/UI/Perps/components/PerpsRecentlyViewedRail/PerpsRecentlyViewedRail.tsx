import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  PERPS_EVENT_PROPERTY,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PillScrollList } from '../../../Trending/components/PillScrollList';
import { SectionPillsSkeleton } from '../../../Trending/components/SectionPillsSkeleton';
import { PerpsPillItem } from '../PerpsPillItem';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsRecentlyViewedRailSelectorsIDs } from '../../Perps.testIds';
import type { PerpsFeedItem } from '../../types/perpsFeedTypes';

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

const ROW_COUNT = 1;
/** Mirrors the core `PERPS_CONSTANTS.RecentlyViewedMarketsLimit`; belt-and-suspenders cap. */
const MAX_PILLS = 10;

const styles = StyleSheet.create({
  rail: {
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
});

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

  const feedItems: PerpsFeedItem[] = useMemo(
    () => markets.map((market) => ({ market, isWatchlisted: false })),
    [markets],
  );

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

  const renderPill = useCallback(
    (item: PerpsFeedItem, index: number) => (
      <PerpsPillItem
        item={item}
        onNavigateToMarketDetails={() => handlePress(item.market, index)}
      />
    ),
    [handlePress],
  );

  if (markets.length === 0) {
    return null;
  }

  return (
    <View style={styles.rail} testID={PerpsRecentlyViewedRailSelectorsIDs.RAIL}>
      <View style={styles.header}>
        <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
          {strings('perps.recently_viewed')}
        </Text>
      </View>

      <PillScrollList<PerpsFeedItem>
        data={feedItems}
        isLoading={false}
        renderItem={renderPill}
        keyExtractor={(item) => item.market.symbol}
        Skeleton={SectionPillsSkeleton}
        rowCount={ROW_COUNT}
        maxPills={MAX_PILLS}
        wrapperTwClassName="bg-transparent"
        listTestId={PerpsRecentlyViewedRailSelectorsIDs.PILL_GRID}
      />
    </View>
  );
};

export default memo(PerpsRecentlyViewedRail);
