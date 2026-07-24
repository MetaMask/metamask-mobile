import {
  BottomSheetDialog,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useMemo } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { strings } from '../../../../../../locales/i18n';
import { playSelection } from '../../../../../util/haptics';
import { useTheme } from '../../../../../util/theme';
import type { SocialTypeFilter } from './types';
import {
  TypeFilterSelectorsIDs,
  getTypeFilterOptionTestId,
} from './TypeFilter.testIds';
import {
  TYPE_FILTER_LABEL_KEY,
  TYPE_FILTER_OPTIONS,
} from './typeFilterOptions';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export interface TypeFilterSheetProps {
  isOpen: boolean;
  value: SocialTypeFilter;
  onChange: (value: SocialTypeFilter) => void;
  onClose: () => void;
  sheetTestID?: string;
  backdropTestID?: string;
  getOptionTestID?: (value: SocialTypeFilter) => string;
}

interface TypeFilterSheetInnerProps {
  value: SocialTypeFilter;
  onChange: (value: SocialTypeFilter) => void;
  onClose: () => void;
  sheetTestID: string;
  backdropTestID: string;
  getOptionTestID: (value: SocialTypeFilter) => string;
}

const TypeFilterSheetInner: React.FC<TypeFilterSheetInnerProps> = ({
  value,
  onChange,
  onClose,
  sheetTestID,
  backdropTestID,
  getOptionTestID,
}) => {
  const { colors } = useTheme();

  const handleSelect = useCallback(
    (next: SocialTypeFilter) => {
      if (next !== value) {
        playSelection().catch(() => undefined);
        onChange(next);
      }
      onClose();
    },
    [onChange, onClose, value],
  );

  const options = useMemo(
    () =>
      TYPE_FILTER_OPTIONS.map((option) => ({
        key: option,
        label: strings(TYPE_FILTER_LABEL_KEY[option]),
      })),
    [],
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
            <Box twClassName="px-4 pt-2 pb-4">
              {options.map((option) => {
                const isSelected = option.key === value;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => handleSelect(option.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    testID={getOptionTestID(option.key)}
                  >
                    <Box
                      flexDirection={BoxFlexDirection.Row}
                      alignItems={BoxAlignItems.Center}
                      justifyContent={BoxJustifyContent.Between}
                      twClassName="py-3"
                    >
                      <Text
                        variant={TextVariant.BodyMd}
                        fontWeight={
                          isSelected ? FontWeight.Medium : FontWeight.Regular
                        }
                        color={TextColor.TextDefault}
                      >
                        {option.label}
                      </Text>
                      {isSelected ? (
                        <Icon
                          name={IconName.Check}
                          size={IconSize.Md}
                          color={IconColor.PrimaryDefault}
                        />
                      ) : null}
                    </Box>
                  </Pressable>
                );
              })}
            </Box>
          </BottomSheetDialog>
        </Box>
      </GestureHandlerRootView>
    </Modal>
  );
};

/**
 * Bottom sheet with the position-type options (All types / Tokens / Perps).
 *
 * Mounted only while open — `BottomSheetDialog` auto-opens (and animates in) on
 * mount, so keeping it mounted would leave it permanently open and overlapping
 * the row above it. Unmounting on close mirrors the QuickBuy sheet pattern.
 *
 * Shared by `TopTradersView` and `FeedView`; testIDs are parametrized so each
 * surface can keep its own selectors while reusing the same UI.
 */
const TypeFilterSheet: React.FC<TypeFilterSheetProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
  sheetTestID = TypeFilterSelectorsIDs.SHEET,
  backdropTestID = TypeFilterSelectorsIDs.BACKDROP,
  getOptionTestID = getTypeFilterOptionTestId,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <TypeFilterSheetInner
      value={value}
      onChange={onChange}
      onClose={onClose}
      sheetTestID={sheetTestID}
      backdropTestID={backdropTestID}
      getOptionTestID={getOptionTestID}
    />
  );
};

export default TypeFilterSheet;
