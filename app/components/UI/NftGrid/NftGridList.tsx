import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { FlashList } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { RefreshTestId } from '../CollectibleContracts/constants';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { Nft } from '@metamask/assets-controllers';
import { multichainCollectiblesByEnabledNetworksSelector } from '../../../reducers/collectibles';
import NftGridListRefreshControl from './NftGridListRefreshControl';
import NftGridEmpty from './NftGridEmpty';
import NftGridFooter from './NftGridFooter';
import NftGridItem from './NftGridItem';
import ActionSheet from '@metamask/react-native-actionsheet';
import NftGridItemActionSheet from './NftGridItemActionSheet';
import NftGridHeader from './NftGridHeader';
import { useNavigation } from '@react-navigation/native';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';

const NftGridList = () => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const actionSheetRef = useRef<typeof ActionSheet>();
  const [longPressedCollectible, setLongPressedCollectible] =
    useState<Nft | null>(null);

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

  useEffect(() => {
    if (longPressedCollectible) {
      actionSheetRef.current.show();
    }
  }, [longPressedCollectible]);

  // Loading state to make sure Nft tab is opened without lags
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isAddNFTEnabled, setIsAddNFTEnabled] = useState(true);

  const goToAddCollectible = useCallback(() => {
    setIsAddNFTEnabled(false);
    navigation.navigate('AddAsset', { assetType: 'collectible' });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_ADD_COLLECTIBLES).build(),
    );
    setIsAddNFTEnabled(true);
  }, [navigation, trackEvent, createEventBuilder]);

  return (
    <>
      {!isInitialLoading && (
        <FlashList
          ListHeaderComponent={<NftGridHeader />}
          data={allFilteredCollectibles}
          renderItem={({ item }) => (
            <NftGridItem item={item} onLongPress={setLongPressedCollectible} />
          )}
          keyExtractor={(_, index) => index.toString()}
          testID={RefreshTestId}
          refreshControl={<NftGridListRefreshControl />}
          ListEmptyComponent={
            <NftGridEmpty
              isAddNFTEnabled={isAddNFTEnabled}
              goToAddCollectible={goToAddCollectible}
            />
          }
          scrollEnabled={false}
          numColumns={3}
        />
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
  );
};

export default NftGridList;
