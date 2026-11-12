import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FontWeight,
  ButtonIcon,
  IconName,
  IconColor,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { CollectiblesPacksTestIds } from '../../Collectibles.testIds';
import ErrorPanel from '../../components/ErrorPanel';
import PackCard from '../../components/PackCard';
import PackCardSkeleton from '../../components/PackCard/PackCardSkeleton';
import { CategoryIcon } from '../../components/CategoryTabs';
import { showErrorToast } from '../../hooks/toasts';
import { usePackPartnerPacks } from '../../providers/pack-partner/hooks/usePackPartnerPacks';
import { PACK_PARTNER_ENVIRONMENT } from '../../providers/pack-partner/constants';
import { packPartnerQueries } from '../../services/data/packPartnerQueries';
import type { CollectiblesPack } from '../../types';
import {
  getPackPartnerErrorMessage,
  getErrorMessageFromUnknown,
} from '../../providers/pack-partner/utils/errorMessages';
import {
  getPackCollections,
  normalizePackCategory,
} from './CollectiblesHome.utils';
import {
  filterPacks,
  type PackSort,
  type PackPriceRange,
} from './discoveryFilters';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import DiscoveryOptionsSheet from '../../components/CollectiblesDiscovery/DiscoveryOptionsSheet';
import { usePackInsights } from '../../hooks/useCollectiblesDiscovery';
import CollectiblesSearchEntry from '../../components/CollectiblesSearchEntry/CollectiblesSearchEntry';

/** The catalogue loads into the same two-column tile geometry as its content. */
const PacksSkeleton = ({ withPurchase }: { withPurchase: boolean }) => (
  <Box paddingHorizontal={4} testID={CollectiblesPacksTestIds.SKELETON}>
    {[0, 1].map((row) => (
      <Box key={row} twClassName="flex-row">
        {[0, 1].map((column) => (
          <Box key={column} twClassName="w-1/2 px-1.5 pb-3">
            <PackCardSkeleton withPurchase={withPurchase} />
          </Box>
        ))}
      </Box>
    ))}
  </Box>
);

const packKey = (pack: CollectiblesPack) => pack.code;

export interface PacksTabProps {
  bottomInset?: number;
  onOpenPack: (pack: CollectiblesPack) => void;
  onBuyPack?: (pack: CollectiblesPack) => void;
  onSearch?: () => void;
  initialCollection?: string;
}

