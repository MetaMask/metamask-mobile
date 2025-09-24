import { StyleSheet, View } from 'react-native';
import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { FlashList } from '@shopify/flash-list';
import { MAINNET } from '../../../constants/network';
import { useSelector } from 'react-redux';
import {
  selectChainId,
  selectIsAllNetworks,
  selectProviderType,
  selectSelectedNetworkClientId,
} from '../../../selectors/networkController';
import { selectUseNftDetection } from '../../../selectors/preferencesController';
import CollectibleDetectionModal from '../CollectibleDetectionModal';
import { RefreshTestId } from '../CollectibleContracts/constants';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../util/networks';
import { Nft } from '@metamask/assets-controllers';
import {
  multichainCollectiblesByEnabledNetworksSelector,
  multichainCollectiblesSelector,
} from '../../../reducers/collectibles';
import NftGridListRefreshControl from './NftGridListRefreshControl';
import NftGridEmpty from './NftGridEmpty';
import NftGridFooter from './NftGridFooter';
import NftGridItem from './NftGridItem';
import { useTheme } from '../../../util/theme';
import ActionSheet from '@metamask/react-native-actionsheet';
import NftGridItemActionSheet from './NftGridItemActionSheet';

const styles = StyleSheet.create({
  emptyView: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const NftGridList = () => {
  const { themeAppearance } = useTheme();
  const chainId = useSelector(selectChainId);
  const networkType = useSelector(selectProviderType);
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const useNftDetection = useSelector(selectUseNftDetection);
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);

  const actionSheetRef = useRef<typeof ActionSheet>();
  const longPressedCollectible = useRef<Nft | null>(null);

  // Loading state
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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

  const allFilteredCollectibles = useMemo(() => {
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
    return collectibles.filter(
      (singleCollectible) => singleCollectible.isCurrentlyOwned === true,
    );
  }, [allCollectibles, chainId, isAllNetworks, collectiblesByEnabledNetworks]);

  // Handle initial loading state to avoid
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const onLongPress = useCallback((nft: Nft) => {
    actionSheetRef.current.show();
    longPressedCollectible.current = nft;
  }, []);

  return (
    <>
      {!isInitialLoading && (
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
          data={allFilteredCollectibles}
          renderItem={({ item }) => (
            <NftGridItem item={item} onLongPress={onLongPress} />
          )}
          keyExtractor={(_, index) => index.toString()}
          testID={RefreshTestId}
          refreshControl={<NftGridListRefreshControl />}
          ListEmptyComponent={NftGridEmpty}
          scrollEnabled={false}
          numColumns={3}
        />
      )}

      <NftGridFooter />

      <NftGridItemActionSheet
        chainId={chainId}
        actionSheetRef={actionSheetRef}
        longPressedCollectible={longPressedCollectible.current}
        selectedNetworkClientId={selectedNetworkClientId}
        themeAppearance={themeAppearance}
      />
    </>
  );
};

export default NftGridList;
