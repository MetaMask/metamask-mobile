import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Image,
  Platform,
  FlatList,
  RefreshControl,
} from 'react-native';
import { connect, useSelector } from 'react-redux';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import CollectibleContractElement from '../CollectibleContractElement';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  collectibleContractsSelector,
  collectiblesSelector,
  favoritesCollectiblesSelector,
} from '../../../reducers/collectibles';
import { removeFavoriteCollectible } from '../../../actions/collectibles';
import Text from '../../Base/Text';
import AppConstants from '../../../core/AppConstants';
import { isIPFSUri, toLowerCaseEquals } from '../../../util/general';
import { compareTokenIds } from '../../../util/tokens';
import CollectibleDetectionModal from '../CollectibleDetectionModal';
import { useTheme } from '../../../util/theme';
import { MAINNET } from '../../../constants/network';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  selectChainId,
  selectProviderType,
} from '../../../selectors/networkController';
import {
  selectIsIpfsGatewayEnabled,
  selectSelectedAddress,
  selectUseNftDetection,
  selectDisplayNftMedia,
} from '../../../selectors/preferencesController';
import {
  IMPORT_NFT_BUTTON_ID,
  NFT_TAB_CONTAINER_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import Logger from '../../../util/Logger';
import { useMetrics } from '../../../components/hooks/useMetrics';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      marginTop: 16,
    },
    emptyView: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    addText: {
      fontSize: 14,
      color: colors.primary.default,
      ...fontStyles.normal,
    },
    footer: {
      flex: 1,
      alignItems: 'center',
      marginTop: 8,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
    },
    emptyImageContainer: {
      width: 76,
      height: 76,
      marginTop: 30,
      marginBottom: 12,
      tintColor: colors.icon.muted,
    },
    emptyTitleText: {
      fontSize: 24,
      color: colors.text.alternative,
    },
    emptyText: {
      color: colors.text.alternative,
      marginBottom: 8,
      fontSize: 14,
    },
  });

/**
 * View that renders a list of CollectibleContract
 * ERC-721 and ERC-1155
 */