/** Virtualized catalogue with provider-backed search, category and price filters. */
const PacksTab = ({
  bottomInset = 0,
  onOpenPack,
  onBuyPack,
  onSearch,
  initialCollection = '',
}: PacksTabProps) => {
  const tw = useTailwind();
  const presentation = useCollectiblesPresentation();
  const { bottom } = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const listRef = useRef<FlashListRef<CollectiblesPack>>(null);
  const { packs, isLoading, error, refetch } = usePackPartnerPacks();
  const insights = usePackInsights(
    packs.map((pack) => `pack_partner:${pack.code}`),
  );
  const [selectedCollection, setSelectedCollection] = useState(
    normalizePackCategory(initialCollection),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<PackSort>('priceAsc');
  const [range, setRange] = useState<PackPriceRange>('all');
  const [sheet, setSheet] = useState<'sort' | 'price'>();
  const collections = useMemo(() => getPackCollections(packs), [packs]);
  const collection = collections.includes(selectedCollection)
    ? selectedCollection
    : '';
  const visiblePacks = useMemo(
    () => filterPacks(packs, { category: collection, query, sort, range }),
    [packs, collection, query, sort, range],
  );

  // Cached packs stay listed after a failed refresh, so report the failure.
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries(
        {
          queryKey: packPartnerQueries.getPacks(PACK_PARTNER_ENVIRONMENT)
            .queryKey,
          exact: true,
        },
        { throwOnError: true },
      );
    } catch (refreshError) {
      showErrorToast(
        strings('collectibles.packs.refresh_error'),
        getErrorMessageFromUnknown(refreshError),
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const handleCollectionChange = useCallback((value: string) => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setSelectedCollection(value);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: CollectiblesPack }) => (
      <Box paddingBottom={3} twClassName="w-full px-1.5">
        <PackCard
          variant="compact"
          pack={item}
          onOpen={onOpenPack}
          onBuy={onBuyPack}
          openedLast7d={
            insights.data?.[`pack_partner:${item.code}`]?.openedLast7d
          }
        />
      </Box>
    ),
    [onOpenPack, onBuyPack, insights.data],
  );

  if (!presentation.online) return null;

  if (isLoading) {
    return <PacksSkeleton withPurchase={Boolean(onBuyPack)} />;
  }

  if (error && packs.length === 0) {
    return (
      <ErrorPanel
        title={strings('collectibles.packs.error')}
        description={getPackPartnerErrorMessage(error.code)}
        onRetry={refetch}
        testID={CollectiblesPacksTestIds.ERROR}
      />
    );
  }

  if (packs.length === 0) {
    return (
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="px-8 py-8 text-center"
        testID={CollectiblesPacksTestIds.EMPTY}
      >
        {strings('collectibles.packs.empty')}
      </Text>
    );
  }

  return (
    <>
      <Box
        paddingHorizontal={4}
        paddingBottom={3}
        twClassName="flex-row items-center gap-2"
      >
        <CollectiblesSearchEntry
          label={strings('collectibles_discovery.search_packs')}
          value={query}
          onChange={setQuery}
          onSearch={onSearch}
          testID={'collectibles-packs-search-entry'}
          inputTestID={'collectibles-packs-search'}
        />
        <ButtonIcon
          iconName={IconName.Filter}
          iconProps={{
            color:
              range === 'all'
                ? IconColor.IconDefault
                : IconColor.PrimaryDefault,
          }}
          twClassName="bg-muted rounded-xl"
          accessibilityLabel={strings('collectibles_discovery.price_range')}
          onPress={() => setSheet('price')}
          testID="collectibles-price-filter"
        />
        <ButtonIcon
          iconName={IconName.SwapVertical}
          iconProps={{
            color:
              sort === 'priceAsc'
                ? IconColor.IconDefault
                : IconColor.PrimaryDefault,
          }}
          twClassName="bg-muted rounded-xl"
          accessibilityLabel={strings('collectibles_discovery.sort_packs')}
          onPress={() => setSheet('sort')}
          testID="collectibles-pack-sort"
        />
      </Box>
      <Box paddingBottom={3}>
        <FilterButtonGroup
          value={collection}
          onChange={handleCollectionChange}
          twClassName="px-4 gap-2"
          testID={CollectiblesPacksTestIds.FILTERS}
        >
          {['', ...collections].map((category) => (
            <FilterButton
              key={category}
              value={category}
              size={FilterButtonSize.Sm}
              twClassName={collection === category ? 'px-3' : 'bg-section px-3'}
              textProps={{
                variant: TextVariant.BodySm,
                fontWeight: FontWeight.Bold,
              }}
              startAccessory={
                <CategoryIcon
                  category={category}
                  selected={collection === category}
                />
              }
              accessibilityRole="tab"
              accessibilityState={{ selected: collection === category }}
              testID={CollectiblesPacksTestIds.COLLECTION_FILTER(category)}
            >
              {category || strings('collectibles.packs.all_collections')}
            </FilterButton>
          ))}
        </FilterButtonGroup>
      </Box>
      <Box twClassName="flex-1" testID={CollectiblesPacksTestIds.LIST}>
        <FlashList
          ref={listRef}
          numColumns={2}
          ListEmptyComponent={
            <Text
              twClassName="p-8 text-center"
              color={TextColor.TextAlternative}
            >
              {strings('collectibles_discovery.no_results')}
            </Text>
          }
          data={visiblePacks}
          keyExtractor={packKey}
          renderItem={renderItem}
          drawDistance={presentation.drawDistance}
          maintainVisibleContentPosition={{ disabled: true }}
          // Keep the viewport edge-to-edge; only the last item needs clearance.
          contentContainerStyle={tw.style('px-2.5', {
            paddingBottom: Math.max(bottom, 16, bottomInset),
          })}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      </Box>
      {sheet === 'sort' && (
        <DiscoveryOptionsSheet
          title={strings('collectibles_discovery.sort_packs')}
          value={sort}
          options={(['priceAsc', 'priceDesc', 'featured'] as const).map(
            (value) => ({
              value,
              label: strings(`collectibles_discovery.sort_${value}`),
            }),
          )}
          onSelect={setSort}
          onClose={() => setSheet(undefined)}
        />
      )}
      {sheet === 'price' && (
        <DiscoveryOptionsSheet
          title={strings('collectibles_discovery.price_range')}
          value={range}
          options={(['all', 'under100', '100to500', 'over500'] as const).map(
            (value) => ({
              value,
              label: strings(`collectibles_discovery.price_${value}`),
            }),
          )}
          onSelect={setRange}
          onClose={() => setSheet(undefined)}
        />
      )}
    </>
  );
};

export default PacksTab;
