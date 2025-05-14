import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import ActionSheet from '@metamask/react-native-actionsheet';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { removeFavoriteCollectible } from '../../../actions/collectibles';
import {
  isNftFetchingProgressSelector,
  multichainCollectiblesSelector,
} from '../../../reducers/collectibles';
import { useTheme } from '../../../util/theme';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../components/hooks/useMetrics';
import { getDecimalChainId } from '../../../util/networks';
import { Nft } from '@metamask/assets-controllers';
import styleSheet from './NftGrid.styles';
import { StackNavigationProp } from '@react-navigation/stack';
import CollectibleDetectionModal from '../CollectibleDetectionModal';
import {
  selectDisplayNftMedia,
  selectIsIpfsGatewayEnabled,
  selectPrivacyMode,
  selectTokenNetworkFilter,
  selectUseNftDetection,
} from '../../../selectors/preferencesController';
import NftGridItem from './NftGridItem';
import NftGridEmpty from './NftGridEmpty';
import NftGridFooter from './NftGridFooter';
import { useNavigation } from '@react-navigation/native';
import { useNftDetectionChainIds } from '../../hooks/useNftDetectionChainIds';
import { TokenListControlBar } from '../Tokens/TokenListControlBar';
import { toHex } from '@metamask/controller-utils';
import { MasonryFlashList } from '@shopify/flash-list';
export const RefreshTestId = 'refreshControl';
export const SpinnerTestId = 'spinner';

interface ActionSheetType {
  show: () => void;
}

export interface LongPressedCollectibleType {
  address: string;
  tokenId: string;
}

interface NftGridNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

interface NftGridProps {
  chainId: string;
  selectedAddress: string;
}

