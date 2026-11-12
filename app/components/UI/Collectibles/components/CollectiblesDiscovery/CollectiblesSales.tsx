import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextVariant,
  TextColor,
  Skeleton,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useCollectiblesHistory } from '../../hooks/useCollectiblesDiscovery';
import { DiscoveryCard } from './DiscoveryCard';
import { DiscoveryCardDetail } from '../../views/CollectiblesCard/DiscoveryCardDetail';
import type { IndexedPack } from '../../services/clients/CollectiblesApiClient';
import { indexedCardPreview } from './IndexedCard';
import { saleReceiptUsd } from './saleReceipt';

/** Bounded sales preview. Full history lives in a cursor-paginated reusable list. */
export default function CollectiblesSales({
  address,
  onHistory,
}: {
  address?: string;
  onHistory: () => void;
}) {
  const history = useCollectiblesHistory(address, 'bought_back');
  const [selected, setSelected] = useState<IndexedPack>();
  const sales = history.data?.pages[0]?.items.slice(0, 4) ?? [];
  return (
    <Box paddingTop={6} gap={3}>
      <SectionHeader
        title={strings('collectibles_discovery.sales')}
        titleProps={{ variant: TextVariant.HeadingSm }}
        twClassName="border-t border-muted pt-4 px-0 pb-0"
        endAccessory={
          <Button variant={ButtonVariant.Tertiary} onPress={onHistory}>
            {strings('collectibles_discovery.view_all')}
          </Button>
        }
      />
      {history.isLoading ? (
        <Skeleton height={100} width="100%" />
      ) : history.isError ? (
        <Button
          variant={ButtonVariant.Secondary}
          onPress={() => history.refetch()}
        >
          {strings('collectibles_discovery.retry')}
        </Button>
      ) : (
        !sales.length && (
          <Text color={TextColor.TextAlternative}>
            {strings('collectibles_discovery.no_sales')}
          </Text>
        )
      )}
      <Box twClassName="flex-row flex-wrap -mx-1.5">
        {sales.map(
          (sale) =>
            sale.card && (
              <Box key={sale.packId} twClassName="w-1/2 px-1.5 pb-3">
                <DiscoveryCard
                  card={indexedCardPreview(sale.card)}
                  onPress={() => setSelected(sale)}
                  soldLabel={strings('collectibles_discovery.sold')}
                  displayValue={saleReceiptUsd(sale)}
                />
              </Box>
            ),
        )}
      </Box>
      {selected?.card && (
        <DiscoveryCardDetail
          card={indexedCardPreview(selected.card)}
          onClose={() => setSelected(undefined)}
          sourcePackType={selected.packType}
          sourcePackName={selected.packName}
          saleReceipt={{ amountUsd: saleReceiptUsd(selected) }}
        />
      )}
    </Box>
  );
}
