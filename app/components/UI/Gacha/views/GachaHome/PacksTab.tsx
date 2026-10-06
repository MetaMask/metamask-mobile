import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  BoxFlexDirection,
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
import PackCard from '../../components/PackCard';
import PackPurchaseSheet from '../../components/PackPurchaseSheet';
import { showErrorToast } from '../../hooks/toasts';
import { useCollectorCryptPacks } from '../../providers/collector-crypt/hooks/useCollectorCryptPacks';
import { collectorCryptPacksKey } from '../../providers/collector-crypt/queries/packs';
import type {
  CollectorCryptPack,
  SolanaAccountRef,
} from '../../providers/collector-crypt/types';
import {
  getCollectorCryptErrorMessage,
  getErrorMessageFromUnknown,
} from '../../providers/collector-crypt/utils/errorMessages';
import { getPackCollections, getVisiblePacks } from './GachaHome.utils';

const SKELETON_ITEMS = [0, 1];

/** Loading placeholder shaped like pack cards. */
const PacksSkeleton = () => (
  <Box paddingHorizontal={4} gap={3} testID={GachaPacksTestIds.SKELETON}>
    {SKELETON_ITEMS.map((row) => (
      <Box key={row} flexDirection={BoxFlexDirection.Row} gap={3}>
        {SKELETON_ITEMS.map((column) => (
          <Box
            key={column}
            padding={3}
            twClassName="flex-1 rounded-2xl border border-muted bg-muted"
            gap={3}
          >
            <Skeleton height={208} width="100%" twClassName="rounded-xl" />
            <Box gap={1}>
              <Skeleton height={48} width="80%" />
              <Skeleton height={24} width="60%" />
            </Box>
            <Skeleton height={40} width="100%" twClassName="rounded-full" />
          </Box>
        ))}
      </Box>
    ))}
  </Box>
);

const packKey = (pack: CollectorCryptPack) => pack.code;

export interface PacksTabProps {
  account: SolanaAccountRef;
  /** USDC balance in base units. */
  balance: bigint;
  onPurchased: (memo: string) => void;
  onFundAndOpen: (pack: CollectorCryptPack) => void;
  isBusy?: boolean;
}

/** Packs sorted by price, with single-select collection filters. */
const PacksTab = ({
  account,
  balance,
  onPurchased,
  onFundAndOpen,
  isBusy = false,
}: PacksTabProps) => {
  const tw = useTailwind();
  const queryClient = useQueryClient();
  const listRef = useRef<FlashListRef<CollectorCryptPack>>(null);
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

  // Cached packs stay listed after a failed refresh, so report the failure.
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.refetchQueries(
        { queryKey: collectorCryptPacksKey, exact: true },
        { throwOnError: true },
      );
    } catch (error) {
      showErrorToast(
        strings('gacha.packs.refresh_error'),
        getErrorMessageFromUnknown(error),
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const handleCloseSheet = useCallback(() => setSelectedPack(undefined), []);
  const handleOpenPack = useCallback(
    (pack: CollectorCryptPack) => {
      if (isBusy) {
        return;
      }
      setSelectedPack(pack);
    },
    [isBusy],
  );
  const handleCollectionChange = useCallback((value: string) => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setSelectedCollection(value);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: CollectorCryptPack }) => (
      <Box paddingBottom={3} twClassName="px-1.5">
        <PackCard pack={item} isDisabled={isBusy} onOpen={handleOpenPack} />
      </Box>
    ),
    [handleOpenPack, isBusy],
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
          onChange={handleCollectionChange}
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
      <Box twClassName="flex-1" testID={GachaPacksTestIds.LIST}>
        <FlashList
          ref={listRef}
          data={visiblePacks}
          extraData={isBusy}
          keyExtractor={packKey}
          renderItem={renderItem}
          numColumns={2}
          drawDistance={300}
          maintainVisibleContentPosition={{ disabled: true }}
          contentContainerStyle={tw.style('px-2.5 pb-8')}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      </Box>
      {selectedPack && (
        <PackPurchaseSheet
          pack={selectedPack}
          account={account}
          balance={balance}
          onClose={handleCloseSheet}
          onPurchased={onPurchased}
          onFundAndOpen={onFundAndOpen}
        />
      )}
    </>
  );
};

export default PacksTab;
