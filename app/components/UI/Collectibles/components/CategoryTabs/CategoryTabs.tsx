import React from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  FilterButton,
  FilterButtonSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import CategoryIcon from './CategoryIcon';

export interface CategoryTabsProps {
  categories: string[];
  /** An empty value selects every category. */
  value: string;
  onChange: (category: string) => void;
  testID?: string;
  getItemTestID?: (category: string) => string;
}

/** Illustrated category tabs shared by the pack catalogue and collection. */
const CategoryTabs = ({
  categories,
  value,
  onChange,
  testID,
  getItemTestID,
}: CategoryTabsProps) => {
  const tw = useTailwind();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={tw.style('grow-0 shrink-0 border-b border-muted')}
      contentContainerStyle={tw.style('gap-1')}
      testID={testID}
    >
      {['', ...categories.filter(Boolean)].map((category) => {
        const isSelected = value === category;
        const label = category || strings('collectibles.packs.all_collections');
        return (
          <FilterButton
            key={category}
            value={category}
            size={FilterButtonSize.Sm}
            isSelected={isSelected}
            onPress={() => onChange(category)}
            accessibilityLabel={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            testID={getItemTestID?.(category)}
            twClassName={`h-auto min-h-[72px] min-w-11 shrink-0 rounded-t-lg rounded-b-none px-2 py-2 ${isSelected ? 'bg-success-default/5' : 'bg-transparent'}`}
          >
            <Box twClassName="items-center gap-2">
              <CategoryIcon category={category} />
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Medium}
                color={
                  isSelected ? TextColor.TextDefault : TextColor.TextAlternative
                }
                twClassName="text-center"
                numberOfLines={1}
              >
                {label}
              </Text>
              {isSelected && (
                <Box twClassName="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-success-default" />
              )}
            </Box>
          </FilterButton>
        );
      })}
    </ScrollView>
  );
};

export default CategoryTabs;
