import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { styleSheet } from './PerpsMarketSortDropdowns.styles';
import type { PerpsMarketSortDropdownsProps } from './PerpsMarketSortDropdowns.types';

/**
 * PerpsMarketSortDropdowns Component
 *
 * Compact dropdown buttons for market sorting controls.
 * Replaces horizontal chip-based sorting UI with space-efficient dropdowns.
 *
 * Features:
 * - Two dropdown buttons (Sort Field + Direction)
 * - Shows current selection with chevron indicator
 * - Opens bottom sheets for selection
 * - Matches candle period selector button pattern
 * - Optional favorites filter toggle
 *
 * @example
 * ```tsx
 * <PerpsMarketSortDropdowns
 *   sortBy={sortBy}
 *   direction={direction}
 *   onSortPress={() => setShowSortSheet(true)}
 *   onDirectionPress={() => setShowDirectionSheet(true)}
 *   showFavoritesOnly={false}
 *   onFavoritesToggle={() => setShowFavoritesOnly(!showFavoritesOnly)}
 * />
 * ```
 */
const PerpsMarketSortDropdowns: React.FC<PerpsMarketSortDropdownsProps> = ({
  sortBy,
  direction,
  onSortPress,
  onDirectionPress,
  showFavoritesOnly = false,
  onFavoritesToggle,
  testID = 'perps-market-sort-dropdowns',
}) => {
  const { styles } = useStyles(styleSheet, {});

  // Get display label for current sort field
  const sortLabel = useMemo(() => {
    switch (sortBy) {
      case 'volume':
        return strings('perps.sort.volume');
      case 'priceChange':
        return strings('perps.sort.price_change');
      case 'fundingRate':
        return strings('perps.sort.funding_rate');
      default:
        return strings('perps.sort.volume');
    }
  }, [sortBy]);

  // Get display label for current direction
  const directionLabel = useMemo(
    () =>
      direction === 'desc'
        ? strings('perps.sort.high_to_low')
        : strings('perps.sort.low_to_high'),
    [direction],
  );

  return (
    <Box style={styles.container} testID={testID}>
      {/* Sort Field Dropdown */}
      <Pressable
        style={({ pressed }) => [
          styles.dropdownButton,
          pressed && styles.dropdownButtonPressed,
        ]}
        onPress={onSortPress}
        testID={`${testID}-sort-field`}
      >
        <Text variant={TextVariant.BodySm} style={styles.dropdownText}>
          {sortLabel}
        </Text>
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Xs}
          color={IconColor.Alternative}
        />
      </Pressable>

      {/* Sort Direction Dropdown */}
      <Pressable
        style={({ pressed }) => [
          styles.dropdownButton,
          pressed && styles.dropdownButtonPressed,
        ]}
        onPress={onDirectionPress}
        testID={`${testID}-direction`}
      >
        <Text variant={TextVariant.BodySm} style={styles.dropdownText}>
          {directionLabel}
        </Text>
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Xs}
          color={IconColor.Alternative}
        />
      </Pressable>

      {/* Favorites Filter Toggle - Only show if handler provided */}
      {onFavoritesToggle && (
        <Pressable
          style={({ pressed }) => [
            styles.dropdownButton,
            showFavoritesOnly && styles.dropdownButtonActive,
            pressed && styles.dropdownButtonPressed,
          ]}
          onPress={onFavoritesToggle}
          testID={`${testID}-favorites`}
        >
          <Icon
            name={showFavoritesOnly ? IconName.StarFilled : IconName.Star}
            size={IconSize.Xs}
            color={
              showFavoritesOnly ? IconColor.Primary : IconColor.Alternative
            }
          />
          <Text
            variant={TextVariant.BodySm}
            style={[
              styles.dropdownText,
              showFavoritesOnly && styles.dropdownTextActive,
            ]}
          >
            {strings('perps.sort.favorites')}
          </Text>
        </Pressable>
      )}
    </Box>
  );
};

export default PerpsMarketSortDropdowns;
