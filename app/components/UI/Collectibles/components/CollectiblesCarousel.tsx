import React from 'react';
import { FlashList } from '@shopify/flash-list';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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

function renderItem({ item }: { item: HomePack }) {
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

interface Props {
  packs: HomePack[];
}

export function CollectiblesCarousel({ packs }: Props) {
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
