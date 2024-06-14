import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Image,
  Platform,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { connect } from 'react-redux';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import CollectibleContractElement from '../CollectibleContractElement';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  collectibleContractsSelector,
  collectiblesSelector,
  favoritesCollectiblesSelector,
  isNftFetchingProgressSelector,
} from '../../../reducers/collectibles';
import { removeFavoriteCollectible } from '../../../actions/collectibles';
import Text from '../../Base/Text';
import AppConstants from '../../../core/AppConstants';
import { toLowerCaseEquals } from '../../../util/general';
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
  selectDisplayNftMedia,
  selectIsIpfsGatewayEnabled,
  selectUseNftDetection,
} from '../../../selectors/preferencesController';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../selectors/accountsController';
import {
  IMPORT_NFT_BUTTON_ID,
  NFT_TAB_CONTAINER_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { RefreshTestId, SpinnerTestId } from './constants';

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
    spinner: {
      marginBottom: 8,
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
  isNftFetchingProgress,
  favoriteCollectibles,
  removeFavoriteCollectible,
  useNftDetection,
  isIpfsGatewayEnabled,
  displayNftMedia,
}) => {
  const collectibles = allCollectibles.filter(
    (singleCollectible) => singleCollectible.isCurrentlyOwned === true,
  );
  const { colors } = useTheme();
  const { trackEvent } = useMetrics();
  const styles = createStyles(colors);
  const [isAddNFTEnabled, setIsAddNFTEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const updateAllCollectibleMetadata = useCallback(
    async (collectibles) => {
      const { NftController } = Engine.context;
      // Filter out ignored collectibles
      const filteredcollectibles = collectibles.filter(
        (collectible) => !isCollectibleIgnored(collectible),
      );

      // filter removable collectible
      const removable = filteredcollectibles.filter((single) =>
        String(single.tokenId).includes('e+'),
      );
      const updatable = filteredcollectibles.filter(
        (single) => !String(single.tokenId).includes('e+'),
      );

      removable.forEach((elm) => {
        removeFavoriteCollectible(selectedAddress, chainId, elm);
      });

      filteredcollectibles.forEach((collectible) => {
        if (String(collectible.tokenId).includes('e+')) {
          removeFavoriteCollectible(selectedAddress, chainId, collectible);
        }
      });

      if (updatable.length !== 0) {
        await NftController.updateNftMetadata({
          nfts: updatable,
          userAddress: selectedAddress,
        });
      }
    },
    [isCollectibleIgnored, removeFavoriteCollectible, chainId, selectedAddress],
  );

  useEffect(() => {
    if (!isIpfsGatewayEnabled && !displayNftMedia) {
      return;
    }
    // TO DO: Move this fix to the controllers layer
    const updatableCollectibles = collectibles.filter((single) =>
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

  const goToAddCollectible = useCallback(() => {
    setIsAddNFTEnabled(false);
    navigation.push('AddAsset', { assetType: 'collectible' });
    trackEvent(MetaMetricsEvents.WALLET_ADD_COLLECTIBLES);
    setIsAddNFTEnabled(true);
  }, [navigation, trackEvent]);

  const renderFooter = useCallback(
    () => (
      <View style={styles.footer} key={'collectible-contracts-footer'}>
        {isNftFetchingProgress ? (
          <ActivityIndicator
            size="large"
            style={styles.spinner}
            testID={SpinnerTestId}
          />
        ) : null}

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
    [goToAddCollectible, isAddNFTEnabled, styles, isNftFetchingProgress],
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
                <CollectibleDetectionModal />
              </View>
            )}
            {renderFavoriteCollectibles()}
          </>
        }
        data={collectibleContracts}
        renderItem={({ item, index }) => renderCollectibleContract(item, index)}
        keyExtractor={(_, index) => index.toString()}
        testID={RefreshTestId}
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
   * boolean indicating if fetching status is
   * still in progress
   */
  isNftFetchingProgress: PropTypes.bool,
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
   * Boolean to show content stored on IPFS
   */
  isIpfsGatewayEnabled: PropTypes.bool,
  /**
   * Boolean to show Nfts media stored on third parties
   */
  displayNftMedia: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  networkType: selectProviderType(state),
  chainId: selectChainId(state),
  selectedAddress: selectSelectedInternalAccountChecksummedAddress(state),
  useNftDetection: selectUseNftDetection(state),
  collectibleContracts: collectibleContractsSelector(state),
  collectibles: collectiblesSelector(state),
  isNftFetchingProgress: isNftFetchingProgressSelector(state),
  favoriteCollectibles: favoritesCollectiblesSelector(state),
  isIpfsGatewayEnabled: selectIsIpfsGatewayEnabled(state),
  displayNftMedia: selectDisplayNftMedia(state),
});

const mapDispatchToProps = (dispatch) => ({
  removeFavoriteCollectible: (selectedAddress, chainId, collectible) =>
    dispatch(removeFavoriteCollectible(selectedAddress, chainId, collectible)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CollectibleContracts);
