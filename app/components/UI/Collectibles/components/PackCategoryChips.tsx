import React from 'react';
import {
  FilterButton,
  FilterButtonGroup,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { PackCategory } from '../types/packs';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { Image } from '../../primitives/Image';

const allChipId = 'all';

interface Props {
  categories: PackCategory[];
  selectedId?: string;
  onSelect: (id?: string) => void;
}

export function PackCategoryChips({ categories, selectedId, onSelect }: Props) {
  const activeId = selectedId ?? allChipId;

  return (
    <FilterButtonGroup
      value={activeId}
      onChange={(value) => onSelect(value === allChipId ? undefined : value)}
      twClassName="gap-2 px-4"
      accessibilityLabel={strings('collectibles.packs.categories')}
    >
      <FilterButton
        value={allChipId}
        accessibilityState={{ selected: activeId === allChipId }}
        testID={collectiblesTestIds.packsCategoryChip(allChipId)}
      >
        {strings('collectibles.packs.all')}
      </FilterButton>

      {categories.map((category) => (
        <FilterButton
          key={category.id}
          value={category.id}
          accessibilityState={{ selected: activeId === category.id }}
          startIconName={category.iconUrl ? undefined : IconName.Category}
          startAccessory={
            category.iconUrl && (
              <Image
                source={{ uri: category.iconUrl }}
                className="size-4 rounded-full"
              />
            )
          }
          testID={collectiblesTestIds.packsCategoryChip(category.id)}
        >
          {category.name}
        </FilterButton>
      ))}
    </FilterButtonGroup>
  );
}
