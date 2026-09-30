import React, { useCallback, useState } from 'react';
import { FlatList, Image, RefreshControl } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Skeleton,
  TabEmptyState,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useAssetFromTheme } from '../../../../../util/theme';
import emptyStateNftsLight from '../../../../../images/empty-state-nfts-light.png';
import emptyStateNftsDark from '../../../../../images/empty-state-nfts-dark.png';
import { GachaCardsTestIds } from '../../Gacha.testIds';
import CardTile from '../../components/CardTile';
import { CARD_ASPECT_RATIO } from '../../components/CardImage';
import ErrorPanel from '../../components/ErrorPanel';
import type { UseCollectorCryptCardsResult } from '../../providers/collector-crypt/hooks/useCollectorCryptCards';
import type { CollectorCryptCard } from '../../providers/collector-crypt/types';
import { getCollectorCryptErrorMessage } from '../../providers/collector-crypt/utils/errorMessages';

const COLUMNS = 2;
const SKELETON_ROWS = [0, 1];
const SKELETON_STYLE = { aspectRatio: CARD_ASPECT_RATIO };

/** First-load placeholder: two rows of card tiles. */
const CardsSkeleton = () => (
  <Box twClassName="px-4 pt-2" gap={4} testID={GachaCardsTestIds.SKELETON}>
    {SKELETON_ROWS.map((row) => (
      <Box key={row} flexDirection={BoxFlexDirection.Row} gap={3}>
        {[0, 1].map((column) => (
          <Box key={column} twClassName="flex-1" gap={2}>
            <Skeleton twClassName="w-full rounded-xl" style={SKELETON_STYLE} />
            <Skeleton height={16} width="80%" />
            <Skeleton height={14} width="50%" />
          </Box>
        ))}
      </Box>
    ))}
  </Box>
);

/** Empty state with the NFT illustration and an "Open a pack" CTA. */
const CardsEmptyState = ({ onOpenPack }: { onOpenPack: () => void }) => {
  const tw = useTailwind();
  const icon = useAssetFromTheme(emptyStateNftsLight, emptyStateNftsDark);

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="flex-1 py-8"
    >
      <TabEmptyState
        icon={
          <Image
            source={icon}
            resizeMode="contain"
            style={tw.style('h-[72px] w-[72px]')}
            accessible={false}
          />
        }
        description={strings('gacha.cards.empty')}
        actionButtonText={strings('gacha.cards.open_pack')}
        onAction={onOpenPack}
        actionButtonProps={{ testID: GachaCardsTestIds.EMPTY_CTA }}
        testID={GachaCardsTestIds.EMPTY}
      />
    </Box>
  );
};

/** Inline sync error shown above cached cards. */
const SyncError = ({ onRetry }: { onRetry: () => void }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="mb-3 rounded-xl bg-section px-4 py-2"
    testID={GachaCardsTestIds.SYNC_ERROR}
  >
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      twClassName="flex-1"
    >
      {strings('gacha.cards.sync_error')}
    </Text>
    <Button
      variant={ButtonVariant.Tertiary}
      size={ButtonSize.Sm}
      onPress={onRetry}
      testID={GachaCardsTestIds.SYNC_RETRY}
    >
      {strings('gacha.cards.retry')}
    </Button>
  </Box>
);

const RowSeparator = () => <Box twClassName="h-4" />;

export interface CardsTabProps {
  cardsState: Pick<
    UseCollectorCryptCardsResult,
    'cards' | 'isLoading' | 'error' | 'refetch'
  >;
  onCardPress: (mint: string) => void;
  onOpenPack: () => void;
}

/** "My cards" tab: 2-column grid, pull to refresh, sync error, empty state. */
const CardsTab = ({ cardsState, onCardPress, onOpenPack }: CardsTabProps) => {
  const tw = useTailwind();
  const { cards, isLoading, error, refetch } = cardsState;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleRetry = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  const renderCard = useCallback(
    ({ item: card }: { item: CollectorCryptCard }) => (
      <Box twClassName="flex-1 max-w-[50%] px-1.5">
        <CardTile card={card} onPress={onCardPress} />
      </Box>
    ),
    [onCardPress],
  );

  if (isLoading) {
    return <CardsSkeleton />;
  }

  const emptyContent = error ? (
    <ErrorPanel
      title={strings('gacha.cards.sync_error')}
      description={getCollectorCryptErrorMessage(error.code)}
      onRetry={handleRetry}
    />
  ) : (
    <CardsEmptyState onOpenPack={onOpenPack} />
  );

  return (
    <FlatList
      data={cards}
      keyExtractor={(card) => card.mint}
      renderItem={renderCard}
      numColumns={COLUMNS}
      columnWrapperStyle={tw.style('-mx-1.5')}
      ItemSeparatorComponent={RowSeparator}
      ListHeaderComponent={
        error && cards.length > 0 ? <SyncError onRetry={handleRetry} /> : null
      }
      ListEmptyComponent={emptyContent}
      contentContainerStyle={tw.style(
        'px-4 pb-8 pt-2',
        cards.length === 0 && 'flex-grow',
      )}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      testID={GachaCardsTestIds.LIST}
    />
  );
};

export default CardsTab;
