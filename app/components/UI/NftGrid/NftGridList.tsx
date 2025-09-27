import React, { useMemo, useState, useRef, useEffect } from 'react';
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
          ListEmptyComponent={NftGridEmpty}
          scrollEnabled={false}
          numColumns={3}
        />
      )}

      <NftGridFooter />

      <NftGridItemActionSheet
        actionSheetRef={actionSheetRef}
        longPressedCollectible={longPressedCollectible}
      />
    </>
  );
};

export default NftGridList;
