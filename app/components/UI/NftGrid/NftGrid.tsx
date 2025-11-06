import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { FlashList } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { RefreshTestId, SpinnerTestId } from './constants';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { Nft } from '@metamask/assets-controllers';
import {
  isNftFetchingProgressSelector,
  multichainCollectiblesByEnabledNetworksSelector,
} from '../../../reducers/collectibles';
import NftGridRefreshControl from './NftGridRefreshControl';
import NftGridItem from './NftGridItem';
import ActionSheet from '@metamask/react-native-actionsheet';
import NftGridItemActionSheet from './NftGridItemActionSheet';
import NftGridHeader from './NftGridHeader';
import { useNavigation } from '@react-navigation/native';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { CollectiblesEmptyState } from '../CollectiblesEmptyState';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import BaseControlBar from '../shared/BaseControlBar';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useStyles } from '../../hooks/useStyles';
import createControlBarStyles from '../shared/ControlBarStyles';

const style = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const NftGrid = () => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isAddNFTEnabled, setIsAddNFTEnabled] = useState(true);
  const [longPressedCollectible, setLongPressedCollectible] =
    useState<Nft | null>(null);
  const { styles } = useStyles(createControlBarStyles, undefined);

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

  const additionalButtons = (
    <ButtonIcon
      testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
      size={ButtonIconSizes.Lg}
      onPress={goToAddCollectible}
      iconName={IconName.Add}
      disabled={!isAddNFTEnabled}
      isDisabled={!isAddNFTEnabled}
      style={styles.controlIconButton}
    />
  );

  return (
    <View style={style.container}>
      <BaseControlBar
        networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
        useEvmSelectionLogic={false}
        customWrapper="none"
        additionalButtons={additionalButtons}
        hideSort
      />
      <FlashList
        ListHeaderComponent={<NftGridHeader />}
        data={allFilteredCollectibles}
        renderItem={({ item }) => (
          <NftGridItem item={item} onLongPress={setLongPressedCollectible} />
        )}
        keyExtractor={(item, index) => `nft-${item.address}-${index}`}
        testID={RefreshTestId}
        decelerationRate="fast"
        refreshControl={<NftGridRefreshControl />}
        ListEmptyComponent={
          !isNftFetchingProgress ? (
            <CollectiblesEmptyState
              onAction={goToAddCollectible}
              actionButtonProps={{
                testID: WalletViewSelectorsIDs.IMPORT_NFT_BUTTON,
                isDisabled: !isAddNFTEnabled,
              }}
              twClassName="mx-auto mt-4"
              testID="collectibles-empty-state"
            />
          ) : null
        }
        ListFooterComponent={
          <>
            {isNftFetchingProgress && (
              <ActivityIndicator size="large" testID={SpinnerTestId} />
            )}
          </>
        }
        numColumns={3}
      />

      <NftGridItemActionSheet
        actionSheetRef={actionSheetRef}
        longPressedCollectible={longPressedCollectible}
      />
    </View>
  );
};

export default NftGrid;
