import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import { MARKET_SORTING_CONFIG } from '../../constants/perpsConfig';
import styleSheet from './PerpsMarketSortFilters.styles';
import type { PerpsMarketSortFiltersProps } from './PerpsMarketSortFilters.types';

/**
 * PerpsMarketSortFilters Component
 *
 * Reusable sort chips and direction toggle UI component with no internal state.
 * Fully controlled component - parent manages sort state.
 *
 * Features:
 * - Sort chips (Volume, Price Change, Funding Rate)
 * - Direction toggle (High to Low / Low to High)
 * - Configurable sort options
 * - Consistent styling across all Perps views
 *
 * @example
 * ```tsx
 * const { sortBy, direction, handleSortChange, handleDirectionToggle } = usePerpsSorting();
 *
 * <PerpsMarketSortFilters
 *   sortBy={sortBy}
 *   direction={direction}
 *   onSortChange={handleSortChange}
 *   onDirectionToggle={handleDirectionToggle}
 * />
 * ```
 */
const PerpsMarketSortFilters: React.FC<PerpsMarketSortFiltersProps> = ({
  sortBy,
  direction,
  onSortChange,
  onDirectionToggle,
  testID = 'perps-market-sort-filters',
}) => {
  const { styles } = useStyles(styleSheet, {});

  const renderSortChip = useCallback(
    (field: typeof sortBy, labelKey: string) => {
      const isSelected = sortBy === field;
      return (
        <TouchableOpacity
          key={field}
          style={[styles.sortChip, isSelected && styles.sortChipSelected]}
          onPress={() => onSortChange(field)}
          testID={`${testID}-chip-${field}`}
        >
          <Text
            variant={TextVariant.BodySM}
            color={isSelected ? TextColor.Primary : TextColor.Default}
          >
            {strings(labelKey)}
          </Text>
        </TouchableOpacity>
      );
    },
    [sortBy, onSortChange, styles, testID],
  );

  return (
    <View style={styles.container} testID={testID}>
      {/* Sort Chips */}
      <View style={styles.sortRow}>
        {MARKET_SORTING_CONFIG.SORT_BUTTON_PRESETS.map((option) =>
          renderSortChip(option.field, option.labelKey),
        )}
      </View>

      {/* Direction Toggle */}
      <View style={styles.directionRow}>
        <TouchableOpacity
          style={styles.directionButton}
          onPress={onDirectionToggle}
          testID={`${testID}-direction-toggle`}
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {strings(
              direction === 'desc'
                ? 'perps.sort.high_to_low'
                : 'perps.sort.low_to_high',
            )}
          </Text>
          <ButtonIcon
            iconName={
              direction === 'desc' ? IconName.ArrowDown : IconName.ArrowUp
            }
            size={ButtonIconSizes.Sm}
            iconColor={IconColor.Alternative}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PerpsMarketSortFilters;
