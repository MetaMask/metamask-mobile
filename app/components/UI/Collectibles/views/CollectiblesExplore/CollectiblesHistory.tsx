import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { usePackPartnerAccount } from '../../providers/pack-partner/hooks/usePackPartnerAccount';
import { useCollectiblesHistory } from '../../hooks/useCollectiblesDiscovery';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import type { IndexedPack } from '../../services/clients/CollectiblesApiClient';
import CardImage from '../../components/CardImage';
import RarityTag from '../../components/RarityTag';
import { indexedCardPreview } from '../../components/CollectiblesDiscovery/IndexedCard';
import { DiscoveryCardDetail } from '../CollectiblesCard/DiscoveryCardDetail';
import { saleReceiptUsd } from '../../components/CollectiblesDiscovery/saleReceipt';
import { formatUsd } from '../../providers/pack-partner/utils/format';
import { ExploreState } from './ExploreState';

const historyDate = (record: IndexedPack, salesOnly: boolean) =>
  (salesOnly ? record.buyback?.occurredAt : undefined) ??
  record.opening?.occurredAt ??
  record.purchase?.occurredAt;

/** Server history includes previously sold cards and survives a device change. */
export default function CollectiblesHistory({
  salesOnly = false,
}: {
  salesOnly?: boolean;
}) {
  const tw = useTailwind();
  const account = usePackPartnerAccount();
  const presentation = useCollectiblesPresentation();
  const history = useCollectiblesHistory(
    account?.address,
    salesOnly ? 'bought_back' : undefined,
  );
  const [selected, setSelected] = useState<IndexedPack>();
  const records = (
    history.data?.pages.flatMap((page) => page.items) ?? []
  ).sort(
    (left, right) =>
      (Date.parse(historyDate(right, salesOnly) ?? '') || 0) -
      (Date.parse(historyDate(left, salesOnly) ?? '') || 0),
  );
  return (
    <>
      <FlashList
        data={records}
        keyExtractor={(item) => item.packId}
        drawDistance={presentation.drawDistance}
        contentContainerStyle={tw.style('px-4 pb-6')}
        testID="collectibles-history-list"
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage)
            return history.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <ExploreState
            loading={history.isLoading}
            error={history.isError}
            onRetry={() => history.refetch()}
            empty="no_history"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            disabled={!item.card}
            onPress={() => item.card && setSelected(item)}
            testID={`collectibles-history-${item.packId}`}
          >
            <Box twClassName="flex-row items-center gap-3 py-3 border-b border-muted">
              <Box twClassName="w-10">
                <CardImage
                  uri={item.card?.thumbnailUrl}
                  accessibilityLabel={item.card?.name ?? item.packName}
                  transparent
                />
              </Box>
              <Box twClassName="flex-1" gap={1}>
                <Box twClassName="flex-row items-center gap-2">
                  <Text
                    variant={TextVariant.BodySm}
                    numberOfLines={1}
                    twClassName="flex-1"
                  >
                    {item.card?.name ?? item.packName}
                  </Text>
                  {item.card?.rarity && <RarityTag rarity={item.card.rarity} />}
                </Box>
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextAlternative}
                >
                  {item.packName}
                </Text>
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextAlternative}
                  testID={`collectibles-history-date-${item.packId}`}
                >
                  {historyDate(item, salesOnly)
                    ? new Date(
                        historyDate(item, salesOnly) ?? '',
                      ).toLocaleString()
                    : strings('collectibles_discovery.pending')}
                  {item.status === 'bought_back'
                    ? ` · ${strings('collectibles.batch.sold')}`
                    : ''}
                </Text>
              </Box>
              {salesOnly && saleReceiptUsd(item) !== null && (
                <Text
                  variant={TextVariant.BodySm}
                  testID={`collectibles-sale-receipt-${item.packId}`}
                >
                  {formatUsd(saleReceiptUsd(item) ?? 0)}
                </Text>
              )}
            </Box>
          </Pressable>
        )}
      />
      {selected?.card && (
        <DiscoveryCardDetail
          card={indexedCardPreview(selected.card)}
          onClose={() => setSelected(undefined)}
          sourcePackType={selected.packType}
          sourcePackName={selected.packName}
          saleReceipt={
            selected.status === 'bought_back'
              ? { amountUsd: saleReceiptUsd(selected) }
              : undefined
          }
        />
      )}
    </>
  );
}
