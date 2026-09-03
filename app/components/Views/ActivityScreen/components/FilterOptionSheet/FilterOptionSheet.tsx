import React, { useCallback, useRef, useState } from 'react';
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
  /**
   * Called when the user picks an option (OptionsSheet pattern: callback
   * first, then close the sheet).
   */
  onSelect: (option: T) => void;
  onClose: () => void;
  /**
   * When hosted as a navigation screen (e.g. ROOT_MODAL_FLOW), pass
   * `() => navigation.goBack()` so dismiss pops the modal route.
   */
  goBack?: () => void;
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
  goBack,
  sheetTestID,
  getOptionTestID,
}: FilterOptionSheetProps<T>) {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  // ROOT_MODAL_FLOW uses animation: 'none', so the opening tap can land on the
  // overlay and immediately dismiss (goBack). Keep the sheet non-interactive
  // until it has fully opened.
  const [isReady, setIsReady] = useState(false);

  const handleOpen = useCallback(() => {
    setIsReady(true);
  }, []);

  const handleSelect = useCallback(
    (option: T) => {
      // OptionsSheet pattern: invoke callback first, then close (goBack).
      onSelect(option);
      sheetRef.current?.onCloseBottomSheet();
    },
    [onSelect],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      onOpen={handleOpen}
      // Always wire goBack so select-then-close works even if the user taps an
      // option before onOpen. Only the overlay/swipe stays gated by isReady
      // (press-through guard for ROOT_MODAL_FLOW animation: 'none').
      goBack={goBack}
      isInteractable={isReady}
      testID={sheetTestID}
    >
      <BottomSheetHeader>{title}</BottomSheetHeader>
      <Box twClassName="pb-2">
        {options.map((option) => {
          const isSelected = option === selected;
          return (
            <Pressable
              key={option}
              onPress={() => handleSelect(option)}
              style={tw.style(
                'flex-row items-center justify-between px-4 py-3',
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