const CollectibleContracts = ({
  selectedAddress,
  chainId,
  networkType,
  navigation,
  collectibleContracts,
  collectibles: allCollectibles,
  favoriteCollectibles,
  removeFavoriteCollectible,
  useNftDetection,
  isIpfsGatewayEnabled,
}) => {
  const collectibles = allCollectibles.filter(
    (singleCollectible) => singleCollectible.isCurrentlyOwned === true,
  );
  const { colors } = useTheme();
  const { trackEvent } = useMetrics();
  const styles = createStyles(colors);
  const [isAddNFTEnabled, setIsAddNFTEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isRemovingNftInProgress, setIsRemovingNftInProgress] = useState(false);

  const toggleRemovingProgress = () =>
    setIsRemovingNftInProgress((value) => !value);

  const displayNftMedia = useSelector(selectDisplayNftMedia);

  const isCollectionDetectionBannerVisible =
    networkType === MAINNET && !useNftDetection;

  const onItemPress = useCallback(
    (collectible, contractName) => {
      navigation.navigate('CollectiblesDetails', { collectible, contractName });
    },
    [navigation],
  );

  /**
   *  Method that checks if the collectible is inside the collectibles array. If it is not it means the
   *  collectible has been ignored, hence we should not call the updateMetadata which executes the addNft fct
   *
   *  @returns Boolean indicating if the collectible is ignored or not.
   */
  const isCollectibleIgnored = useCallback(
    (collectible) => {
      const found = collectibles.find(
        (elm) =>
          elm.address === collectible.address &&
          elm.tokenId === collectible.tokenId,
      );
      if (found) return false;
      return true;
    },
    [collectibles],
  );

  /**
   *  Method to check the token id data type of the current collectibles.
   *
   * @param collectible - Collectible object.
   * @returns Boolean indicating if the collectible should be updated.
   */
  const shouldUpdateCollectibleMetadata = (collectible) =>
    typeof collectible.tokenId === 'number' ||
    (typeof collectible.tokenId === 'string' && !isNaN(collectible.tokenId));

  /**
   * Method to updated collectible and avoid backwards compatibility issues.
   * @param address - Collectible address.
   * @param tokenId - Collectible token ID.
   */
  const updateCollectibleMetadata = useCallback(
    async (collectible) => {
      const { NftController } = Engine.context;
      const { address, tokenId } = collectible;

      const isIgnored = isCollectibleIgnored(collectible);

      if (!isRemovingNftInProgress && !isIgnored) {
        if (String(tokenId).includes('e+')) {
          removeFavoriteCollectible(selectedAddress, chainId, collectible);
        } else {
          await NftController.addNft(address, String(tokenId));
        }
      }
    },
    [
      chainId,
      removeFavoriteCollectible,
      selectedAddress,
      isCollectibleIgnored,
      isRemovingNftInProgress,
    ],
  );

  useEffect(() => {
    // TO DO: Move this fix to the controllers layer
    collectibles.forEach((collectible) => {
      if (shouldUpdateCollectibleMetadata(collectible)) {
        updateCollectibleMetadata(collectible);
      }
    });
  }, [collectibles, updateCollectibleMetadata]);

  const memoizedCollectibles = useMemo(() => collectibles, [collectibles]);

  const isNftUpdatableWithOpenSea = (collectible) =>
    Boolean(
      !collectible.image &&
        !collectible.name &&
        !collectible.description &&
        // Preventing on a loop if the proxy or open sea api can't be fetched
        !(
          collectible.error?.startsWith('Opensea') ||
          collectible.error?.startsWith('Both')
        ),
    );

  const updateOpenSeaUnfetchedMetadata = useCallback(async () => {
    try {
      if (displayNftMedia) {
        const promises = memoizedCollectibles.map(async (collectible) => {
          if (isNftUpdatableWithOpenSea(collectible)) {
            await updateCollectibleMetadata(collectible);
          }
        });

        await Promise.all(promises);
      }
    } catch (error) {
      Logger.error(
        error,
        'error while trying to update metadata of stored nfts',
      );
    }
  }, [updateCollectibleMetadata, memoizedCollectibles, displayNftMedia]);

  useEffect(() => {
    updateOpenSeaUnfetchedMetadata();
  }, [updateOpenSeaUnfetchedMetadata]);

  const isNftUpdatableWithThirdParties = (collectible) =>
    Boolean(
      !collectible.image &&
        !collectible.name &&
        !collectible.description &&
        isIPFSUri(collectible.tokenURI) &&
        // Preventing on a loop if the third party service can't be fetched
        !(
          collectible.error?.startsWith('URI') ||
          collectible.error?.startsWith('Both')
        ),
    );

  const updateThirdPartyUnfetchedMetadata = useCallback(async () => {
    try {
      if (isIpfsGatewayEnabled) {
        const promises = memoizedCollectibles.map(async (collectible) => {
          if (isNftUpdatableWithThirdParties(collectible)) {
            await updateCollectibleMetadata(collectible);
          }
        });

        await Promise.all(promises);
      }
    } catch (error) {
      Logger.error(
        error,
        'error while trying to update metadata of stored nfts',
      );
    }
  }, [updateCollectibleMetadata, isIpfsGatewayEnabled, memoizedCollectibles]);

  useEffect(() => {
    updateThirdPartyUnfetchedMetadata();
  }, [updateThirdPartyUnfetchedMetadata]);

  const goToAddCollectible = useCallback(() => {
    setIsAddNFTEnabled(false);
    navigation.push('AddAsset', { assetType: 'collectible' });
    trackEvent(MetaMetricsEvents.WALLET_ADD_COLLECTIBLES);
    setIsAddNFTEnabled(true);
  }, [navigation, trackEvent]);

  const renderFooter = useCallback(
    () => (
      <View style={styles.footer} key={'collectible-contracts-footer'}>
        <Text style={styles.emptyText}>
          {strings('wallet.no_collectibles')}
        </Text>
        <TouchableOpacity
          onPress={goToAddCollectible}
          disabled={!isAddNFTEnabled}
          {...generateTestId(Platform, IMPORT_NFT_BUTTON_ID)}
        >
          <Text style={styles.addText}>
            {strings('wallet.add_collectibles')}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [goToAddCollectible, isAddNFTEnabled, styles],
  );

  const renderCollectibleContract = useCallback(
    (item, index) => {
      const contractCollectibles = collectibles?.filter((collectible) =>
        toLowerCaseEquals(collectible.address, item.address),
      );
      return (
        <CollectibleContractElement
          onPress={onItemPress}
          asset={item}
          key={item.address}
          contractCollectibles={contractCollectibles}
          collectiblesVisible={index === 0}
          toggleRemovingProgress={toggleRemovingProgress}
        />
      );
    },
    [collectibles, onItemPress],
  );

  const renderFavoriteCollectibles = useCallback(() => {
    const filteredCollectibles = favoriteCollectibles.map((collectible) =>
      collectibles.find(
        ({ tokenId, address }) =>
          compareTokenIds(collectible.tokenId, tokenId) &&
          collectible.address === address,
      ),
    );
    return (
      Boolean(filteredCollectibles.length) && (
        <CollectibleContractElement
          onPress={onItemPress}
          asset={{ name: 'Favorites', favorites: true }}
          key={'Favorites'}
          contractCollectibles={filteredCollectibles}
          collectiblesVisible
          toggleRemovingProgress={toggleRemovingProgress}
        />
      )
    );
  }, [favoriteCollectibles, collectibles, onItemPress]);

  const onRefresh = useCallback(async () => {
    requestAnimationFrame(async () => {
      setRefreshing(true);
      const { NftDetectionController, NftController } = Engine.context;
      const actions = [
        NftDetectionController.detectNfts(),
        NftController.checkAndUpdateAllNftsOwnershipStatus(),
      ];
      await Promise.all(actions);
      setRefreshing(false);
    });
  }, [setRefreshing]);

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

  const renderList = useCallback(
    () => (
      <FlatList
        ListHeaderComponent={
          <>
            {isCollectionDetectionBannerVisible && (
              <View style={styles.emptyView}>
                <CollectibleDetectionModal navigation={navigation} />
              </View>
            )}
            {renderFavoriteCollectibles()}
          </>
        }
        data={collectibleContracts}
        renderItem={({ item, index }) => renderCollectibleContract(item, index)}
        keyExtractor={(_, index) => index.toString()}
        refreshControl={
          <RefreshControl
            colors={[colors.primary.default]}
            tintColor={colors.icon.default}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={renderFooter()}
      />
    ),
    [
      renderFavoriteCollectibles,
      collectibleContracts,
      colors.primary.default,
      colors.icon.default,
      refreshing,
      onRefresh,
      renderCollectibleContract,
      renderFooter,
      renderEmpty,
      isCollectionDetectionBannerVisible,
      navigation,
      styles.emptyView,
    ],
  );

  return (
    <View
      style={styles.wrapper}
      {...generateTestId(Platform, NFT_TAB_CONTAINER_ID)}
    >
      {renderList()}
    </View>
  );
};

CollectibleContracts.propTypes = {
  /**
   * Network type
   */
  networkType: PropTypes.string,
  /**
   * Chain id
   */
  chainId: PropTypes.string,
  /**
   * Selected address
   */
  selectedAddress: PropTypes.string,
  /**
   * Array of collectibleContract objects
   */
  collectibleContracts: PropTypes.array,
  /**
   * Array of collectibles objects
   */
  collectibles: PropTypes.array,

  /**
   * Navigation object required to push
   * the Asset detail view
   */
  navigation: PropTypes.object,
  /**
   * Object of collectibles
   */
  favoriteCollectibles: PropTypes.array,
  /**
   * Dispatch remove collectible from favorites action
   */
  removeFavoriteCollectible: PropTypes.func,
  /**
   * Boolean to show if NFT detection is enabled
   */
  useNftDetection: PropTypes.bool,
  /**
   * Boolean to show if NFT detection is enabled
   */
  isIpfsGatewayEnabled: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  networkType: selectProviderType(state),
  chainId: selectChainId(state),
  selectedAddress: selectSelectedAddress(state),
  useNftDetection: selectUseNftDetection(state),
  collectibleContracts: collectibleContractsSelector(state),
  collectibles: collectiblesSelector(state),
  favoriteCollectibles: favoritesCollectiblesSelector(state),
  isIpfsGatewayEnabled: selectIsIpfsGatewayEnabled(state),
});

const mapDispatchToProps = (dispatch) => ({
  removeFavoriteCollectible: (selectedAddress, chainId, collectible) =>
    dispatch(removeFavoriteCollectible(selectedAddress, chainId, collectible)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CollectibleContracts);
