import React from 'react';
import { useWindowDimensions } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { getCardSummaryHeight } from '../../components/CardDisplay/CardSummary';
import { DiscoveryCard } from '../../components/CollectiblesDiscovery/DiscoveryCard';
import type { CollectiblesInventoryCard } from '../../types';

/** Read-only pool item. It must never navigate to an owned card's sell actions. */
export const InventoryCardTile = ({
  card,
  onSelect,
}: {
  card: CollectiblesInventoryCard;
  onSelect?: (card: CollectiblesInventoryCard) => void;
}) => (
  <Box twClassName="w-1/2 px-1.5 pb-3">
    <DiscoveryCard
      card={card}
      onPress={() => onSelect?.(card)}
      testID={`collectibles-inventory-${card.mint}`}
    />
  </Box>
);

export const InventoryFooter = ({
  loading,
  failed,
  empty,
  hasMore,
  onLoad,
}: {
  loading: boolean;
  failed: boolean;
  empty: boolean;
  hasMore: boolean;
  onLoad: () => void;
}) => {
  const { width, fontScale } = useWindowDimensions();
  // Match the two-column grid: 20pt outer insets, 12pt gutter and 8pt
  // internal padding on each tile, with the same image and metadata geometry.
  const tileHeight =
    (Math.max(0, (width - 52) / 2 - 16) * 3) / 2 +
    getCardSummaryHeight(fontScale) +
    16;
  if (!loading && !failed && !empty && !hasMore) return null;
  return (
    <Box
      twClassName="px-5 pb-3 gap-3"
      style={
        loading || empty || failed ? { minHeight: tileHeight + 12 } : undefined
      }
      testID="collectibles-inventory-footer"
    >
      {loading ? (
        <Box
          twClassName="flex-row gap-3"
          testID="collectibles-inventory-loading"
        >
          <Skeleton twClassName="flex-1 rounded-xl" height={tileHeight} />
          <Skeleton twClassName="flex-1 rounded-xl" height={tileHeight} />
        </Box>
      ) : failed ? (
        <>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('collectibles.pack_detail.inventory_error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            onPress={onLoad}
          >
            {strings('collectibles.cards.retry')}
          </Button>
        </>
      ) : empty ? (
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('collectibles.pack_detail.inventory_empty')}
        </Text>
      ) : hasMore ? (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          onPress={onLoad}
          testID="collectibles-inventory-more"
        >
          {strings('collectibles.pack_detail.inventory_more')}
        </Button>
      ) : null}
    </Box>
  );
};
