import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { useSelector } from 'react-redux';
import {
  RefreshTestId,
  SpinnerTestId,
} from '../CollectibleContracts/constants';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { Nft } from '@metamask/assets-controllers';
import {
  isNftFetchingProgressSelector,
  multichainCollectiblesByEnabledNetworksSelector,
} from '../../../reducers/collectibles';
import NftGridFooter from './NftGridFooter';
import NftGridItem from './NftGridItem';
import ActionSheet from '@metamask/react-native-actionsheet';
import NftGridHeader from './NftGridHeader';
import { useNavigation } from '@react-navigation/native';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { CollectiblesEmptyState } from '../CollectiblesEmptyState';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { ActivityIndicator } from 'react-native';
import BaseControlBar from '../shared/BaseControlBar';
import NftGridItemActionSheet from './NftGridItemActionSheet';
import { FlashListProps } from '@shopify/flash-list';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';

const useNftGrid = (): FlashListProps<Nft[]> => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isAddNFTEnabled, setIsAddNFTEnabled] = useState(true);
  const [longPressedCollectible, setLongPressedCollectible] =
    useState<Nft | null>(null);

  const isNftFetchingProgress = useSelector(isNftFetchingProgressSelector);

  const actionSheetRef = useRef<typeof ActionSheet>();

  const collectiblesByEnabledNetworks: Record<string, Nft[]> = useSelector(
    multichainCollectiblesByEnabledNetworksSelector,
  );

  const allFilteredCollectibles: Nft[] = useMemo(() => {
    trace({ name: TraceName.LoadCollectibles });

    const source = Object.values(collectiblesByEnabledNetworks).flat();
    const owned = source.filter((c) => c.isCurrentlyOwned);

    endTrace({ name: TraceName.LoadCollectibles });
    return owned;
  }, [collectiblesByEnabledNetworks]);

  const groupedCollectibles: Nft[][] = useMemo(() => {
    const groups: Nft[][] = [];
    for (let i = 0; i < allFilteredCollectibles.length; i += 3) {
      groups.push(allFilteredCollectibles.slice(i, i + 3));
    }
    return groups;
  }, [allFilteredCollectibles]);

  useEffect(() => {
    if (longPressedCollectible) {
      actionSheetRef.current.show();
    }
  }, [longPressedCollectible]);

  const goToAddCollectible = useCallback(() => {
    setIsAddNFTEnabled(false);
    navigation.navigate('AddAsset', { assetType: 'collectible' });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_ADD_COLLECTIBLES).build(),
    );
    setIsAddNFTEnabled(true);
  }, [navigation, trackEvent, createEventBuilder]);

  // Todo juan, try to add a wrapper to all items in all lists
  return {
    data: groupedCollectibles,
    renderItem: ({ item: rowItems }) => (
      <Box flexDirection={BoxFlexDirection.Row} twClassName="flex-1">
        {rowItems.map((item, index) => (
          <Box
            key={`${item.address}_${item.tokenId}_${index}`}
            twClassName="flex-1"
          >
            <NftGridItem item={item} onLongPress={setLongPressedCollectible} />
          </Box>
        ))}
        {/* Use to fill empty slots in the last row */}
        {rowItems.length < 3 &&
          Array.from({ length: 3 - rowItems.length }).map((_, index) => (
            <Box key={`empty_${index}`} twClassName="flex-1" />
          ))}
      </Box>
    ),
    keyExtractor: (item, index) =>
      `row_${index}_${item.map((nft) => nft.tokenId).join('_')}`,
    testID: RefreshTestId,
    // TODO juan: check if we can enable this without breaking functionality
    // refreshControl: <NftGridListRefreshControl />,
    ListHeaderComponent: (
      <>
        <BaseControlBar
          networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
          useEvmSelectionLogic={false}
          customWrapper="none"
          hideSort
        />
        <NftGridHeader />
      </>
    ),
    ListEmptyComponent: !isNftFetchingProgress ? (
      <CollectiblesEmptyState
        onAction={goToAddCollectible}
        actionButtonProps={{
          testID: WalletViewSelectorsIDs.IMPORT_NFT_BUTTON,
          isDisabled: !isAddNFTEnabled,
        }}
        twClassName="mx-auto mt-4"
        testID="collectibles-empty-state"
      />
    ) : null,
    ListFooterComponent: (
      <>
        {isNftFetchingProgress && (
          <ActivityIndicator size="large" testID={SpinnerTestId} />
        )}

        {allFilteredCollectibles.length > 0 && (
          <NftGridFooter
            isAddNFTEnabled={isAddNFTEnabled}
            goToAddCollectible={goToAddCollectible}
          />
        )}

        <NftGridItemActionSheet
          actionSheetRef={actionSheetRef}
          longPressedCollectible={longPressedCollectible}
        />
      </>
    ),
  };
};

export default useNftGrid;
