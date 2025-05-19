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
import { MasonryFlashList } from '@shopify/flash-list';
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

interface ContractWithNfts {
  address: string;
  name: string;
  nfts: Nft[];
  isExpanded: boolean;
}

const CONTRACTS_PER_PAGE = 5;

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
  const [visibleContracts, setVisibleContracts] = useState<ContractWithNfts[]>(
    [],
  );
  const [hasMoreContracts, setHasMoreContracts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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

  // Get all contracts and their NFTs
  const contractsWithNfts = useMemo(() => {
    const contracts: ContractWithNfts[] = [];
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
        contracts.push({
          address: contract.address,
          name: contract.name || contract.symbol || 'Unknown Collection',
          nfts: contractNfts,
          isExpanded: false,
        });
      }
    });

    return contracts;
  }, [multichainCollectibles, multichainContracts, hexChainIds]);

  // Load initial contracts
  useEffect(() => {
    if (contractsWithNfts.length > 0) {
      const initialContracts = contractsWithNfts
        .slice(0, CONTRACTS_PER_PAGE)
        .map((contract) => ({
          ...contract,
          isExpanded: true,
        }));
      setVisibleContracts(initialContracts);
      setHasMoreContracts(contractsWithNfts.length > CONTRACTS_PER_PAGE);
    }
  }, [contractsWithNfts]);

  const loadMoreContracts = useCallback(() => {
    if (isLoadingMore || !hasMoreContracts) return;

    setIsLoadingMore(true);
    try {
      const currentLength = visibleContracts.length;
      const nextContracts = contractsWithNfts
        .slice(currentLength, currentLength + CONTRACTS_PER_PAGE)
        .map((contract) => ({ ...contract, isExpanded: true }));

      setVisibleContracts((prev) => [...prev, ...nextContracts]);
      setHasMoreContracts(
        currentLength + CONTRACTS_PER_PAGE < contractsWithNfts.length,
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    hasMoreContracts,
    visibleContracts.length,
    contractsWithNfts,
  ]);

  // Flatten visible NFTs from expanded contracts
  const visibleNfts = useMemo(
    () =>
      visibleContracts
        .filter((contract) => contract.isExpanded)
        .flatMap((contract) => contract.nfts),
    [visibleContracts],
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

  const handleEndReached = useCallback(() => {
    if (!isLoadingMore && hasMoreContracts) {
      loadMoreContracts();
    }
  }, [isLoadingMore, hasMoreContracts, loadMoreContracts]);

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
          data={visibleNfts}
          numColumns={NUM_COLUMNS}
          estimatedItemSize={ITEM_HEIGHT}
          keyExtractor={keyExtractor}
          testID={RefreshTestId}
          renderItem={renderItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ padding: GRID_PADDING }}
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
              {isLoadingMore && (
                <ActivityIndicator
                  size="small"
                  style={styles.spinner}
                  color={colors.primary.default}
                />
              )}
              <NftGridFooter navigation={navigation} />
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
