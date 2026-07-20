import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import PerpsMarketRowItem from '../PerpsMarketRowItem';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';
import { PERPS_MARKET_LIST_CONSTANTS } from '../../constants/marketListConfig';
import styleSheet from './PerpsMarketList.styles';
import type { PerpsMarketListProps } from './PerpsMarketList.types';
import { type PerpsMarketData } from '@metamask/perps-controller';

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
  iconSize = HOME_SCREEN_CONFIG.DefaultIconSize,
  sortBy = 'volume',
  showBadge = true,
  contentContainerStyle,
  filterKey,
  testID = 'perps-market-list',
}) => {
  const { styles } = useStyles(styleSheet, {});

  const listRef = useRef<FlashListRef<PerpsMarketData>>(null);
  // Reset scroll to the absolute top whenever the active category filter
  // changes so the list header (e.g. the Recently Viewed rail, which sits
  // above the first row) scrolls back into view rather than leaving the user
  // mid-list from the previous filter. Skips the first render.
  //
  // offset 0 targets the very top (above the header); scrollToIndex would only
  // reach the first row and push the header off-screen. This is reliable
  // because maintainVisibleContentPosition is disabled below — otherwise its
  // post-data-change re-anchor to the previously visible row would override
  // the scroll.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    // Ref is null when the new filter has no rows (empty state rendered
    // instead), so this safely no-ops in that case.
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [filterKey]);

  const renderItem = useCallback(
    ({ item }: { item: PerpsMarketData }) => (
      <PerpsMarketRowItem
        market={item}
        // Pass the stable callback directly; PerpsMarketRowItem invokes it with
        // its own market. A per-row inline closure would change every render and
        // defeat React.memo on the row.
        onPress={onMarketPress}
        iconSize={iconSize}
        displayMetric={sortBy}
        showBadge={showBadge}
      />
    ),
    [onMarketPress, iconSize, sortBy, showBadge],
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer} testID={`${testID}-empty`}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
          {emptyMessage}
        </Text>
      </View>
    ),
    [styles.emptyContainer, emptyMessage, testID],
  );

  if (markets.length === 0) {
    return renderEmpty();
  }

  return (
    <FlashList
      ref={listRef}
      data={markets}
      extraData={filterKey}
      renderItem={renderItem}
      keyExtractor={(item: PerpsMarketData) => item.symbol}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={ListHeaderComponent}
      drawDistance={PERPS_MARKET_LIST_CONSTANTS.FLASH_LIST_DRAW_DISTANCE}
      // Disabled so the scroll-to-top on filter change reliably reaches the
      // very top (revealing the header); the market order comes from a static
      // snapshot with per-row live-price updates, so there are no above-viewport
      // insertions for it to protect against.
      maintainVisibleContentPosition={{ disabled: true }}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      testID={testID}
    />
  );
};

export default PerpsMarketList;
