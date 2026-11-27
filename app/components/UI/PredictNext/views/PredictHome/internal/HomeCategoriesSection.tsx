import React from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  Box,
  FontWeight,
  Icon,
  IconColor,
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
  /** The Feed Screen's catalog icon name, unchecked against the app's
   * icons. */
  icon?: string;
}

interface HomeCategoriesSectionProps {
  /** The chips to show, in display order. Renders nothing when empty. */
  categories: readonly HomeCategoryChip[];
  onSelect: (categoryId: string) => void;
}

/**
 * Splits the chips into two rows, the first taking half rounded up. A single
 * chip leaves the second row empty.
 */
export const splitHomeCategoryRows = <Chip,>(
  categories: readonly Chip[],
): [Chip[], Chip[]] => {
  const firstRowLength = Math.ceil(categories.length / 2);
  return [
    categories.slice(0, firstRowLength),
    categories.slice(firstRowLength),
  ];
};

/**
 * Home's Categories: one pill chip per Category with a leading icon and label,
 * in two rows that scroll horizontally together. The section spans the screen
 * edge to edge, so the rows start 16pt in and run off the right edge.
 */
export const HomeCategoriesSection = ({
  categories,
  onSelect,
}: HomeCategoriesSectionProps) => {
  const tw = useTailwind();

  if (categories.length === 0) {
    return null;
  }

  const rows = splitHomeCategoryRows(categories).filter(
    (row) => row.length > 0,
  );

  return (
    <Box testID={PredictHomeTestIds.CATEGORIES} twClassName="-mx-4">
      <ScrollView
        testID={PredictHomeTestIds.CATEGORIES_LIST}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('flex-col gap-2 px-4')}
      >
        {rows.map((row, rowIndex) => (
          <Box
            key={rowIndex}
            testID={PredictHomeTestIds.categoryRow(rowIndex)}
            twClassName="flex-row gap-2"
          >
            {row.map(({ id, label, icon }) => (
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
                  name={getHomeCategoryIcon(id, icon)}
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
        ))}
      </ScrollView>
    </Box>
  );
};
