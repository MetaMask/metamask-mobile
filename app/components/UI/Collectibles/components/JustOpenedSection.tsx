import React from 'react';
import { FlashList } from '@shopify/flash-list';
import { SectionHeader } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '../Collectibles.testIds';
import type { PackPartnerCard } from '../providers/pack-partner/types/packPartner';
import { usePackJustOpened } from '../hooks/usePackJustOpened';
import { View } from '../../primitives/View';
import { CardListItem, CardListItemSkeleton } from './CardListItem';
import { SectionMessage } from './SectionMessage';

const skeletonKeys = ['s1', 's2', 's3'];

const keyExtractor = (card: PackPartnerCard) => card.mint;
const renderItem = ({ item }: { item: PackPartnerCard }) => (
  <CardListItem card={item} className="w-36" />
);

function CardGap() {
  return <View className="w-4" />;
}

interface Props {
  packCode: string;
}

export function JustOpenedSection({ packCode }: Props) {
  const tw = useTailwind();

  const {
    data: cards,
    isPending,
    isError,
    refetch,
  } = usePackJustOpened(packCode);

  function retry() {
    void refetch();
  }

  return (
    <View testID={collectiblesTestIds.packDetailJustOpened}>
      <SectionHeader
        title={strings('collectibles.pack_detail.just_opened')}
        className="px-2"
      />
      {cards?.length ? (
        <FlashList
          horizontal
          data={cards}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={CardGap}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw.style('px-2')}
        />
      ) : isPending ? (
        <View
          className="flex-row gap-4 overflow-hidden px-2"
          testID={collectiblesTestIds.packDetailJustOpenedSkeleton}
        >
          {skeletonKeys.map((key) => (
            <CardListItemSkeleton key={key} className="w-36" />
          ))}
        </View>
      ) : (
        <SectionMessage
          message={strings(
            isError
              ? 'collectibles.pack_detail.cards_error'
              : 'collectibles.pack_detail.no_cards',
          )}
          onRetry={isError ? retry : undefined}
        />
      )}
    </View>
  );
}
