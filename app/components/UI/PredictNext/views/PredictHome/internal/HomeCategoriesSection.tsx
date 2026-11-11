import React from 'react';
import {
  Box,
  FilterButton,
  FilterButtonSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { PredictHomeTestIds } from '../PredictHome.testIds';

export interface HomeCategoryChip {
  id: string;
  label: string;
}

interface HomeCategoriesSectionProps {
  title: string;
  /** The chips to show, in display order. Renders nothing when empty. */
  categories: readonly HomeCategoryChip[];
  onSelect: (categoryId: string) => void;
}

// The design shows the unselected filter on a muted fill; MMDS draws an
// unselected FilterButton on a transparent one.
const chipBackground = (pressed: boolean) =>
  pressed ? 'bg-muted-pressed' : 'bg-muted';

/**
 * Home's Categories: a header and one unselected filter chip per Category,
 * wrapping onto as many lines as the width needs. The header has no
 * destination yet, so it is not pressable and shows no chevron.
 */
export const HomeCategoriesSection = ({
  title,
  categories,
  onSelect,
}: HomeCategoriesSectionProps) => {
  if (categories.length === 0) {
    return null;
  }

  return (
    <Box testID={PredictHomeTestIds.CATEGORIES} twClassName="gap-3">
      <Text
        variant={TextVariant.HeadingMd}
        testID={PredictHomeTestIds.CATEGORIES_HEADER}
        accessibilityRole="header"
      >
        {title}
      </Text>
      <Box
        testID={PredictHomeTestIds.CATEGORIES_LIST}
        twClassName="flex-row flex-wrap gap-2"
      >
        {categories.map(({ id, label }) => (
          <FilterButton
            key={id}
            testID={PredictHomeTestIds.categoryChip(id)}
            size={FilterButtonSize.Md}
            twClassName={chipBackground}
            onPress={() => onSelect(id)}
          >
            {label}
          </FilterButton>
        ))}
      </Box>
    </Box>
  );
};
