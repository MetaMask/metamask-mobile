import React from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import {
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
import type { HomePack } from '../types/packs';
import { PackTile, packTileWidth } from './PackTile';
import { PackTileSkeleton } from './PackTileSkeleton';
import { collectiblesTestIds } from '../Collectibles.testIds';

// Keep in sync with the `w-4` separator below.
const tileGap = 16;
const skeletonKeys = ['s1', 's2', 's3'];

function keyExtractor(pack: HomePack) {
  return pack.code;
}

function renderPackTile({ item }: { item: HomePack }) {
  return <PackTile pack={item} />;
}

function TileGap() {
  return <View className="w-4" />;
}

export function CollectiblesCarouselSkeleton() {
  return (
    <View
      className="flex-row gap-4 overflow-hidden px-4 pt-2"
      testID={collectiblesTestIds.skeleton}
    >
      {skeletonKeys.map((key) => (
        <PackTileSkeleton key={key} />
      ))}
    </View>
  );
}

export function CollectiblesCarouselEmpty() {
  return (
    <View
      className="items-center gap-2 px-6 py-10"
      testID={collectiblesTestIds.empty}
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
        {strings('collectibles.home.empty')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        className="text-center"
      >
        {strings('collectibles.home.empty_description')}
      </Text>
    </View>
  );
}

interface Props<T extends HomePack> {
  packs: T[];
  renderItem?: ListRenderItem<T>;
}

export function CollectiblesCarousel<T extends HomePack>({
  packs,
  renderItem = renderPackTile,
}: Props<T>) {
  const tw = useTailwind();
  return (
    <FlashList
      horizontal
      data={packs}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={TileGap}
      snapToInterval={packTileWidth + tileGap}
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('px-4 pt-2')}
      testID={collectiblesTestIds.carousel}
    />
  );
}
