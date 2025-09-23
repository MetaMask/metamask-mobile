import { StyleSheet, View } from 'react-native';
import React, { useMemo } from 'react';
import NftGridItem from './NftGridItem';
import { FlashList } from '@shopify/flash-list';
import { MAINNET } from '../../../constants/network';
import { useSelector } from 'react-redux';
import {
  selectChainId,
  selectIsAllNetworks,
  selectProviderType,
} from '../../../selectors/networkController';
import { selectUseNftDetection } from '../../../selectors/preferencesController';
import CollectibleDetectionModal from '../CollectibleDetectionModal';
import { RefreshTestId } from '../CollectibleContracts/constants';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../util/networks';
import { Nft, NftContract } from '@metamask/assets-controllers';
import { multichainCollectibleForEvmAccount } from '../../../selectors/nftController';
import {
  multichainCollectibleContractsSelector,
  multichainCollectiblesByEnabledNetworksSelector,
  multichainCollectiblesSelector,
} from '../../../reducers/collectibles';
import NftGridListRefreshControl from './NftGridListRefreshControl';
import NftGridEmpty from './NftGridEmpty';
import NftGridFooter from './NftGridFooter';
import { areAddressesEqual } from '../../../util/address';

const styles = StyleSheet.create({
  emptyView: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const NftGridList = () => {
  const chainId = useSelector(selectChainId);
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const networkType = useSelector(selectProviderType);
  const useNftDetection = useSelector(selectUseNftDetection);
  const collectibleContractsByEnabledNetworks = useSelector(
    multichainCollectibleForEvmAccount,
  );

  const collectibleContractsData = useSelector(
    multichainCollectibleContractsSelector,
  );

  const collectibleContracts = useMemo(
    () =>
      Array.isArray(collectibleContractsData) ? collectibleContractsData : [],
    [collectibleContractsData],
  );

  const collectiblesData = useSelector(multichainCollectiblesSelector);
  const allCollectibles = useMemo(
    () => (Array.isArray(collectiblesData) ? collectiblesData : []),
    [collectiblesData],
  );

  const collectiblesByEnabledNetworks: Record<string, Nft[]> = useSelector(
    multichainCollectiblesByEnabledNetworksSelector,
  );

  const isCollectionDetectionBannerVisible =
    networkType === MAINNET && !useNftDetection;

  const filteredCollectibleContracts = useMemo(() => {
    let contracts: NftContract[] = [];
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      contracts = Object.values(collectibleContractsByEnabledNetworks).flat();
    } else {
      // TODO juan might remove this logic since I have to ask if we can assume isRemoveGlobalNetworkSelectorEnabled is always true
      // TODO look at chainId
      contracts = isAllNetworks
        ? Object.values(collectibleContracts).flat()
        : collectibleContracts[chainId as unknown as number] || [];
    }
    trace({ name: TraceName.LoadCollectibles, id: 'contracts' });
    endTrace({ name: TraceName.LoadCollectibles, id: 'contracts' });

    return contracts;
  }, [
    collectibleContracts,
    chainId,
    isAllNetworks,
    collectibleContractsByEnabledNetworks,
  ]);

  const filteredCollectibles = useMemo(() => {
    trace({ name: TraceName.LoadCollectibles });
    let collectibles: Nft[] = [];
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      collectibles = Object.values(collectiblesByEnabledNetworks).flat();
    } else {
      // TODO juan might remove this logic since I have to ask if we can assume isRemoveGlobalNetworkSelectorEnabled is always true
      // TODO look at chainId
      collectibles = isAllNetworks
        ? Object.values(allCollectibles).flat()
        : allCollectibles[chainId as unknown as number] || [];
    }
    endTrace({ name: TraceName.LoadCollectibles });
    return collectibles;
  }, [allCollectibles, chainId, isAllNetworks, collectiblesByEnabledNetworks]);

  const collectibles = filteredCollectibles.filter(
    (singleCollectible) => singleCollectible.isCurrentlyOwned === true,
  );

  const contractCollectibles = useMemo(() => {
    const result: Nft[] = [];
    filteredCollectibleContracts.forEach((filterdContract) => {
      const found = collectibles?.filter((collectible) =>
        areAddressesEqual(collectible.address, filterdContract.address),
      );
      if (found.length > 0) {
        result.push(...found);
      }
    });
    return result;
  }, [collectibles, filteredCollectibleContracts]);

  return (
    <FlashList
      ListHeaderComponent={
        <>
          {isCollectionDetectionBannerVisible && (
            <View style={styles.emptyView}>
              <CollectibleDetectionModal />
            </View>
          )}
        </>
      }
      data={contractCollectibles}
      // TODO juan fix this since it should be nft and not contract
      renderItem={({ item }) => <NftGridItem item={item} />}
      keyExtractor={(_, index) => index.toString()}
      testID={RefreshTestId}
      refreshControl={<NftGridListRefreshControl />}
      ListEmptyComponent={NftGridEmpty}
      ListFooterComponent={NftGridFooter}
      scrollEnabled={false}
      numColumns={3}
    />
  );
};

export default NftGridList;
