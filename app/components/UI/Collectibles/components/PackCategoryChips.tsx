import React from 'react';
import { FlashList } from '@shopify/flash-list';
import { FilterButton, IconName } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import type { PackCategory } from '../types/packs';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { Image } from '../../primitives/Image';
import { View } from '../../primitives/View';

const allChipId = 'all';

function keyExtractor(category: PackCategory) {
  return category.id;
}

function ChipGap() {
  return <View className="w-2" />;
}

interface Props {
  categories: PackCategory[];
  selectedId?: string;
  onSelect: (id?: string) => void;
}

export function PackCategoryChips({ categories, selectedId, onSelect }: Props) {
  const tw = useTailwind();

  function renderItem({ item }: { item: PackCategory }) {
    const isActive = item.id === selectedId;
    return (
      <FilterButton
        isSelected={isActive}
        accessibilityState={{ selected: isActive }}
        startIconName={item.iconUrl ? undefined : IconName.Category}
        startAccessory={
          item.iconUrl && (
            <Image
              source={{ uri: item.iconUrl }}
              className="size-4 rounded-full"
            />
          )
        }
        onPress={() => onSelect(item.id)}
        testID={collectiblesTestIds.packsCategoryChip(item.id)}
      >
        {item.name}
      </FilterButton>
    );
  }

  return (
    <FlashList
      horizontal
      data={categories}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      extraData={selectedId}
      ItemSeparatorComponent={ChipGap}
      ListHeaderComponent={
        <View className="flex-row">
          <FilterButton
            isSelected={!selectedId}
            accessibilityState={{ selected: !selectedId }}
            onPress={() => onSelect(undefined)}
            testID={collectiblesTestIds.packsCategoryChip(allChipId)}
          >
            {strings('collectibles.packs.all')}
          </FilterButton>
          {categories.length > 0 && <ChipGap />}
        </View>
      }
      accessibilityLabel={strings('collectibles.packs.categories')}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('px-4')}
    />
  );
}
