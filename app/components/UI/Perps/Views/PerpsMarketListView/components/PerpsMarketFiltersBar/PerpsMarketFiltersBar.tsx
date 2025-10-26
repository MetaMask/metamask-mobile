import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useStyles } from '../../../../../../../component-library/hooks';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import PerpsMarketSortDropdowns from '../../../../components/PerpsMarketSortDropdowns';
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
 *   showWatchlistOnly={false}
 *   onWatchlistToggle={() => setShowWatchlist(!showWatchlist)}
 * />
 * ```
 */
const PerpsMarketFiltersBar: React.FC<PerpsMarketFiltersBarProps> = ({
  selectedOptionId,
  onSortPress,
  showWatchlistOnly,
  onWatchlistToggle,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.sortContainer}>
        <PerpsMarketSortDropdowns
          selectedOptionId={selectedOptionId}
          onSortPress={onSortPress}
          testID={testID ? `${testID}-sort` : undefined}
        />
      </View>
      <TouchableOpacity
        style={styles.watchlistButton}
        onPress={onWatchlistToggle}
        testID={testID ? `${testID}-watchlist-toggle` : undefined}
      >
        <Icon
          name={showWatchlistOnly ? IconName.StarFilled : IconName.Star}
          size={IconSize.Sm}
        />
        <Text variant={TextVariant.BodyMD}>Watchlist</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PerpsMarketFiltersBar;
