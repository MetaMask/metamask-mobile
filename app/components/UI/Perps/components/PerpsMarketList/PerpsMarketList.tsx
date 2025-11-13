import React, { useCallback } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
import type { PerpsMarketData } from '../../controllers/types';

/**
 * PerpsMarketList Component
 *
 * Reusable FlashList wrapper with consistent configuration.
 * Handles market list rendering with optimal performance.
 *
 * Features:
 * - FlashList for optimal performance
 * - Consistent configuration (estimatedItemSize, keyboardShouldPersistTaps)
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
  iconSize = HOME_SCREEN_CONFIG.DEFAULT_ICON_SIZE,
  sortBy = 'volume',
  showBadge = true,
  contentContainerStyle,
  testID = 'perps-market-list',
}) => {
  const { styles } = useStyles(styleSheet, {});

  const renderItem = useCallback(
    ({ item }: { item: PerpsMarketData }) => (
      <PerpsMarketRowItem
        market={item}
        onPress={() => onMarketPress(item)}
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
      data={markets}
      renderItem={renderItem}
      keyExtractor={(item: PerpsMarketData) => item.symbol}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={ListHeaderComponent}
      drawDistance={PERPS_MARKET_LIST_CONSTANTS.FLASH_LIST_DRAW_DISTANCE}
      removeClippedSubviews
      testID={testID}
    />
  );
};

export default PerpsMarketList;
