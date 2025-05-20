import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  ViewToken,
} from 'react-native';
import { useSelector } from 'react-redux';
import ActionSheet from '@metamask/react-native-actionsheet';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { removeFavoriteCollectible } from '../../../actions/collectibles';
import {
  isNftFetchingProgressSelector,
  multichainCollectibleContractsSelector,
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
import { MasonryFlashList, MasonryFlashListRef } from '@shopify/flash-list';
import { toLowerCaseEquals } from '../../../util/general';

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

const INITIAL_NFT_COUNT = 20;
const LAZY_LOAD_COUNT = 10;
const PREFETCH_THRESHOLD = 0.8; // Start prefetching when 80% through the buffer

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
  const multichainContracts = useSelector(
    multichainCollectibleContractsSelector,
  );

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
  const [visibleNftRange, setVisibleNftRange] = useState({
    start: 0,
    end: INITIAL_NFT_COUNT,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const listRef = useRef<MasonryFlashListRef<Nft>>(null);
  const lastVisibleIndexRef = useRef(0);

  const DEVICE_WIDTH = Dimensions.get('window').width;
  const GRID_PADDING = 10;
  const NUM_COLUMNS = 3;
  const ITEM_WIDTH =
    (DEVICE_WIDTH - GRID_PADDING * 2 * NUM_COLUMNS) / NUM_COLUMNS;
  const ITEM_HEIGHT = ITEM_WIDTH + 60; // Width + space for text

  // Memoize the hex chain IDs to avoid repeated conversions during flatMultichainCollectibles loop
  const hexChainIds = useMemo(
    () =>
      Object.keys(tokenNetworkFilter).reduce((acc, chainIdHex) => {
        acc[chainIdHex] = true;
        return acc;
      }, {} as Record<string, boolean>),
    [tokenNetworkFilter],
  );

  // Get all NFTs from contracts
  const allNfts = useMemo(() => {
    const nfts: Nft[] = [];
    const allCollectibles = Object.values(
      multichainCollectibles,
    ).flat() as Nft[];
    const allContracts = Object.values(multichainContracts).flat() as {
      address: string;
      name?: string;
      symbol?: string;
    }[];

    allContracts.forEach((contract) => {
      const contractNfts = allCollectibles.filter(
        (nft) =>
          toLowerCaseEquals(nft.address, contract.address) &&
          nft.isCurrentlyOwned &&
          hexChainIds[toHex(nft.chainId as number)],
      );

      if (contractNfts.length > 0) {
        nfts.push(...contractNfts);
      }
    });

    return nfts;
  }, [multichainCollectibles, multichainContracts, hexChainIds]);

  // Get the current window of NFTs to display
  const visibleNfts = useMemo(
    () => allNfts.slice(visibleNftRange.start, visibleNftRange.end),
    [allNfts, visibleNftRange],
  );

  // Check if we have more NFTs to load
  const hasMoreNfts = useMemo(
    () => visibleNftRange.end < allNfts.length,
    [allNfts.length, visibleNftRange.end],
  );

  // Track visible items and trigger prefetching
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return;

      const lastVisible = viewableItems[viewableItems.length - 1].index ?? 0;
      lastVisibleIndexRef.current = lastVisible;

      // Calculate how far through the buffer we are
      const bufferProgress = lastVisible / (visibleNfts.length - 1);

      // If we're past the prefetch threshold and not already loading, trigger prefetch
      if (
        bufferProgress > PREFETCH_THRESHOLD &&
        !isLoadingMore &&
        !isPrefetching &&
        hasMoreNfts &&
        visibleNftRange.end < allNfts.length // Only trigger if we haven't reached the end
      ) {
        setIsPrefetching(true);
      }
    },
    [
      visibleNfts.length,
      isLoadingMore,
      isPrefetching,
      hasMoreNfts,
      visibleNftRange.end,
      allNfts.length,
    ],
  );

  // Load more NFTs when prefetching is triggered
  useEffect(() => {
    if (!isPrefetching || isLoadingMore || !hasMoreNfts) return;

    const loadMore = async () => {
      setIsLoadingMore(true);
      try {
        const newEnd = Math.min(
          visibleNftRange.end + LAZY_LOAD_COUNT,
          allNfts.length,
        );
        setVisibleNftRange((prev) => ({
          start: prev.start,
          end: newEnd,
        }));
      } finally {
        setIsLoadingMore(false);
        setIsPrefetching(false);
      }
    };

    loadMore();
  }, [
    isPrefetching,
    isLoadingMore,
    hasMoreNfts,
    allNfts.length,
    visibleNftRange.end,
  ]);

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 100,
    }),
    [],
  );

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

  // Memoize the updatable collectibles to avoid recalculating on every render
  const updatableCollectibles = useMemo(
    () => visibleNfts?.filter(shouldUpdateCollectibleMetadata) || [],
    [visibleNfts, shouldUpdateCollectibleMetadata],
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

  const renderItem = useCallback(
    ({ item }: { item: Nft }) => (
      <NftGridItem
        nft={item}
        navigation={navigation}
        privacyMode={privacyMode}
        actionSheetRef={actionSheetRef}
        longPressedCollectible={longPressedCollectible}
      />
    ),
    [navigation, privacyMode],
  );

  const keyExtractor = useCallback(
    (_: unknown, index: number) => index.toString(),
    [],
  );

  const refreshColors = useMemo(
    () => [colors.primary.default],
    [colors.primary.default],
  );

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
      {!isNftFetchingProgress && visibleNfts.length === 0 && (
        <>
          <NftGridEmpty navigation={navigation} />
          <NftGridFooter navigation={navigation} />
        </>
      )}
      {/* nft grid */}
      {!isNftFetchingProgress && visibleNfts.length > 0 && (
        <MasonryFlashList
          ref={listRef}
          data={visibleNfts}
          numColumns={NUM_COLUMNS}
          estimatedItemSize={ITEM_HEIGHT}
          keyExtractor={keyExtractor}
          testID={RefreshTestId}
          renderItem={renderItem}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          contentContainerStyle={{ padding: GRID_PADDING }}
          decelerationRate={0}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              testID={RefreshTestId}
              colors={refreshColors}
              tintColor={colors.icon.default}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          ListFooterComponent={
            <>
              {(isLoadingMore || isPrefetching) &&
                visibleNftRange.end < allNfts.length && (
                  <ActivityIndicator
                    size="small"
                    style={styles.spinner}
                    color={colors.primary.default}
                  />
                )}
              {!isLoadingMore &&
                !isPrefetching &&
                visibleNftRange.end >= allNfts.length && (
                  <NftGridFooter navigation={navigation} />
                )}
            </>
          }
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
