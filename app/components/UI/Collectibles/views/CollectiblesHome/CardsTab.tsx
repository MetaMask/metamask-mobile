import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useIsFocused } from '@react-navigation/native';
import { FlatList, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconName,
  ButtonIcon,
  Switch,
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
import { CollectiblesCardsTestIds } from '../../Collectibles.testIds';
import CardTile from '../../components/CardTile';
import { usePackPartnerAccount } from '../../providers/pack-partner/hooks/usePackPartnerAccount';
import {
  matchesSearch,
  sortCollection,
  type CollectionSort,
} from './discoveryFilters';
import DiscoveryOptionsSheet from '../../components/CollectiblesDiscovery/DiscoveryOptionsSheet';
import CollectiblesSales from '../../components/CollectiblesDiscovery/CollectiblesSales';
import { getCardTitle } from '../../components/CardDisplay/cardLabels';
import CardTileSkeleton from '../../components/CardTile/CardTileSkeleton';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import ErrorPanel from '../../components/ErrorPanel';
import type { UsePackPartnerCardsResult } from '../../providers/pack-partner/hooks/usePackPartnerCards';
import { usePackPartnerCardOffers } from '../../providers/pack-partner/hooks/usePackPartnerCardOffers';
import type { CollectiblesCard } from '../../types';
import { getPackPartnerErrorMessage } from '../../providers/pack-partner/utils/errorMessages';
import { useCollectionTransfer } from '../../components/CollectionTransfer/CollectionTransferProvider';
import CollectionValue from '../../components/CollectionTransfer/CollectionValue';
import { getCollectionValueUsd } from '../../utils/collectionValue';
import { useFiatNormalizer } from '../../../../Views/Homepage/BalanceBreakdown/hooks/useFiatNormalizer';
import { useFormatters } from '../../../../hooks/useFormatters';
import CollectiblesSearchEntry from '../../components/CollectiblesSearchEntry/CollectiblesSearchEntry';

const COLUMNS = 2;
const SKELETON_ROWS = [0, 1];
// Browsing categories stay available even before the first card is collected.
const COLLECTION_CATEGORIES = [
  'Pokemon',
  'One Piece',
  'Sports',
  'Dragon Ball Z',
  'Watches',
  'Others',
];

/** First-load placeholder: two rows of card tiles. */
const CardsSkeleton = () => (
  <Box gap={4} testID={CollectiblesCardsTestIds.SKELETON}>
    {SKELETON_ROWS.map((row) => (
      <Box key={row} flexDirection={BoxFlexDirection.Row} gap={4}>
        {[0, 1].map((column) => (
          <Box key={column} twClassName="flex-1">
            <CardTileSkeleton />
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
    <TabEmptyState
      icon={
        <Image
          source={icon}
          resizeMode="contain"
          style={tw.style('h-[72px] w-[72px]')}
          accessible={false}
        />
      }
      description={strings('collectibles.cards.empty')}
      actionButtonText={strings('collectibles.cards.open_pack')}
      onAction={onOpenPack}
      actionButtonProps={{ testID: CollectiblesCardsTestIds.EMPTY_CTA }}
      twClassName="flex-1 self-center py-8"
      testID={CollectiblesCardsTestIds.EMPTY}
    />
  );
};

/** Inline sync error shown above cached cards. */
const SyncError = ({ onRetry }: { onRetry: () => void }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="mb-3 rounded-xl bg-section px-4 py-2"
    testID={CollectiblesCardsTestIds.SYNC_ERROR}
  >
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      twClassName="flex-1"
    >
      {strings('collectibles.cards.sync_error')}
    </Text>
    <Button
      variant={ButtonVariant.Tertiary}
      size={ButtonSize.Sm}
      onPress={onRetry}
      testID={CollectiblesCardsTestIds.SYNC_RETRY}
    >
      {strings('collectibles.cards.retry')}
    </Button>
  </Box>
);

const RowSeparator = () => <Box twClassName="h-4" />;

export interface CardsTabProps {
  bottomInset?: number;
  isActive?: boolean;
  cardsState: Pick<
    UsePackPartnerCardsResult,
    'cards' | 'isLoading' | 'error' | 'refetch'
  >;
  onCardPress: (mint: string) => void;
  onOpenPack: () => void;
  onExplore?: (screen: 'history' | 'pokedex' | 'sales') => void;
  onSearch?: () => void;
}

/** Collection value and a two-column grid, optionally limited to sellable cards. */
const CardsTab = ({
  bottomInset = 0,
  isActive = true,
  cardsState,
  onCardPress,
  onOpenPack,
  onExplore,
  onSearch,
}: CardsTabProps) => {
  const tw = useTailwind();
  const { bottom } = useSafeAreaInsets();
  const focused = useIsFocused();
  const list = useRef<FlatList<CollectiblesCard>>(null);
  const transfer = useCollectionTransfer();
  const { cards: ownedCards, isLoading, error, refetch } = cardsState;
  const cards = usePackPartnerCardOffers(ownedCards, focused && isActive);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [category, setCategory] = useState('');
  const [buybackOnly, setBuybackOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CollectionSort>('newest');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const account = usePackPartnerAccount();
  const presentation = useCollectiblesPresentation();
  const { toUserCurrency, userCurrency } = useFiatNormalizer();
  const { formatCurrency } = useFormatters();
  const categories = useMemo(
    () => [
      ...new Set([
        ...COLLECTION_CATEGORIES,
        ...cards.flatMap((card) => (card.category ? [card.category] : [])),
      ]),
    ],
    [cards],
  );
  const selectedCategory = categories.includes(category) ? category : '';
  const eligibleCount = cards.filter(
    (card) => card.buyback.status === 'available' && !card.sale,
  ).length;
  const visibleCards = useMemo(
    () =>
      sortCollection(
        cards.filter(
          (card) =>
            matchesSearch(getCardTitle(card), query) &&
            (!selectedCategory || card.category === selectedCategory) &&
            (!buybackOnly ||
              (card.buyback.status === 'available' && !card.sale)),
        ),
        sort,
      ),
    [cards, selectedCategory, buybackOnly, query, sort],
  );
  const clearFilters = () => {
    setCategory('');
    setBuybackOnly(false);
    setQuery('');
  };
  const landingMint = transfer.landingMint;
  useEffect(() => {
    if (!focused || !landingMint) return;
    setCategory('');
    setBuybackOnly(false);
    setQuery('');
    setSort('newest');
  }, [focused, landingMint]);
  useEffect(() => {
    if (!focused || !landingMint) return;
    const index = visibleCards.findIndex((card) => card.mint === landingMint);
    if (index < 0) return;
    const frame = requestAnimationFrame(() =>
      list.current?.scrollToIndex({
        index: Math.floor(index / COLUMNS),
        animated: false,
        viewPosition: 0.5,
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [focused, landingMint, visibleCards]);
  const { cancelTransfers } = transfer;
  useEffect(
    () => (focused ? cancelTransfers : undefined),
    [focused, cancelTransfers],
  );
  const totalValue = getCollectionValueUsd(ownedCards);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleRetry = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  const renderCard = useCallback(
    ({ item: card }: { item: CollectiblesCard }) => {
      const value =
        card.insuredValue === undefined
          ? undefined
          : toUserCurrency(card.insuredValue);
      return (
        <Box twClassName="w-1/2 px-2">
          <CardTile
            card={card}
            onPress={onCardPress}
            isCollectionTransferTarget={focused}
            formattedValue={
              value === undefined ? '—' : formatCurrency(value, userCurrency)
            }
          />
        </Box>
      );
    },
    [onCardPress, focused, toUserCurrency, formatCurrency, userCurrency],
  );

  const isInitialLoading = isLoading && cards.length === 0;

  const emptyContent =
    cards.length > 0 ? (
      <Box alignItems={BoxAlignItems.Center} gap={3} paddingVertical={8}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={CollectiblesCardsTestIds.NO_SELL_AVAILABLE}
        >
          {strings('collectibles.cards.no_matching_cards')}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          onPress={clearFilters}
        >
          {strings('collectibles.cards.clear_filters')}
        </Button>
      </Box>
    ) : error ? (
      <ErrorPanel
        title={strings('collectibles.cards.sync_error')}
        description={getPackPartnerErrorMessage(error.code)}
        onRetry={handleRetry}
      />
    ) : (
      <CardsEmptyState onOpenPack={onOpenPack} />
    );

  return (
    <>
      <FlatList
        ref={list}
        data={visibleCards}
        onScrollToIndexFailed={({ averageItemLength, index }) =>
          list.current?.scrollToOffset({
            offset: averageItemLength * index,
            animated: false,
          })
        }
        initialNumToRender={presentation.previewCount}
        maxToRenderPerBatch={presentation.previewCount}
        windowSize={presentation.previewCount === 4 ? 3 : 5}
        keyExtractor={(card) => card.mint}
        renderItem={renderCard}
        numColumns={COLUMNS}
        columnWrapperStyle={tw.style('-mx-2')}
        ItemSeparatorComponent={RowSeparator}
        ListHeaderComponent={
          <Box paddingTop={3} paddingBottom={4} gap={4}>
            {error && cards.length > 0 && <SyncError onRetry={handleRetry} />}
            <Box gap={1}>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('collectibles.cards.total_value')}
              </Text>
              {isInitialLoading ? (
                <Skeleton height={44} width={180} />
              ) : (
                <CollectionValue
                  key={`${account?.id ?? ''}:${account?.address ?? ''}`}
                  value={totalValue}
                  isActive={focused}
                />
              )}
            </Box>
            <Box gap={3} testID={CollectiblesCardsTestIds.FILTERS}>
              <Box twClassName="flex-row gap-2 items-center">
                <CollectiblesSearchEntry
                  label={strings('collectibles_discovery.search_cards')}
                  value={query}
                  onChange={setQuery}
                  onSearch={onSearch}
                  testID={CollectiblesCardsTestIds.SEARCH_ENTRY}
                  inputTestID={CollectiblesCardsTestIds.SEARCH_INPUT}
                />
                <ButtonIcon
                  iconName={IconName.Filter}
                  twClassName="bg-muted rounded-full"
                  accessibilityLabel={strings(
                    'collectibles_discovery.filter_cards',
                  )}
                  onPress={() => setCategoryOpen(true)}
                  testID="collectibles-card-category-filter"
                />
                <ButtonIcon
                  iconName={IconName.SwapVertical}
                  twClassName="bg-muted rounded-xl"
                  accessibilityLabel={strings(
                    'collectibles_discovery.sort_cards',
                  )}
                  onPress={() => setSortOpen(true)}
                  testID={CollectiblesCardsTestIds.SORT}
                />
              </Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
                paddingHorizontal={3}
                paddingVertical={2}
                twClassName="self-start rounded-xl border border-muted bg-section"
              >
                <Icon name={IconName.ShieldLock} />
                <Text variant={TextVariant.BodySm}>
                  {strings('collectibles.cards.buyback_available')}
                </Text>
                {isInitialLoading ? (
                  <Skeleton height={20} width={20} />
                ) : (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    twClassName="min-w-5 rounded-md bg-muted px-1 text-center"
                  >
                    {eligibleCount}
                  </Text>
                )}
                <Switch
                  isOn={buybackOnly}
                  onValueChange={setBuybackOnly}
                  accessibilityLabel={strings(
                    'collectibles.cards.buyback_available',
                  )}
                  testID={CollectiblesCardsTestIds.SELL_AVAILABLE_FILTER}
                />
              </Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
              >
                {isInitialLoading ? (
                  <Skeleton height={20} width={80} />
                ) : (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {strings('collectibles.cards.all_cards', {
                      count: visibleCards.length,
                    })}
                  </Text>
                )}
                {(selectedCategory || buybackOnly) && (
                  <Button
                    variant={ButtonVariant.Tertiary}
                    size={ButtonSize.Sm}
                    onPress={clearFilters}
                    testID={CollectiblesCardsTestIds.CLEAR_FILTERS}
                  >
                    {strings('collectibles.cards.clear_filters')}
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        }
        ListEmptyComponent={isInitialLoading ? <CardsSkeleton /> : emptyContent}
        ListFooterComponent={
          onExplore ? (
            <CollectiblesSales
              address={account?.address}
              onHistory={() => onExplore('sales')}
            />
          ) : null
        }
        contentContainerStyle={tw.style(
          'px-4 pt-2',
          { paddingBottom: Math.max(bottom, 16, bottomInset) },
          cards.length === 0 && 'flex-grow',
        )}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        testID={CollectiblesCardsTestIds.LIST}
      />
      {categoryOpen && (
        <DiscoveryOptionsSheet
          title={strings('collectibles_discovery.filter_cards')}
          value={selectedCategory}
          options={['', ...categories].map((value) => ({
            value,
            label: value || strings('collectibles.packs.all_collections'),
          }))}
          onSelect={setCategory}
          onClose={() => setCategoryOpen(false)}
        />
      )}
      {sortOpen && (
        <DiscoveryOptionsSheet
          title={strings('collectibles_discovery.sort_cards')}
          value={sort}
          options={(['newest', 'oldest', 'valueDesc', 'valueAsc'] as const).map(
            (value) => ({
              value,
              label: strings(`collectibles_discovery.sort_${value}`),
            }),
          )}
          onSelect={setSort}
          onClose={() => setSortOpen(false)}
        />
      )}
    </>
  );
};

export default CardsTab;
