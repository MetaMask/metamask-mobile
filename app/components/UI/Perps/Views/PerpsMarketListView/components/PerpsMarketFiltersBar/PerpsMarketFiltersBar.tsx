import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../../../component-library/hooks';
import PerpsMarketSortDropdowns from '../../../../components/PerpsMarketSortDropdowns';
import PerpsMarketCategoryBadges from '../../../../components/PerpsMarketCategoryBadges';
import type { PerpsMarketFiltersBarProps } from './PerpsMarketFiltersBar.types';
import styleSheet from './PerpsMarketFiltersBar.styles';

/**
 * PerpsMarketFiltersBar Component
 *
 * Two-row filter bar for the markets list:
 * - Row 1: Category badges (Crypto, Stocks, Commodities, Forex)
 * - Row 2: Sort dropdown (volume, price change, funding rate, etc.)
 *
 * @example
 * ```tsx
 * <PerpsMarketFiltersBar
 *   selectedOptionId="volume"
 *   onSortPress={() => setSheetVisible(true)}
 *   marketTypeFilter="all"
 *   onCategorySelect={handleCategorySelect}
 * />
 * ```
 */
const PerpsMarketFiltersBar: React.FC<PerpsMarketFiltersBarProps> = ({
  selectedOptionId,
  onSortPress,
  marketTypeFilter,
  onCategorySelect,
  showWatchlistBadge,
  isWatchlistSelected,
  onWatchlistToggle,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container} testID={testID}>
      {/* Row 1: Category Badges (+ optional watchlist star badge) */}
      <PerpsMarketCategoryBadges
        selectedCategory={marketTypeFilter}
        onCategorySelect={onCategorySelect}
        showWatchlistBadge={showWatchlistBadge}
        isWatchlistSelected={isWatchlistSelected}
        onWatchlistToggle={onWatchlistToggle}
        testID={testID ? `${testID}-categories` : undefined}
      />

      {/* Row 2: Sort Dropdown — hidden when watchlist filter is active */}
      {!isWatchlistSelected && (
        <View style={styles.sortRow}>
          <PerpsMarketSortDropdowns
            selectedOptionId={selectedOptionId}
            onSortPress={onSortPress}
            testID={testID ? `${testID}-sort` : undefined}
          />
        </View>
      )}
    </View>
  );
};

export default PerpsMarketFiltersBar;
