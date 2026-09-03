import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  ButtonsAlignment,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItemSelect,
  ListItemVariant,
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

const DEFAULT_SORT_OPTION =
  MARKET_SORTING_CONFIG.SortOptions.find(
    (option) => option.id === MARKET_SORTING_CONFIG.DefaultSortOptionId,
  ) ?? MARKET_SORTING_CONFIG.SortOptions[0];

/**
 * PerpsMarketSortFieldBottomSheet Component
 *
 * Bottom sheet for selecting a single market sort field (not a binary filter).
 * Changes stay in draft until Apply; Reset restores the default sort.
 *
 * Tapping the selected option toggles high-to-low / low-to-high in the draft.
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
  const [draftOptionId, setDraftOptionId] =
    useState<SortOptionId>(selectedOptionId);
  const [draftDirection, setDraftDirection] =
    useState<SortDirection>(sortDirection);

  const resetDraft = useCallback(() => {
    setDraftOptionId(selectedOptionId);
    setDraftDirection(sortDirection);
  }, [selectedOptionId, sortDirection]);

  useEffect(() => {
    if (isVisible) {
      resetDraft();
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, resetDraft]);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const applyAndClose = useCallback(
    (optionId: SortOptionId, direction: SortDirection) => {
      const option = MARKET_SORTING_CONFIG.SortOptions.find(
        (opt) => opt.id === optionId,
      );
      if (!option) {
        return;
      }

      bottomSheetRef.current?.onCloseBottomSheet(() => {
        onOptionSelect(option.id, option.field, direction);
        onClose();
      });
    },
    [onClose, onOptionSelect],
  );

  const handleOptionPress = useCallback(
    (optionId: SortOptionId) => {
      if (draftOptionId === optionId) {
        setDraftDirection((currentDirection) =>
          currentDirection === 'asc' ? 'desc' : 'asc',
        );
        return;
      }

      setDraftOptionId(optionId);
      setDraftDirection('desc');
    },
    [draftOptionId],
  );

  const handleApply = useCallback(() => {
    applyAndClose(draftOptionId, draftDirection);
  }, [applyAndClose, draftDirection, draftOptionId]);

  const handleReset = useCallback(() => {
    setDraftOptionId(DEFAULT_SORT_OPTION.id);
    setDraftDirection(MARKET_SORTING_CONFIG.DefaultDirection);
  }, []);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('perps.sort.apply'),
      onPress: handleApply,
      testID: testID ? `${testID}-apply` : undefined,
    }),
    [handleApply, testID],
  );

  const secondaryButtonProps = useMemo(
    () => ({
      children: strings('perps.sort.reset'),
      onPress: handleReset,
      testID: testID ? `${testID}-reset` : undefined,
    }),
    [handleReset, testID],
  );

  if (!isVisible) return null;

  return (
    <BottomSheet ref={bottomSheetRef} onClose={onClose} testID={testID}>
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: testID ? `${testID}-close` : undefined,
        }}
      >
        {strings('perps.sort.sort_by')}
      </BottomSheetHeader>
      {MARKET_SORTING_CONFIG.SortOptions.map((option) => {
        const isSelected = draftOptionId === option.id;
        return (
          <ListItemSelect
            key={option.id}
            title={strings(option.labelKey)}
            variant={ListItemVariant.OneLine}
            isSelected={isSelected}
            showSelectedIcon={false}
            onPress={() => handleOptionPress(option.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            endAccessory={
              isSelected ? (
                <Box twClassName="flex-row items-center gap-2">
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    testID={testID ? `${testID}-direction-text` : undefined}
                  >
                    {draftDirection === 'asc'
                      ? strings('perps.sort.low_to_high')
                      : strings('perps.sort.high_to_low')}
                  </Text>
                  <Icon
                    name={
                      draftDirection === 'asc'
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
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        primaryButtonProps={primaryButtonProps}
        secondaryButtonProps={secondaryButtonProps}
        twClassName="pt-4"
      />
    </BottomSheet>
  );
};

export default PerpsMarketSortFieldBottomSheet;
