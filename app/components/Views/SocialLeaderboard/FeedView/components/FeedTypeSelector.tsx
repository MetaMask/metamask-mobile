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
  type BottomSheetDialogRef,
} from '@metamask/design-system-react-native';
import React, { useCallback, useMemo, useRef } from 'react';
import { Pressable, TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { playSelection } from '../../../../../util/haptics';
import type { FeedTypeFilter } from '../types';
import {
  FeedViewSelectorsIDs,
  getFeedTypeOptionTestId,
} from '../FeedView.testIds';

const OPTIONS: FeedTypeFilter[] = ['all', 'tokens', 'perps'];

const LABEL_KEY: Record<FeedTypeFilter, string> = {
  all: 'social_leaderboard.feed.type_filter.all',
  tokens: 'social_leaderboard.feed.type_filter.tokens',
  perps: 'social_leaderboard.feed.type_filter.perps',
};

export interface FeedTypeSelectorProps {
  value: FeedTypeFilter;
  onChange: (value: FeedTypeFilter) => void;
  testID?: string;
}

/**
 * "All types" pill that opens a bottom sheet of type options (All Types / Spot
 * (tokens) / Perps) with a checkmark on the selected one. Fires a selection
 * haptic on change. Visual-only for now — it does not filter the feed list.
 */
const FeedTypeSelector: React.FC<FeedTypeSelectorProps> = ({
  value,
  onChange,
  testID = FeedViewSelectorsIDs.TYPE_SELECTOR,
}) => {
  const sheetRef = useRef<BottomSheetDialogRef>(null);

  const openSheet = useCallback(() => {
    sheetRef.current?.onOpenDialog();
  }, []);

  const handleSelect = useCallback(
    (next: FeedTypeFilter) => {
      if (next !== value) {
        playSelection().catch(() => undefined);
        onChange(next);
      }
      sheetRef.current?.onCloseDialog();
    },
    [onChange, value],
  );

  const options = useMemo(
    () =>
      OPTIONS.map((option) => ({
        key: option,
        label: strings(LABEL_KEY[option]),
      })),
    [],
  );

  return (
    <>
      <TouchableOpacity
        onPress={openSheet}
        accessibilityRole="button"
        testID={testID}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
          twClassName="border border-muted rounded-xl px-3 py-2"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {strings(LABEL_KEY[value])}
          </Text>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Sm}
            color={IconColor.IconDefault}
          />
        </Box>
      </TouchableOpacity>

      <BottomSheetDialog
        ref={sheetRef}
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
    </>
  );
};

export default FeedTypeSelector;
