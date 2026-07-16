import React, { useCallback } from 'react';
import { View } from 'react-native';
import {
  FlashList,
  type FlashListProps,
  type FlashListRef,
} from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
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

type PerpsFlashListProps = FlashListProps<PerpsMarketData> & {
  ref?: React.Ref<FlashListRef<PerpsMarketData>>;
};

/**
 * Reanimated-wrapped FlashList so callers can drive UI-thread sticky overlays
 * (etc.) via `useAnimatedScrollHandler` without FlashList's laggy JS sticky
 * headers. Cast matches the PredictFeed pattern.
 */
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as React.ComponentType<PerpsFlashListProps>,
) as unknown as React.ComponentType<PerpsFlashListProps>;

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
 * - Reanimated-compatible onScroll for UI-thread sticky overlays
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
  onScroll,
  scrollEventThrottle = 16,
}) => {
  const { styles } = useStyles(styleSheet, {});

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
    <AnimatedFlashList
      data={markets}
      extraData={filterKey}
      renderItem={renderItem}
      keyExtractor={(item: PerpsMarketData) => item.symbol}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={ListHeaderComponent}
      drawDistance={PERPS_MARKET_LIST_CONSTANTS.FLASH_LIST_DRAW_DISTANCE}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      testID={testID}
    />
  );
};

export default PerpsMarketList;
