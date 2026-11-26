import React, { useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import {
  ButtonIcon,
  FontWeight,
  IconName,
  TabEmptyState,
  Text,
  TextColor,
  TextFieldSearch,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { useFormatters } from '../../../hooks/useFormatters';
import { collectiblesTestIds } from '../Collectibles.testIds';
import type { CollectiblesTab } from '../routeNames';
import type { PackPartnerCard } from '../providers/pack-partner/types/packPartner';
import { useCollectionCards } from '../hooks/useCollectionCards';
import { useNow } from '../hooks/useNow';
import {
  getBuybackLabel,
  getCollectionValue,
  searchCardsByName,
  sortNewestFirst,
} from '../utils/collection';
import { CollectionCardTile } from '../components/CollectionCardTile';
import { CollectionSkeleton } from '../components/CollectionSkeleton';
import { View } from '../../primitives/View';

interface Props {
  jumpTo?: (tab: CollectiblesTab) => void;
}

const minuteMs = 60 * 1000;

const keyExtractor = (card: PackPartnerCard) => card.mint;

export function CollectionView({ jumpTo }: Props) {
  const tw = useTailwind();
  const { formatCurrency } = useFormatters();
  const { data: cards, isPending, isError } = useCollectionCards();
  const now = useNow(minuteMs);

  const [query, setQuery] = useState('');

  const visibleCards = searchCardsByName(sortNewestFirst(cards ?? []), query);
  const value = isError
    ? strings('collectibles.collection.no_value')
    : formatCurrency(getCollectionValue(cards ?? []), 'USD');

  const renderItem = ({ item }: { item: PackPartnerCard }) => (
    <View className="flex-1 px-2 pb-6">
      <CollectionCardTile
        card={item}
        buybackLabel={getBuybackLabel(item, now)}
      />
    </View>
  );

  if (isPending) {
    return <CollectionSkeleton />;
  }

  return (
    <View className="flex-1 pt-4" testID={collectiblesTestIds.collectionView}>
      <View className="gap-1 px-4">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('collectibles.collection.value_label')}
        </Text>
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          testID={collectiblesTestIds.collectionValue}
        >
          {value}
        </Text>
      </View>

      <View className="px-4 pt-4">
        <TextFieldSearch
          value={query}
          onChangeText={setQuery}
          placeholder={strings('collectibles.collection.search')}
          inputAccessibilityLabel={strings('collectibles.collection.search')}
          onPressClearButton={() => setQuery('')}
          inputProps={{ testID: collectiblesTestIds.collectionSearch }}
        />
      </View>

      <View className="flex-row items-center justify-between pl-4 pr-2 pt-2">
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          testID={collectiblesTestIds.collectionFilterSortLine}
        >
          {strings('collectibles.packs.filter_sort', {
            filter: strings('collectibles.packs.all_prices'),
            sort: strings('collectibles.collection.newest'),
          })}
        </Text>
        <View className="flex-row">
          <ButtonIcon
            iconName={IconName.Filter}
            accessibilityLabel={strings('collectibles.collection.filter')}
            testID={collectiblesTestIds.collectionFilterButton}
          />
          <ButtonIcon
            iconName={IconName.SwapVertical}
            accessibilityLabel={strings('collectibles.collection.sort')}
            testID={collectiblesTestIds.collectionSortButton}
          />
        </View>
      </View>

      {isError ? (
        <TabEmptyState
          description={strings('collectibles.collection.error')}
          twClassName="px-6 py-10"
          testID={collectiblesTestIds.collectionError}
        />
      ) : !cards?.length ? (
        <TabEmptyState
          description={strings('collectibles.collection.empty')}
          actionButtonText={strings('collectibles.collection.browse_packs')}
          onAction={() => jumpTo?.('packs')}
          twClassName="px-6 py-10"
          testID={collectiblesTestIds.collectionEmpty}
        />
      ) : visibleCards.length ? (
        <FlashList
          data={visibleCards}
          numColumns={2}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          extraData={now}
          contentContainerStyle={tw.style('px-2 pb-6 pt-2')}
          testID={collectiblesTestIds.collectionGrid}
        />
      ) : (
        <TabEmptyState
          description={strings('collectibles.collection.no_results')}
          twClassName="px-6 py-10"
          testID={collectiblesTestIds.collectionNoResults}
        />
      )}
    </View>
  );
}