function NftGrid({ chainId, selectedAddress }: NftGridProps) {
  const navigation =
    useNavigation<
      StackNavigationProp<NftGridNavigationParamList, 'AddAsset'>
    >();
  const multichainCollectibles = useSelector(multichainCollectiblesSelector);
  const privacyMode = useSelector(selectPrivacyMode);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);
  const displayNftMedia = useSelector(selectDisplayNftMedia);
  const useNftDetection = useSelector(selectUseNftDetection);
  const isNftFetchingProgress = useSelector(isNftFetchingProgressSelector);
  const isNftDetectionEnabled = useSelector(selectUseNftDetection);
  const actionSheetRef = useRef<ActionSheetType>(null);
  const longPressedCollectible = useRef<LongPressedCollectibleType | null>(
    null,
  );
  const { themeAppearance, colors } = useTheme();
  const styles = styleSheet(colors);
  const { trackEvent, createEventBuilder } = useMetrics();
  const chainIdsToDetectNftsFor = useNftDetectionChainIds();
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);

  const [refreshing, setRefreshing] = useState(false);

  // Memoize the hex chain IDs to avoid repeated conversions during flatMultichainCollectibles loop
  const hexChainIds = useMemo(
    () =>
      Object.keys(tokenNetworkFilter).reduce((acc, chainIdHex) => {
        acc[chainIdHex] = true;
        return acc;
      }, {} as Record<string, boolean>),
    [tokenNetworkFilter],
  );

  const flatMultichainCollectibles = useMemo(() => {
    const collectibles: Nft[] = [];
    (Object.values(multichainCollectibles) as Nft[][]).forEach(
      (chainCollectibles) => {
        chainCollectibles.forEach((nft) => {
          const hexChainId = toHex(nft.chainId as number);
          if (hexChainIds[hexChainId]) {
            collectibles.push(nft);
          }
        });
      },
    );
    return collectibles;
  }, [multichainCollectibles, hexChainIds]);

  const onRefresh = useCallback(async () => {
    requestAnimationFrame(async () => {
      setRefreshing(true);
      const { NftDetectionController, NftController } = Engine.context;

      const actions = [
        NftDetectionController.detectNfts(chainIdsToDetectNftsFor),
        NftController.checkAndUpdateAllNftsOwnershipStatus(),
      ];
      await Promise.allSettled(actions);
      setRefreshing(false);
    });
  }, [chainIdsToDetectNftsFor]);

  const removeNft = () => {
    const { NftController } = Engine.context;

    if (
      !longPressedCollectible?.current?.address &&
      !longPressedCollectible?.current?.tokenId
    ) {
      return null;
    }

    removeFavoriteCollectible(
      selectedAddress,
      chainId,
      longPressedCollectible.current,
    );
    NftController.removeAndIgnoreNft(
      longPressedCollectible.current.address,
      longPressedCollectible.current.tokenId,
    );

    trackEvent(
      createEventBuilder(MetaMetricsEvents.COLLECTIBLE_REMOVED)
        .addProperties({
          chain_id: getDecimalChainId(chainId),
        })
        .build(),
    );
    Alert.alert(
      strings('wallet.collectible_removed_title'),
      strings('wallet.collectible_removed_desc'),
    );
  };

  const refreshMetadata = () => {
    const { NftController } = Engine.context;

    if (
      !longPressedCollectible?.current?.address &&
      !longPressedCollectible?.current?.tokenId
    ) {
      return null;
    }

    NftController.addNft(
      longPressedCollectible.current.address,
      longPressedCollectible.current.tokenId,
    );
  };

  const FIRST_MENU_ACTION = 0;
  const SECOND_MENU_ACTION = 1;

  const handleMenuAction = (index: number) => {
    if (index === FIRST_MENU_ACTION) {
      refreshMetadata();
    } else if (index === SECOND_MENU_ACTION) {
      removeNft();
    }
  };

  const isCollectibleIgnored = useCallback(
    (collectible: Nft) => {
      const chainCollectibles =
        multichainCollectibles[toHex(collectible.chainId as number)] || [];
      return !chainCollectibles.some(
        (elm: Nft) =>
          elm.address === collectible.address &&
          elm.tokenId === collectible.tokenId,
      );
    },
    [multichainCollectibles],
  );

  const shouldUpdateCollectibleMetadata = useCallback(
    (collectible: Nft) =>
      typeof collectible.tokenId === 'number' ||
      (typeof collectible.tokenId === 'string' &&
        !Number.isNaN(Number(collectible.tokenId))),
    [],
  );

  const updateAllCollectibleMetadata = useCallback(
    async (collectiblesArr: Nft[]) => {
      const { NftController } = Engine.context;
      // Filter out ignored collectibles
      const filteredcollectibles = collectiblesArr.filter(
        (collectible: Nft) => !isCollectibleIgnored(collectible),
      );

      // filter removable collectible
      const removable = filteredcollectibles.filter((single: Nft) =>
        String(single.tokenId).includes('e+'),
      );
      const updatable = filteredcollectibles.filter(
        (single: Nft) => !String(single.tokenId).includes('e+'),
      );

      removable.forEach((elm: Nft) => {
        removeFavoriteCollectible(selectedAddress, chainId, elm);
      });

      if (updatable.length !== 0) {
        await NftController.updateNftMetadata({
          nfts: updatable,
          userAddress: selectedAddress,
        });
      }
    },
    [isCollectibleIgnored, chainId, selectedAddress],
  );

  // Memoize the updatable collectibles to avoid recalculating on every render
  const updatableCollectibles = useMemo(
    () =>
      flatMultichainCollectibles?.filter(shouldUpdateCollectibleMetadata) || [],
    [flatMultichainCollectibles, shouldUpdateCollectibleMetadata],
  );

  useEffect(() => {
    if (!isIpfsGatewayEnabled && !displayNftMedia) {
      return;
    }
    if (updatableCollectibles.length !== 0 && !useNftDetection) {
      updateAllCollectibleMetadata(updatableCollectibles);
    }
  }, [
    updatableCollectibles,
    updateAllCollectibleMetadata,
    isIpfsGatewayEnabled,
    displayNftMedia,
    useNftDetection,
  ]);

  return (
    <View testID="collectible-contracts" style={styles.container}>
      <TokenListControlBar
        goToAddToken={() =>
          navigation.navigate('AddAsset', { assetType: 'NFT' })
        }
      />
      {!isNftDetectionEnabled && <CollectibleDetectionModal />}
      {/* fetching state */}
      {isNftFetchingProgress && (
        <ActivityIndicator
          size="large"
          style={styles.spinner}
          testID={SpinnerTestId}
        />
      )}
      {/* empty state */}
      {!isNftFetchingProgress && flatMultichainCollectibles.length === 0 && (
        <>
          <NftGridEmpty navigation={navigation} />
          <NftGridFooter navigation={navigation} />
        </>
      )}
      {/* nft grid */}
      {!isNftFetchingProgress && flatMultichainCollectibles.length > 0 && (
        <MasonryFlashList
          data={flatMultichainCollectibles}
          numColumns={3}
          estimatedItemSize={200}
          keyExtractor={(_, index) => index.toString()}
          testID={RefreshTestId}
          renderItem={({ item }: { item: Nft }) => (
            <NftGridItem
              nft={item}
              navigation={navigation}
              privacyMode={privacyMode}
              actionSheetRef={actionSheetRef}
              longPressedCollectible={longPressedCollectible}
            />
          )}
          refreshControl={
            <RefreshControl
              testID={RefreshTestId}
              colors={[colors.primary.default]}
              tintColor={colors.icon.default}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          ListFooterComponent={<NftGridFooter navigation={navigation} />}
        />
      )}
      <ActionSheet
        ref={actionSheetRef}
        title={strings('wallet.collectible_action_title')}
        options={[
          strings('wallet.refresh_metadata'),
          strings('wallet.remove'),
          strings('wallet.cancel'),
        ]}
        cancelButtonIndex={2}
        destructiveButtonIndex={1}
        onPress={handleMenuAction}
        theme={themeAppearance}
      />
    </View>
  );
}

export default NftGrid;
