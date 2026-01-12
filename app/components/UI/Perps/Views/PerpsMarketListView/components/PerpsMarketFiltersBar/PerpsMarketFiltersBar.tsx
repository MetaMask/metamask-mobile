import React from 'react';
import { View, ScrollView } from 'react-native';
import { useStyles } from '../../../../../../../component-library/hooks';
import PerpsMarketSortDropdowns from '../../../../components/PerpsMarketSortDropdowns';
import PerpsMarketTypeDropdown from '../../../../components/PerpsMarketTypeDropdown';
import PerpsStocksCommoditiesDropdown from '../../../../components/PerpsStocksCommoditiesDropdown';
import type { PerpsMarketFiltersBarProps } from './PerpsMarketFiltersBar.types';
import styleSheet from './PerpsMarketFiltersBar.styles';

/**
 * PerpsMarketFiltersBar Component
 *
 * Combines market type filter, sort dropdown, and optional sub-filters
 * Provides a unified filter bar for the markets list
 *
 * Features:
 * - Market type dropdown (All, Crypto, Stocks & Commodities)
 * - Sort dropdown (volume, price change, funding rate, etc.)
 * - Optional stocks/commodities sub-filter dropdown
 *
 * @example
 * ```tsx
 * <PerpsMarketFiltersBar
 *   selectedOptionId="openInterest"
 *   onSortPress={() => setSheetVisible(true)}
 *   showMarketTypeDropdown
 *   marketTypeFilter="all"
 *   onMarketTypePress={() => setMarketTypeSheetVisible(true)}
 * />
 * ```
 */
const PerpsMarketFiltersBar: React.FC<PerpsMarketFiltersBarProps> = ({
  selectedOptionId,
  onSortPress,
  showMarketTypeDropdown = false,
  marketTypeFilter = 'all',
  onMarketTypePress,
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
        {showMarketTypeDropdown && onMarketTypePress && (
          <PerpsMarketTypeDropdown
            selectedFilter={marketTypeFilter}
            onPress={onMarketTypePress}
            testID={testID ? `${testID}-market-type` : undefined}
          />
        )}
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
