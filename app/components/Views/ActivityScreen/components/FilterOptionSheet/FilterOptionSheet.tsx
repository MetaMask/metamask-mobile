import React, { useCallback, useRef } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

export interface FilterOptionSheetProps<T extends string> {
  /** Sheet header title. */
  title: string;
  /** Options to render, in display order. */
  options: readonly T[];
  /** Currently-selected option (gets the check icon + highlight). */
  selected: T;
  /** Resolves an option's display label. */
  getLabel: (option: T) => string;
  onSelect: (option: T) => void;
  onClose: () => void;
  /** testID for the sheet container. */
  sheetTestID: string;
  /** Resolves an option row's testID. */
  getOptionTestID: (option: T) => string;
}

/**
 * Generic single-select bottom sheet for Activity filters (Type, Perps
 * sub-filter, …). One row per option; the selected row is highlighted and shows
 * a check.
 */
export function FilterOptionSheet<T extends string>({
  title,
  options,
  selected,
  getLabel,
  onSelect,
  onClose,
  sheetTestID,
  getOptionTestID,
}: FilterOptionSheetProps<T>) {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleSelect = useCallback(
    (option: T) => {
      onSelect(option);
      sheetRef.current?.onCloseBottomSheet();
    },
    [onSelect],
  );

  return (
    <BottomSheet ref={sheetRef} onClose={onClose} testID={sheetTestID}>
      <BottomSheetHeader>{title}</BottomSheetHeader>

      <Box twClassName="pb-4">
        {options.map((option) => {
          const isSelected = option === selected;
          return (
            <Pressable
              key={option}
              onPress={() => handleSelect(option)}
              style={tw.style(
                'flex-row items-center justify-between px-4 py-4',
                isSelected && 'bg-muted',
              )}
              testID={getOptionTestID(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text variant={TextVariant.BodyMd}>{getLabel(option)}</Text>
              {isSelected ? (
                <Icon
                  name={IconName.Check}
                  size={IconSize.Md}
                  color={IconColor.IconDefault}
                />
              ) : null}
            </Pressable>
          );
        })}
      </Box>
    </BottomSheet>
  );
}
