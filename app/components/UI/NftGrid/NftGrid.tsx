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

/**
 * Handles the refresh functionality for NFTs
 * @param chainIdsToDetectNftsFor - Array of chain IDs to detect NFTs for
 * @returns Promise that resolves when refresh is complete
 */
export const handleNftRefresh = async (
  chainIdsToDetectNftsFor: `0x${string}`[],
) => {
  const { NftDetectionController, NftController } = Engine.context;

  const actions = [
    NftDetectionController.detectNfts(chainIdsToDetectNftsFor),
    NftController.checkAndUpdateAllNftsOwnershipStatus(),
  ];
  await Promise.allSettled(actions);
};

/**
 * Handles the removal of an NFT
 * @param nft - The NFT to remove
 * @param chainId - The chain ID of the NFT
 * @param selectedAddress - The user's selected address
 * @returns void
 */
export const handleNftRemoval = (
  nft: { address: string; tokenId: string },
  chainId: string,
  selectedAddress: string,
) => {
  const { NftController } = Engine.context;

  removeFavoriteCollectible(selectedAddress, chainId, nft);
  NftController.removeAndIgnoreNft(nft.address, nft.tokenId);
};

/**
 * Handles refreshing the metadata for an NFT
 * @param nft - The NFT to refresh metadata for
 * @returns void
 */
export const handleNftMetadataRefresh = (nft: {
  address: string;
  tokenId: string;
}) => {
  const { NftController } = Engine.context;
  NftController.addNft(nft.address, nft.tokenId);
};

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

  const onRefresh = useCallback(() => {
    requestAnimationFrame(async () => {
      setRefreshing(true);
      await handleNftRefresh(chainIdsToDetectNftsFor);
      setRefreshing(false);
    });
  }, [chainIdsToDetectNftsFor]);

  const removeNft = () => {
    if (
      !longPressedCollectible?.current?.address &&
      !longPressedCollectible?.current?.tokenId
    ) {
      return null;
    }

    handleNftRemoval(longPressedCollectible.current, chainId, selectedAddress);

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
    if (
      !longPressedCollectible?.current?.address &&
      !longPressedCollectible?.current?.tokenId
    ) {
      return null;
    }

    handleNftMetadataRefresh(longPressedCollectible.current);
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

  const renderLoader = useCallback(
    () => (
      <View style={styles.footer} key={'collectible-contracts-footer'}>
        {isNftFetchingProgress ? (
          <ActivityIndicator
            size="large"
            style={styles.spinner}
            testID={SpinnerTestId}
          />
        ) : null}
      </View>
    ),
    [styles, isNftFetchingProgress],
  );

  // Memoize the updatable collectibles to avoid recalculating on every render
  const updatableCollectibles = useMemo(
    () =>
      flatMultichainCollectibles?.filter(shouldUpdateCollectibleMetadata) || [],
    [flatMultichainCollectibles, shouldUpdateCollectibleMetadata],
  );

  const goToLearnMore = useCallback(
    () =>
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: { url: AppConstants.URLS.NFT },
      }),
    [navigation],
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Image
          style={styles.emptyImageContainer}
          source={require('../../../images/no-nfts-placeholder.png')}
          resizeMode={'contain'}
        />
        <Text center style={styles.emptyTitleText} bold>
          {strings('wallet.no_nfts_yet')}
        </Text>
        <Text center big link onPress={goToLearnMore}>
          {strings('wallet.learn_more')}
        </Text>
      </View>
    ),
    [goToLearnMore, styles],
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

  console.log(
    'isNftDetectionEnabled',
    isNftDetectionEnabled,
    isNftFetchingProgress,
    flatMultichainCollectibles.length,
  );

  return (
    <View testID="collectible-contracts" style={styles.container}>
      <TokenListControlBar
        goToAddToken={() =>
          navigation.navigate('AddAsset', { assetType: 'NFT' })
        }
      />
      {/* initial fetching state */}
      {isNftFetchingProgress &&
        flatMultichainCollectibles.length === 0 &&
        renderLoader()}
      {!isNftDetectionEnabled && <CollectibleDetectionModal />}
      {/* empty state */}
      {!isNftFetchingProgress && flatMultichainCollectibles.length === 0 && (
        <>
          <NftGridEmpty navigation={navigation} />
          <NftGridFooter navigation={navigation} />
        </>
      )}
      {/* nft grid */}
      {flatMultichainCollectibles.length > 0 && (
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
          ListEmptyComponent={renderEmpty}
          // incremental fetching state
          ListFooterComponent={renderLoader}
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
