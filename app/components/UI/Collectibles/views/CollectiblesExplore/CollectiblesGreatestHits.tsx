import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { useIsFocused } from '@react-navigation/native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { usePackPartnerGreatestHits } from '../../providers/pack-partner/hooks/usePackPartnerGreatestHits';
import { useCardsLastOpened } from '../../hooks/useCollectiblesDiscovery';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import type { CollectiblesInventoryCard } from '../../types';
import { DiscoveryCard } from '../../components/CollectiblesDiscovery/DiscoveryCard';
import { DiscoveryCardDetail } from '../CollectiblesCard/DiscoveryCardDetail';
import { ExploreState } from './ExploreState';
import type { LastOpened } from '../../services/clients/CollectiblesApiClient';

const lastOpeningCaption = (last: LastOpened | null | undefined) => {
  if (!last) return undefined;
  const address = last.recipient?.address;
  return [
    `${strings('collectibles_discovery.last_opened')} ${new Date(last.openedAt).toLocaleDateString()}`,
    address ? `${address.slice(0, 6)}…${address.slice(-4)}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
};

/** Highest insured-value cards come from PackPartner; last-opening enrichment is optional. */
export default function CollectiblesGreatestHits() {
  const tw = useTailwind();
  const presentation = useCollectiblesPresentation();
  const focused = useIsFocused();
  const result = usePackPartnerGreatestHits(focused && presentation.online);
  const lastOpened = useCardsLastOpened(
    result.data?.map((card) => card.mint) ?? [],
  );
  const [selected, setSelected] = useState<CollectiblesInventoryCard>();
  return (
    <>
      <FlashList
        data={result.data ?? []}
        numColumns={2}
        keyExtractor={(card) => card.mint}
        drawDistance={presentation.drawDistance}
        contentContainerStyle={tw.style('px-2.5 pb-6')}
        testID="collectibles-greatest-hits-list"
        ListHeaderComponent={
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="px-1.5 pb-4"
          >
            {strings('collectibles_discovery.highest_value')}
          </Text>
        }
        ListEmptyComponent={
          <ExploreState
            loading={result.isPending}
            error={result.isError}
            onRetry={() => result.refetch()}
          />
        }
        renderItem={({ item }) => {
          const last = lastOpened.data?.[item.mint];
          return (
            <Box twClassName="w-full px-1.5 pb-3">
              <DiscoveryCard
                card={item}
                reserveCaption
                onPress={setSelected}
                caption={lastOpeningCaption(last)}
              />
            </Box>
          );
        }}
      />
      {selected && (
        <DiscoveryCardDetail
          card={selected}
          caption={lastOpeningCaption(lastOpened.data?.[selected.mint])}
          onClose={() => setSelected(undefined)}
        />
      )}
    </>
  );
}
