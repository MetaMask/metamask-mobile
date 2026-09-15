import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import type { SocialShellSubnavId, SocialShellSubnavItem } from './types';

export const SUBNAV_PILLS_TEST_ID = 'social-shell-subnav';

export const getSubnavPillTestId = (id: SocialShellSubnavId) =>
  `${SUBNAV_PILLS_TEST_ID}-${id}`;

interface SubnavPillsProps<TId extends SocialShellSubnavId> {
  items: readonly SocialShellSubnavItem<TId>[];
  value: TId;
  onChange: (value: TId) => void;
  /** Control pinned to the right of the pills, outside the scrollable area. */
  endAccessory?: React.ReactNode;
}

/**
 * Horizontally scrollable sub-navigation shared by the Social Bundle V1 tabs.
 */
const SubnavPills = <TId extends SocialShellSubnavId>({
  items,
  value,
  onChange,
  endAccessory,
}: SubnavPillsProps<TId>) => {
  const tw = useTailwind();
  const handleChange = useCallback(
    (nextValue: string) => onChange(nextValue as TId),
    [onChange],
  );

  return (
    <Box flexDirection={BoxFlexDirection.Row} alignItems={BoxAlignItems.Center}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('items-center px-4 py-3')}
        testID={SUBNAV_PILLS_TEST_ID}
      >
        <FilterButtonGroup
          value={value}
          onChange={handleChange}
          variant={FilterButtonVariant.Primary}
          twClassName="gap-2"
        >
          {items.map(({ id, labelKey, leadingEmoji }) => (
            <FilterButton
              key={id}
              value={id}
              size={FilterButtonSize.Md}
              testID={getSubnavPillTestId(id)}
            >
              {leadingEmoji
                ? `${leadingEmoji} ${strings(labelKey)}`
                : strings(labelKey)}
            </FilterButton>
          ))}
        </FilterButtonGroup>
      </ScrollView>
      {endAccessory ? <Box twClassName="pr-4">{endAccessory}</Box> : null}
    </Box>
  );
};

export default SubnavPills;
