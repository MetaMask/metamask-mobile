import {
  ActionListItem,
  BottomSheetDialog,
  BottomSheetHeader,
  Box,
  RadioButton,
} from '@metamask/design-system-react-native';
import React, { useCallback } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { playSelection } from '../../../../../util/haptics';
import { useTheme } from '../../../../../util/theme';
import { FilterOptionSheetSelectorsIDs } from './Filters.testIds';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export interface FilterOptionSheetProps<T extends string> {
  isOpen: boolean;
  /** Sheet header title, e.g. "Type" or "Time frame". */
  title: string;
  /** Options in display order. */
  options: readonly T[];
  /** Currently selected option. */
  value: T;
  /** Resolves an option's display label. */
  getLabel: (option: T) => string;
  onChange: (value: T) => void;
  onClose: () => void;
  sheetTestID: string;
  backdropTestID: string;
  getOptionTestID: (value: T) => string;
}

type FilterOptionSheetInnerProps<T extends string> = Omit<
  FilterOptionSheetProps<T>,
  'isOpen'
>;

function FilterOptionSheetInner<T extends string>({
  title,
  options,
  value,
  getLabel,
  onChange,
  onClose,
  sheetTestID,
  backdropTestID,
  getOptionTestID,
}: FilterOptionSheetInnerProps<T>) {
  const { colors } = useTheme();

  const handleSelect = useCallback(
    (next: T) => {
      if (next !== value) {
        playSelection().catch(() => undefined);
        onChange(next);
      }
      onClose();
    },
    [onChange, onClose, value],
  );

  return (
    // Render at the root via a full-screen Modal so the backdrop covers the
    // entire surface (header + tabs included) instead of being clipped to the
    // pager page. React context (theme, safe-area, redux) is preserved because
    // the children stay in the same React tree; GestureHandlerRootView keeps the
    // sheet's swipe-to-dismiss working inside the Modal's native view hierarchy.
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.root}>
        <Box twClassName="absolute inset-0">
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.overlay.default },
            ]}
            onPress={onClose}
            accessibilityRole="button"
            testID={backdropTestID}
          />

          <BottomSheetDialog onClose={onClose} testID={sheetTestID}>
            <BottomSheetHeader
              onClose={onClose}
              closeButtonProps={{
                testID: FilterOptionSheetSelectorsIDs.CLOSE_BUTTON,
              }}
            >
              {title}
            </BottomSheetHeader>
            <Box twClassName="pb-4">
              {options.map((option) => {
                const isSelected = option === value;
                return (
                  <ActionListItem
                    key={option}
                    label={getLabel(option)}
                    onPress={() => handleSelect(option)}
                    endAccessory={
                      <RadioButton
                        isChecked={isSelected}
                        onPress={() => handleSelect(option)}
                      />
                    }
                    accessibilityState={{ selected: isSelected }}
                    testID={getOptionTestID(option)}
                  />
                );
              })}
            </Box>
          </BottomSheetDialog>
        </Box>
      </GestureHandlerRootView>
    </Modal>
  );
}

/**
 * Single-select bottom sheet shared by the leaderboard and feed filters (Type,
 * Time frame, Sort by).
 *
 * Mounted only while open — `BottomSheetDialog` auto-opens (and animates in) on
 * mount, so keeping it mounted would leave it permanently open and overlapping
 * the row above it. Unmounting on close mirrors the QuickBuy sheet pattern.
 */
export function FilterOptionSheet<T extends string>({
  isOpen,
  ...innerProps
}: FilterOptionSheetProps<T>) {
  if (!isOpen) {
    return null;
  }

  return <FilterOptionSheetInner {...innerProps} />;
}

export default FilterOptionSheet;
