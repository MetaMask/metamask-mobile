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
  FlatList,
  RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import ActionSheet from '@metamask/react-native-actionsheet';
import { throttle } from 'lodash';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { removeFavoriteCollectible } from '../../../actions/collectibles';
import {
  collectiblesSelector,
  isNftFetchingProgressSelector,
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
  selectUseNftDetection,
} from '../../../selectors/preferencesController';
import NftGridItem from './NftGridItem';
import NftGridEmpty from './NftGridEmpty';
import NftGridFooter from './NftGridFooter';
import { useNavigation } from '@react-navigation/native';

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

function generateNfts(count: number): Nft[] {
  const nfts: Nft[] = [];
  const placeholderImageUrl = 'https://picsum.photos/200';

  for (let i = 0; i < count; i++) {
    const nft: Nft = {
      tokenId: `token-${i}`,
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      isCurrentlyOwned: true,
      name: `NFT ${i}`,
      description: `Description for NFT ${i}`,
      image: `${placeholderImageUrl}?text=NFT+${i}`,
      standard: 'ERC721',
      favorite: false,
      numberOfSales: Math.floor(Math.random() * 100),
      backgroundColor: '#FFFFFF',
      imagePreview: `${placeholderImageUrl}?text=Preview+${i}`,
      imageThumbnail: `${placeholderImageUrl}?text=Thumbnail+${i}`,
      imageOriginal: `${placeholderImageUrl}?text=Original+${i}`,
      externalLink: `https://example.com/nft/${i}`,
      creator: `Creator ${i}`,
      transactionId: `tx-${Math.random().toString(16).substr(2, 64)}`,
      tokenURI: `https://example.com/nft/${i}.json`,
      rarityRank: `${Math.floor(Math.random() * 1000)}`,
    };

    nfts.push(nft);
  }

  return nfts;
}

export const useNfts = () => {
  const [nfts, setNfts] = useState<Nft[]>([]);

  const appendNfts = useCallback(() => {
    setNfts((prevNfts) => {
      if (prevNfts.length >= 1000) {
        return prevNfts;
      }
      const newNfts = generateNfts(5);
      return [...prevNfts, ...newNfts];
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      appendNfts();
    }, 500);

    return () => clearInterval(interval);
  }, [appendNfts]);

  return nfts;
};

const throttleFilterOwnedCollectibles = throttle(
  (collectibles: Nft[]) =>
    collectibles.filter(
      (singleCollectible: Nft) => singleCollectible.isCurrentlyOwned === true,
    ),
  1000,
);

function NftGrid({ chainId, selectedAddress }: NftGridProps) {
  const navigation =
    useNavigation<
      StackNavigationProp<NftGridNavigationParamList, 'AddAsset'>
    >();
  const allCollectibles = useSelector(collectiblesSelector);
  // const allCollectibles = useNfts();
  const collectibles = useMemo(
    () => throttleFilterOwnedCollectibles(allCollectibles),
    [allCollectibles],
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

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    requestAnimationFrame(async () => {
      setRefreshing(true);
      const { NftDetectionController, NftController } = Engine.context;
      const actions = [
        NftDetectionController.detectNfts(),
        NftController.checkAndUpdateAllNftsOwnershipStatus(),
      ];
      await Promise.allSettled(actions);
      setRefreshing(false);
    });
  }, [setRefreshing]);

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
    (collectible) => {
      const found = collectibles.find(
        (elm: Nft) =>
          elm.address === collectible.address &&
          elm.tokenId === collectible.tokenId,
      );
      if (found) return false;
      return true;
    },
    [collectibles],
  );

  const shouldUpdateCollectibleMetadata = (collectible: Nft) =>
    typeof collectible.tokenId === 'number' ||
    (typeof collectible.tokenId === 'string' &&
      !Number.isNaN(Number(collectible.tokenId)));

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

  useEffect(() => {
    if (!isIpfsGatewayEnabled && !displayNftMedia) {
      return;
    }
    // TO DO: Move this fix to the controllers layer
    const updatableCollectibles = collectibles.filter((single: Nft) =>
      shouldUpdateCollectibleMetadata(single),
    );
    if (updatableCollectibles.length !== 0 && !useNftDetection) {
      updateAllCollectibleMetadata(updatableCollectibles);
    }
  }, [
    collectibles,
    updateAllCollectibleMetadata,
    isIpfsGatewayEnabled,
    displayNftMedia,
    useNftDetection,
  ]);

  const refreshColors = useMemo(
    () => [colors.primary.default],
    [colors.primary.default],
  );

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

  return (
    <View testID="collectible-contracts">
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
      {!isNftFetchingProgress && collectibles.length === 0 && (
        <>
          <NftGridEmpty navigation={navigation} />
          <NftGridFooter navigation={navigation} />
        </>
      )}
      {/* nft grid */}
      {collectibles.length > 0 && (
        <FlatList
          numColumns={3}
          data={collectibles}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          testID={RefreshTestId}
          refreshControl={
            <RefreshControl
              testID={RefreshTestId}
              colors={refreshColors}
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
