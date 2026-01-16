import React from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useStyles } from '../../../../../../../component-library/hooks';
import PerpsMarketSortDropdowns from '../../../../components/PerpsMarketSortDropdowns';
import PerpsStocksCommoditiesDropdown from '../../../../components/PerpsStocksCommoditiesDropdown';
import type { PerpsMarketFiltersBarProps } from './PerpsMarketFiltersBar.types';
import styleSheet from './PerpsMarketFiltersBar.styles';

/**
 * PerpsMarketFiltersBar Component
 *
 * Combines market sort dropdown with watchlist filter toggle
 * Provides a unified filter bar for the markets list
 *
 * Features:
 * - Sort dropdown on the left (market, volume, open interest, etc.)
 * - Watchlist toggle button on the right (icon + text)
 * - Visual feedback for active watchlist filter (filled vs outline star)
 *
 * @example
 * ```tsx
 * <PerpsMarketFiltersBar
 *   selectedOptionId="openInterest"
 *   onSortPress={() => setSheetVisible(true)}
 * />
 * ```
 */
const PerpsMarketFiltersBar: React.FC<PerpsMarketFiltersBarProps> = ({
  selectedOptionId,
  onSortPress,
  showStocksCommoditiesDropdown = false,
  stocksCommoditiesFilter = 'all',
  onStocksCommoditiesPress,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortContainer}
        style={styles.sortScrollView}
      >
        <PerpsMarketSortDropdowns
          selectedOptionId={selectedOptionId}
          onSortPress={onSortPress}
          testID={testID ? `${testID}-sort` : undefined}
        />
        {showStocksCommoditiesDropdown && onStocksCommoditiesPress && (
          <PerpsStocksCommoditiesDropdown
            selectedFilter={stocksCommoditiesFilter}
            onPress={onStocksCommoditiesPress}
            testID={testID ? `${testID}-stocks-commodities` : undefined}
          />
        )}
      </ScrollView>
    </View>
  );
};

export default PerpsMarketFiltersBar;
