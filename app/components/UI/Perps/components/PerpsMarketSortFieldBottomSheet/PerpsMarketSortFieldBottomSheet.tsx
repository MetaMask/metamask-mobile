import React, { useRef, useEffect, useCallback } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItemSelect,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { PerpsMarketSortFieldBottomSheetProps } from './PerpsMarketSortFieldBottomSheet.types';
import {
  MARKET_SORTING_CONFIG,
  type SortOptionId,
  type SortDirection,
} from '@metamask/perps-controller';

/**
 * PerpsMarketSortFieldBottomSheet Component
 *
 * Bottom sheet for selecting market sort options.
 *
 * Features:
 * - Flat list of sort options
 * - Direction toggle when tapping the same option (high-to-low / low-to-high)
 * - Selecting an option closes the sheet and applies the sort immediately
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
  selectedOptionId,
  sortDirection,
  onOptionSelect,
  testID,
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const handleOptionPress = useCallback(
    (optionId: SortOptionId) => {
      const option = MARKET_SORTING_CONFIG.SortOptions.find(
        (opt) => opt.id === optionId,
      );
      if (!option) return;

      const nextDirection: SortDirection =
        selectedOptionId === optionId
          ? sortDirection === 'asc'
            ? 'desc'
            : 'asc'
          : 'desc';

      bottomSheetRef.current?.onCloseBottomSheet(() => {
        onOptionSelect(option.id, option.field, nextDirection);
        onClose();
      });
    },
    [selectedOptionId, sortDirection, onOptionSelect, onClose],
  );

  if (!isVisible) return null;

  return (
    <BottomSheet ref={bottomSheetRef} onClose={onClose} testID={testID}>
      <BottomSheetHeader onClose={handleClose}>
        {strings('perps.sort.sort_by')}
      </BottomSheetHeader>
      {MARKET_SORTING_CONFIG.SortOptions.map((option) => {
        const isSelected = selectedOptionId === option.id;
        return (
          <ListItemSelect
            key={option.id}
            title={strings(option.labelKey)}
            isSelected={isSelected}
            showSelectedIcon={false}
            onPress={() => handleOptionPress(option.id)}
            endAccessory={
              isSelected ? (
                <Box twClassName="flex-row items-center gap-2">
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
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
                    color={IconColor.IconAlternative}
                    testID={
                      testID ? `${testID}-direction-indicator` : undefined
                    }
                  />
                </Box>
              ) : undefined
            }
            testID={testID ? `${testID}-option-${option.id}` : undefined}
          />
        );
      })}
    </BottomSheet>
  );
};

export default PerpsMarketSortFieldBottomSheet;
