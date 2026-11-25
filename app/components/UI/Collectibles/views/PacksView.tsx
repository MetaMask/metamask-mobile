import React, { useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import {
  ButtonIcon,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { Text } from '../../primitives/Text';
import { collectiblesTestIds } from '../Collectibles.testIds';
import type { ListedPack } from '../types/packs';
import { usePacksCatalog } from '../hooks/usePacksCatalog';
import { PackCategoryChips } from '../components/PackCategoryChips';
import { PacksGridTile } from '../components/PacksGridTile';
import { PacksScreenSkeleton } from '../components/PacksScreenSkeleton';
import { ComingSoonSheet } from '../components/ComingSoonSheet';

function keyExtractor(pack: ListedPack) {
  return pack.code;
}

export function PacksView() {
  const tw = useTailwind();
  const { packs, categories, isPending } = usePacksCatalog();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
  const [comingSoonTitle, setComingSoonTitle] = useState<string>();

  const activeCategoryId = categories.some(
    (category) => category.id === selectedCategoryId,
  )
    ? selectedCategoryId
    : undefined;
  const visiblePacks = activeCategoryId
    ? packs.filter((pack) => pack.categoryId === activeCategoryId)
    : packs;

  function renderItem({ item }: { item: ListedPack }) {
    return (
      <View className="flex-1 px-1.5 pb-6">
        <PacksGridTile
          pack={item}
          onOpenDetail={(pack) => setComingSoonTitle(pack.name)}
          onOpenBuy={(pack) => setComingSoonTitle(pack.name)}
        />
      </View>
    );
  }

  function renderContent() {
    if (isPending) {
      return <PacksScreenSkeleton />;
    }
    if (!packs.length) {
      return (
        <View
          className="items-center gap-2 px-6 py-10"
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
      <>
        <PackCategoryChips
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
              onPress={() =>
                setComingSoonTitle(strings('collectibles.packs.filter'))
              }
              testID={collectiblesTestIds.packsFilterButton}
            />
            <ButtonIcon
              iconName={IconName.SwapVertical}
              accessibilityLabel={strings('collectibles.packs.sort')}
              onPress={() =>
                setComingSoonTitle(strings('collectibles.packs.sort'))
              }
              testID={collectiblesTestIds.packsSortButton}
            />
          </View>
        </View>
        <View className="flex-1">
          <FlashList
            data={visiblePacks}
            numColumns={2}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={tw.style('px-2.5 pb-6 pt-2')}
            testID={collectiblesTestIds.packsGrid}
          />
        </View>
      </>
    );
  }

  return (
    <View className="flex-1" testID={collectiblesTestIds.packsView}>
      {renderContent()}
      {comingSoonTitle && (
        <ComingSoonSheet
          title={comingSoonTitle}
          onClose={() => setComingSoonTitle(undefined)}
        />
      )}
    </View>
  );
}
