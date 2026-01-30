import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import ButtonBase from '../../../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { strings } from '../../../../../../locales/i18n';
import { styleSheet } from './PerpsMarketSortFieldBottomSheet.styles';
import type { PerpsMarketSortFieldBottomSheetProps } from './PerpsMarketSortFieldBottomSheet.types';
import {
  MARKET_SORTING_CONFIG,
  type SortOptionId,
} from '../../constants/perpsConfig';
import type { SortDirection } from '../../utils/sortMarkets';

/**
 * PerpsMarketSortFieldBottomSheet Component
 *
 * Bottom sheet for selecting market sort options with apply button.
 * Similar to trending tokens sort pattern.
 *
 * Features:
 * - Flat list of sort options
 * - Direction toggle for price change only (tap to toggle high-to-low / low-to-high)
 * - Other options (volume, open interest, funding rate) show checkmark when selected
 * - Apply button to confirm selection
 *
 * @example
 * ```tsx
 * <PerpsMarketSortFieldBottomSheet
 *   isVisible={showSortSheet}
 *   onClose={() => setShowSortSheet(false)}
 *   selectedOptionId="priceChange"
 *   sortDirection="desc"
 *   onOptionSelect={handleSortChange}
 * />
 * ```
 */
const PerpsMarketSortFieldBottomSheet: React.FC<
  PerpsMarketSortFieldBottomSheetProps
> = ({
  isVisible,
  onClose,
  selectedOptionId: initialSelectedOptionId,
  sortDirection: initialSortDirection,
  onOptionSelect,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  // Local state for selection (not applied until Apply button is pressed)
  const [selectedOption, setSelectedOption] = useState(initialSelectedOptionId);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(initialSortDirection);

  // Sync local state when props change or when sheet opens
  // This ensures uncommitted changes are reset when reopening the sheet
  useEffect(() => {
    if (isVisible) {
      setSelectedOption(initialSelectedOptionId);
      setSortDirection(initialSortDirection);
    }
  }, [initialSelectedOptionId, initialSortDirection, isVisible]);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  /**
   * Handle option press - either select new option or toggle direction (only for priceChange)
   */
  const handleOptionPress = useCallback(
    (optionId: SortOptionId) => {
      // If clicking the same option AND it's priceChange, toggle sort direction
      if (selectedOption === optionId && optionId === 'priceChange') {
        const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        setSortDirection(newDirection);
      } else {
        // If clicking a different option, select it with descending direction
        setSelectedOption(optionId);
        setSortDirection('desc');
      }
    },
    [selectedOption, sortDirection],
  );

  /**
   * Handle apply button - applies selection and closes sheet
   */
  const handleApply = useCallback(() => {
    const option = MARKET_SORTING_CONFIG.SORT_OPTIONS.find(
      (opt) => opt.id === selectedOption,
    );
    if (option) {
      onOptionSelect(option.id, option.field, sortDirection);
    }
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      onClose();
    });
  }, [selectedOption, sortDirection, onOptionSelect, onClose]);

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      isFullscreen={false}
      testID={testID}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.sort.sort_by')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.optionsList}>
        {/* Render sort options */}
        {MARKET_SORTING_CONFIG.SORT_OPTIONS.map((option) => {
          const isSelected = selectedOption === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionRow, isSelected && styles.optionRowSelected]}
              activeOpacity={1}
              onPress={() => handleOptionPress(option.id)}
              testID={testID ? `${testID}-option-${option.id}` : undefined}
            >
              <Text variant={TextVariant.BodyMD}>
                {strings(option.labelKey)}
              </Text>
              {isSelected && option.id === 'priceChange' && (
                <View
                  style={styles.arrowContainer}
                  testID={testID ? `${testID}-direction-indicator` : undefined}
                >
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    color={TextColor.Alternative}
                    testID={testID ? `${testID}-direction-text` : undefined}
                  >
                    {sortDirection === 'asc'
                      ? strings('perps.sort.low_to_high')
                      : strings('perps.sort.high_to_low')}
                  </Text>
                  <Icon
                    name={
                      sortDirection === 'asc'
                        ? IconName.Arrow2Up
                        : IconName.Arrow2Down
                    }
                    size={IconSize.Md}
                    color={IconColor.Alternative}
                  />
                </View>
              )}
              {isSelected && option.id !== 'priceChange' && (
                <Icon
                  name={IconName.Check}
                  size={IconSize.Md}
                  testID={
                    testID ? `${testID}-checkmark-${option.id}` : undefined
                  }
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <ButtonBase
        label={
          <Text style={styles.applyButtonText}>
            {strings('perps.sort.apply')}
          </Text>
        }
        onPress={handleApply}
        style={styles.applyButton}
        testID={testID ? `${testID}-apply-button` : undefined}
      />
    </BottomSheet>
  );
};

export default PerpsMarketSortFieldBottomSheet;
