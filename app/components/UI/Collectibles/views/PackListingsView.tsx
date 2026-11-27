import React, { useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import {
  ButtonIcon,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { collectiblesTestIds } from '../Collectibles.testIds';
import type { ListedPack } from '../types/packs';
import { usePacksCatalog } from '../hooks/usePacksCatalog';
import { useAnnounce } from '../hooks/useAnnounce';
import { PackCategoryFilter } from '../components/PackCategoryFilter';
import { PackListingTile } from '../components/PackListingTile';
import { PackListingsSkeleton } from '../components/PackListingsSkeleton';

const keyExtractor = (pack: ListedPack) => pack.code;

export function PackListingsView() {
  const tw = useTailwind();
  const { packs, categories, isPending } = usePacksCatalog();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();

  const activeCategoryId = categories.some(
    (category) => category.id === selectedCategoryId,
  )
    ? selectedCategoryId
    : undefined;

  const visiblePacks = activeCategoryId
    ? packs.filter((pack) => pack.categoryId === activeCategoryId)
    : packs;

  const isEmpty = !isPending && !packs.length;

  useAnnounce(isEmpty, strings('collectibles.packs.empty'));

  const renderItem = ({ item }: { item: ListedPack }) => (
    <View className="flex-1 px-2 pb-6">
      <PackListingTile pack={item} />
    </View>
  );

  if (isPending) {
    return <PackListingsSkeleton />;
  }

  if (isEmpty) {
    return (
      <View
        className="flex-1 items-center gap-2 px-6 py-10"
        testID={collectiblesTestIds.packsEmpty}
      >
        <Icon
          name={IconName.Info}
          size={IconSize.Xl}
          color={IconColor.IconAlternative}
        />
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          className="text-center"
        >
          {strings('collectibles.packs.empty')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 pt-2" testID={collectiblesTestIds.packsView}>
      <PackCategoryFilter
        categories={categories}
        selectedId={activeCategoryId}
        onSelect={setSelectedCategoryId}
      />

      <View className="flex-row items-center justify-between pl-4 pr-2 pt-2">
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          testID={collectiblesTestIds.packsFilterSortLine}
        >
          {strings('collectibles.packs.filter_sort', {
            filter: strings('collectibles.packs.all_prices'),
            sort: strings('collectibles.packs.lowest_price'),
          })}
        </Text>
        <View className="flex-row">
          <ButtonIcon
            iconName={IconName.Filter}
            accessibilityLabel={strings('collectibles.packs.filter')}
            testID={collectiblesTestIds.packsFilterButton}
          />
          <ButtonIcon
            iconName={IconName.SwapVertical}
            accessibilityLabel={strings('collectibles.packs.sort')}
            testID={collectiblesTestIds.packsSortButton}
          />
        </View>
      </View>

      <FlashList
        data={visiblePacks}
        numColumns={2}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={tw.style('px-2 pb-6 pt-2')}
        testID={collectiblesTestIds.packsGrid}
      />
    </View>
  );
}
