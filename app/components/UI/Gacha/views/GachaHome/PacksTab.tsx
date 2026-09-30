import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import {
  Box,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { GachaPacksTestIds } from '../../Gacha.testIds';
import ErrorPanel from '../../components/ErrorPanel';
import PackCard, { canAffordPack } from '../../components/PackCard';
import PackPurchaseSheet from '../../components/PackPurchaseSheet';
import { useCollectorCryptPacks } from '../../providers/collector-crypt/hooks/useCollectorCryptPacks';
import type {
  CollectorCryptPack,
  SolanaAccountRef,
} from '../../providers/collector-crypt/types';
import { getCollectorCryptErrorMessage } from '../../providers/collector-crypt/utils/errorMessages';
import { getPackCollections, getVisiblePacks } from './GachaHome.utils';

const SKELETON_ITEMS = [0, 1, 2];

/** Loading placeholder shaped like pack cards. */
const PacksSkeleton = () => (
  <Box twClassName="px-4" gap={3} testID={GachaPacksTestIds.SKELETON}>
    {SKELETON_ITEMS.map((item) => (
      <Box key={item} twClassName="rounded-2xl bg-section p-4" gap={3}>
        <Skeleton height={20} width="40%" />
        <Skeleton height={24} width="80%" />
        <Skeleton height={16} width="60%" />
        <Skeleton height={48} width="100%" twClassName="rounded-full" />
      </Box>
    ))}
  </Box>
);

const PackSeparator = () => <Box twClassName="h-3" />;

export interface PacksTabProps {
  account: SolanaAccountRef;
  /** USDC balance in base units. */
  balance: bigint;
  onPurchased: (memo: string) => void;
}

/** Packs sorted by price, with single-select collection filters. */
const PacksTab = ({ account, balance, onPurchased }: PacksTabProps) => {
  const tw = useTailwind();
  const { packs, isLoading, error, refetch } = useCollectorCryptPacks();
  const [selectedPack, setSelectedPack] = useState<CollectorCryptPack>();
  const [selectedCollection, setSelectedCollection] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const collections = useMemo(() => getPackCollections(packs), [packs]);
  const collection = collections.includes(selectedCollection)
    ? selectedCollection
    : '';
  const visiblePacks = useMemo(
    () => getVisiblePacks(packs, collection),
    [packs, collection],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleCloseSheet = useCallback(() => setSelectedPack(undefined), []);

  const renderItem = useCallback(
    ({ item }: { item: CollectorCryptPack }) => (
      <PackCard
        pack={item}
        isAffordable={canAffordPack(balance, item.price)}
        onOpen={setSelectedPack}
      />
    ),
    [balance],
  );

  if (isLoading) {
    return <PacksSkeleton />;
  }

  if (error) {
    return (
      <ErrorPanel
        title={strings('gacha.packs.error')}
        description={getCollectorCryptErrorMessage(error.code)}
        onRetry={refetch}
        testID={GachaPacksTestIds.ERROR}
      />
    );
  }

  if (packs.length === 0) {
    return (
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="px-8 py-8 text-center"
        testID={GachaPacksTestIds.EMPTY}
      >
        {strings('gacha.packs.empty')}
      </Text>
    );
  }

  return (
    <>
      <Box paddingBottom={4}>
        <FilterButtonGroup
          value={collection}
          onChange={setSelectedCollection}
          twClassName="px-4 gap-2"
          testID={GachaPacksTestIds.FILTERS}
        >
          {['', ...collections].map((category) => (
            <FilterButton
              key={category}
              value={category}
              size={FilterButtonSize.Sm}
              accessibilityRole="tab"
              accessibilityState={{ selected: collection === category }}
              testID={GachaPacksTestIds.COLLECTION_FILTER(category)}
            >
              {category || strings('gacha.packs.all_collections')}
            </FilterButton>
          ))}
        </FilterButtonGroup>
      </Box>
      <FlatList
        data={visiblePacks}
        extraData={balance}
        key={collection}
        keyExtractor={(pack) => pack.code}
        renderItem={renderItem}
        ItemSeparatorComponent={PackSeparator}
        contentContainerStyle={tw.style('px-4 pb-8')}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        testID={GachaPacksTestIds.LIST}
      />
      {selectedPack && (
        <PackPurchaseSheet
          pack={selectedPack}
          account={account}
          balance={balance}
          onClose={handleCloseSheet}
          onPurchased={onPurchased}
        />
      )}
    </>
  );
};

export default PacksTab;
