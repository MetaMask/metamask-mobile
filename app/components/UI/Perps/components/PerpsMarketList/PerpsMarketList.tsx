import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import PerpsMarketRowItem from '../PerpsMarketRowItem';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';
import { PERPS_MARKET_LIST_CONSTANTS } from '../../constants/marketListConfig';
import styleSheet from './PerpsMarketList.styles';
import type { PerpsMarketListProps } from './PerpsMarketList.types';
import { type PerpsMarketData } from '@metamask/perps-controller';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

const STICKY_HEADER_KEY = '__perps-market-list-sticky-header__';
const STICKY_HEADER_INDICES = [0];
const STICKY_HEADER_ROW = { type: 'sticky' } as const;

type MarketListRow =
  | typeof STICKY_HEADER_ROW
  | { type: 'market'; market: PerpsMarketData };

/**
 * PerpsMarketList Component
 *
 * Reusable FlashList wrapper with consistent configuration.
 * Handles market list rendering with optimal performance.
 *
 * Features:
 * - FlashList for optimal performance
 * - Consistent configuration (keyboardShouldPersistTaps, drawDistance)
 * - Empty state handling
 * - Auto-updating via WebSocket (no manual refresh needed)
 * - Optional header component
 * - Optional sticky first row (below the list header)
 *
 * @example
 * ```tsx
 * <PerpsMarketList
 *   markets={filteredMarkets}
 *   onMarketPress={handleMarketPress}
 *   sortBy={sortBy}
 * />
 * ```
 */
const PerpsMarketList: React.FC<PerpsMarketListProps> = ({
  markets,
  onMarketPress,
  emptyMessage = strings('perps.home.no_markets'),
  ListHeaderComponent,
  stickyHeader,
  keepHeaderHiddenOnReset = false,
  emptyComponent,
  iconSize = HOME_SCREEN_CONFIG.DefaultIconSize,
  sortBy = 'volume',
  showBadge = true,
  contentContainerStyle,
  filterKey,
  scrollResetKey,
  refreshControl,
  testID = 'perps-market-list',
}) => {
  const { styles } = useStyles(styleSheet, {});

  const listRef = useRef<FlashListRef<MarketListRow>>(null);
  const hasStickyHeader = stickyHeader != null;
  // Reset scroll to the absolute top whenever the list context changes (the
  // active category, and — via scrollResetKey — search toggling on/off) so the
  // list header (e.g. the Recently Viewed rail, which sits above the first row)
  // scrolls back into view rather than leaving the user mid-list. Skips the
  // first render. With `keepHeaderHiddenOnReset` it resets to just below the
  // list header instead, and only if the user scrolled past it.
  //
  // offset 0 targets the very top (above the header); scrollToIndex would only
  // reach the first row and push the header off-screen. This is reliable
  // because maintainVisibleContentPosition is disabled below — otherwise its
  // post-data-change re-anchor to the previously visible row would override
  // the scroll.
  const scrollResetToken = scrollResetKey ?? filterKey;
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    // Ref is null when the new filter has no rows and no list header (empty
    // state rendered instead), so this safely no-ops in that case.
    const list = listRef.current;
    if (!list) {
      return;
    }

    if (keepHeaderHiddenOnReset && hasStickyHeader) {
      // The sticky row starts where the list header ends.
      const headerHeight = list.getFirstItemOffset();
      if (list.getAbsoluteLastScrollOffset() > headerHeight) {
        list.scrollToOffset({ offset: headerHeight, animated: true });
      }
      return;
    }

    list.scrollToOffset({ offset: 0, animated: true });
  }, [scrollResetToken, hasStickyHeader, keepHeaderHiddenOnReset]);

  const listData = useMemo<MarketListRow[]>(() => {
    const rows: MarketListRow[] = hasStickyHeader ? [STICKY_HEADER_ROW] : [];
    for (const market of markets) {
      rows.push({ type: 'market', market });
    }
    return rows;
  }, [hasStickyHeader, markets]);

  const renderItem = useCallback(
    ({ item }: { item: MarketListRow }) => {
      if (item.type === 'sticky') {
        return stickyHeader ? React.cloneElement(stickyHeader) : null;
      }
      return (
        <PerpsMarketRowItem
          market={item.market}
          // Pass the stable callback directly; PerpsMarketRowItem invokes it with
          // its own market. A per-row inline closure would change every render and
          // defeat React.memo on the row.
          onPress={onMarketPress}
          iconSize={iconSize}
          displayMetric={sortBy}
          showBadge={showBadge}
        />
      );
    },
    [stickyHeader, onMarketPress, iconSize, sortBy, showBadge],
  );

  const keyExtractor = useCallback(
    (item: MarketListRow) =>
      item.type === 'sticky' ? STICKY_HEADER_KEY : item.market.symbol,
    [],
  );

  const getItemType = useCallback((item: MarketListRow) => item.type, []);

  const renderEmpty = useCallback(
    () =>
      emptyComponent ?? (
        <View style={styles.emptyContainer} testID={`${testID}-empty`}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextMuted}>
            {emptyMessage}
          </Text>
        </View>
      ),
    [emptyComponent, styles.emptyContainer, emptyMessage, testID],
  );

  if (markets.length === 0 && !ListHeaderComponent && !hasStickyHeader) {
    return renderEmpty();
  }

  return (
    <FlashList
      ref={listRef}
      data={listData}
      extraData={filterKey}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      stickyHeaderIndices={hasStickyHeader ? STICKY_HEADER_INDICES : undefined}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmpty}
      // stickyHeader is a data row, so an empty `markets` array is still a
      // non-empty list and ListEmptyComponent never runs. Render the empty
      // copy as a footer in that case.
      ListFooterComponent={
        markets.length === 0 && hasStickyHeader ? renderEmpty : undefined
      }
      drawDistance={PERPS_MARKET_LIST_CONSTANTS.FLASH_LIST_DRAW_DISTANCE}
      // Disabled so the scroll-to-top on filter change reliably reaches the
      // very top (revealing the header); the market order comes from a static
      // snapshot with per-row live-price updates, so there are no above-viewport
      // insertions for it to protect against.
      maintainVisibleContentPosition={{ disabled: true }}
      refreshControl={refreshControl}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      testID={testID}
    />
  );
};

export default PerpsMarketList;
