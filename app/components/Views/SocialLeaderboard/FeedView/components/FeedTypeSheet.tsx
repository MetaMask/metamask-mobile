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
import { Pressable, StyleSheet } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { playSelection } from '../../../../../util/haptics';
import { useTheme } from '../../../../../util/theme';
import type { FeedTypeFilter } from '../types';
import {
  FeedViewSelectorsIDs,
  getFeedTypeOptionTestId,
} from '../FeedView.testIds';
import { FEED_TYPE_LABEL_KEY, FEED_TYPE_OPTIONS } from './feedTypeOptions';

export interface FeedTypeSheetProps {
  isOpen: boolean;
  value: FeedTypeFilter;
  onChange: (value: FeedTypeFilter) => void;
  onClose: () => void;
}

interface FeedTypeSheetInnerProps {
  value: FeedTypeFilter;
  onChange: (value: FeedTypeFilter) => void;
  onClose: () => void;
}

const FeedTypeSheetInner: React.FC<FeedTypeSheetInnerProps> = ({
  value,
  onChange,
  onClose,
}) => {
  const { colors } = useTheme();

  const handleSelect = useCallback(
    (next: FeedTypeFilter) => {
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
      FEED_TYPE_OPTIONS.map((option) => ({
        key: option,
        label: strings(FEED_TYPE_LABEL_KEY[option]),
      })),
    [],
  );

  return (
    <Box twClassName="absolute inset-0">
      <Pressable
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.overlay.default },
        ]}
        onPress={onClose}
        accessibilityRole="button"
        testID={FeedViewSelectorsIDs.TYPE_SELECTOR_BACKDROP}
      />

      <BottomSheetDialog
        onClose={onClose}
        testID={FeedViewSelectorsIDs.TYPE_SELECTOR_SHEET}
      >
        <Box twClassName="px-4 pt-2 pb-4">
          {options.map((option) => {
            const isSelected = option.key === value;
            return (
              <Pressable
                key={option.key}
                onPress={() => handleSelect(option.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                testID={getFeedTypeOptionTestId(option.key)}
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
  );
};

/**
 * Bottom sheet with the feed type options (All Types / Spot tokens / Perps).
 *
 * Mounted only while open — `BottomSheetDialog` auto-opens (and animates in) on
 * mount, so keeping it mounted would leave it permanently open and overlapping
 * the row above it. Unmounting on close mirrors the QuickBuy sheet pattern.
 */
const FeedTypeSheet: React.FC<FeedTypeSheetProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <FeedTypeSheetInner value={value} onChange={onChange} onClose={onClose} />
  );
};

export default FeedTypeSheet;
