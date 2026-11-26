import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  FontWeight,
  Icon,
  IconColor,
  type IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PredictHomeTestIds } from '../PredictHome.testIds';
import { getHomeCategoryIcon } from './homeCategories';

export interface HomeCategoryChip {
  id: string;
  label: string;
  iconName?: IconName;
}

interface HomeCategoriesSectionProps {
  /** The chips to show, in display order. Renders nothing when empty. */
  categories: readonly HomeCategoryChip[];
  onSelect: (categoryId: string) => void;
}

/**
 * Home's Categories: one pill chip per Category with a leading icon and label,
 * wrapping onto as many lines as the width needs.
 */
export const HomeCategoriesSection = ({
  categories,
  onSelect,
}: HomeCategoriesSectionProps) => {
  const tw = useTailwind();

  if (categories.length === 0) {
    return null;
  }

  return (
    <Box testID={PredictHomeTestIds.CATEGORIES}>
      <Box
        testID={PredictHomeTestIds.CATEGORIES_LIST}
        twClassName="flex-row flex-wrap gap-2"
      >
        {categories.map(({ id, label, iconName }) => (
          <Pressable
            key={id}
            testID={PredictHomeTestIds.categoryChip(id)}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => onSelect(id)}
            style={({ pressed }) =>
              tw.style(
                'min-h-[40px] flex-row items-center gap-1.5 rounded-full border border-muted px-3 py-2',
                pressed ? 'bg-muted-pressed' : 'bg-elevated1',
              )
            }
          >
            <Icon
              name={iconName ?? getHomeCategoryIcon(id)}
              size={IconSize.Sm}
              color={IconColor.IconDefault}
              testID={PredictHomeTestIds.categoryChipIcon(id)}
            />
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Regular}
              color={TextColor.TextDefault}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </Box>
    </Box>
  );
};
