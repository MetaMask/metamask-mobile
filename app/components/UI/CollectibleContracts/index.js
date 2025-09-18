import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { connect, useSelector } from 'react-redux';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import CollectibleContractElement from '../CollectibleContractElement';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  favoritesCollectiblesSelector,
  isNftFetchingProgressSelector,
  multichainCollectibleContractsSelector,
  multichainCollectiblesSelector,
  multichainCollectiblesByEnabledNetworksSelector,
  multichainCollectibleContractsByEnabledNetworksSelector,
} from '../../../reducers/collectibles';
import { removeFavoriteCollectible } from '../../../actions/collectibles';
import AppConstants from '../../../core/AppConstants';
import { areAddressesEqual } from '../../../util/address';
import { compareTokenIds } from '../../../util/tokens';
import CollectibleDetectionModal from '../CollectibleDetectionModal';
import { useTheme } from '../../../util/theme';
import { MAINNET } from '../../../constants/network';
import {
  selectChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectProviderType,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import {
  selectDisplayNftMedia,
  selectIsIpfsGatewayEnabled,
  selectTokenNetworkFilter,
  selectUseNftDetection,
} from '../../../selectors/preferencesController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { RefreshTestId, SpinnerTestId } from './constants';
import { debounce, cloneDeep } from 'lodash';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import {
  getDecimalChainId,
  isRemoveGlobalNetworkSelectorEnabled,
  getNetworkImageSource,
} from '../../../util/networks';
import { createTokenBottomSheetFilterNavDetails } from '../Tokens/TokensBottomSheet';
import { createNetworkManagerNavDetails } from '../NetworkManager';
import { useNftDetectionChainIds } from '../../hooks/useNftDetectionChainIds';
import Logger from '../../../util/Logger';
import { prepareNftDetectionEvents } from '../../../util/assets';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { useCurrentNetworkInfo } from '../../hooks/useCurrentNetworkInfo';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import TextComponent, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      marginTop: 16,
    },
    BarWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    actionBarWrapper: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 8,
    },
    controlButtonOuterWrapper: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
    },
    text: {
      fontSize: 20,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    controlButtonText: {
      color: colors.text.default,
    },
    controlButton: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.muted,
      marginRight: 4,
      borderWidth: isRemoveGlobalNetworkSelectorEnabled() ? 1 : 0,
      borderRadius: isRemoveGlobalNetworkSelectorEnabled() ? 8 : 0,
      maxWidth: isRemoveGlobalNetworkSelectorEnabled() ? '80%' : '60%',
      paddingHorizontal: isRemoveGlobalNetworkSelectorEnabled() ? 12 : 0,
    },
    controlButtonDisabled: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.muted,
      marginRight: 4,
      borderWidth: isRemoveGlobalNetworkSelectorEnabled() ? 1 : 0,
      borderRadius: isRemoveGlobalNetworkSelectorEnabled() ? 8 : 0,
      maxWidth: isRemoveGlobalNetworkSelectorEnabled() ? '80%' : '60%',
      paddingHorizontal: isRemoveGlobalNetworkSelectorEnabled() ? 12 : 0,
      opacity: 0.5,
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
    networkManagerWrapper: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
  });

const debouncedNavigation = debounce((navigation, collectible) => {
  navigation.navigate('NftDetails', { collectible });
}, 200);

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
  // Start tracing component loading
  const isFirstRender = useRef(true);

  if (isFirstRender.current) {
    trace({ name: TraceName.CollectibleContractsComponent });
  }

  const isAllNetworks = useSelector(selectIsAllNetworks);
  const allNetworks = useSelector(selectNetworkConfigurations);
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);
  const collectibleContractsByEnabledNetworks = useSelector(
    multichainCollectibleContractsByEnabledNetworksSelector,
  );
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const { enabledNetworks, getNetworkInfo, isDisabled } =
    useCurrentNetworkInfo();

  const currentNetworkName = getNetworkInfo(0)?.networkName;

  const collectiblesByEnabledNetworks = useSelector(
    multichainCollectiblesByEnabledNetworksSelector,
  );

  const allNetworkClientIds = useMemo(
    () =>
      Object.keys(tokenNetworkFilter).flatMap((chainId) => {
        if (isNonEvmChainId(chainId)) return [];
        const entry = allNetworks[chainId];
        if (!entry) {
          return [];
        }
        const index = entry.defaultRpcEndpointIndex;
        const endpoint = entry.rpcEndpoints[index];
        return endpoint?.networkClientId ? [endpoint.networkClientId] : [];
      }),
    [tokenNetworkFilter, allNetworks],
  );

  const filteredCollectibleContracts = useMemo(() => {
    let contracts = {};
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      contracts = Object.values(collectibleContractsByEnabledNetworks).flat();
    } else {
      contracts = isAllNetworks
        ? Object.values(collectibleContracts).flat()
        : collectibleContracts[chainId] || [];
    }
    trace({ name: TraceName.LoadCollectibles, id: 'contracts' });
    endTrace({ name: TraceName.LoadCollectibles, id: 'contracts' });

    return contracts;
  }, [
    collectibleContracts,
    chainId,
    isAllNetworks,
    collectibleContractsByEnabledNetworks,
  ]);

  const filteredCollectibles = useMemo(() => {
    trace({ name: TraceName.LoadCollectibles });
    let collectibles = [];
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      collectibles = Object.values(collectiblesByEnabledNetworks).flat();
    } else {
      collectibles = isAllNetworks
        ? Object.values(allCollectibles).flat()
        : allCollectibles[chainId] || [];
    }
    endTrace({ name: TraceName.LoadCollectibles });
    return collectibles;
  }, [allCollectibles, chainId, isAllNetworks, collectiblesByEnabledNetworks]);

  const collectibles = filteredCollectibles.filter(
    (singleCollectible) => singleCollectible.isCurrentlyOwned === true,
  );

  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(colors);
  const [isAddNFTEnabled, setIsAddNFTEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const networkName = useSelector(selectNetworkName);
  const chainIdsToDetectNftsFor = useNftDetectionChainIds();
  const { areAllNetworksSelected } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });

  const showFilterControls = () => {
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      navigation.navigate(...createNetworkManagerNavDetails({}));
    } else {
      navigation.navigate(...createTokenBottomSheetFilterNavDetails({}));
    }
  };

  const isCollectionDetectionBannerVisible =
    networkType === MAINNET && !useNftDetection;

  const onItemPress = useCallback(
    (collectible) => {
      debouncedNavigation(navigation, collectible);
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
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_ADD_COLLECTIBLES).build(),
    );
    setIsAddNFTEnabled(true);
  }, [navigation, trackEvent, createEventBuilder]);

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

        <TextComponent style={styles.emptyText}>
          {strings('wallet.no_collectibles')}
        </TextComponent>
        <TouchableOpacity
          onPress={goToAddCollectible}
          disabled={!isAddNFTEnabled}
          testID={WalletViewSelectorsIDs.IMPORT_NFT_BUTTON}
        >
          <TextComponent style={styles.addText}>
            {strings('wallet.add_collectibles')}
          </TextComponent>
        </TouchableOpacity>
      </View>
    ),
    [goToAddCollectible, isAddNFTEnabled, styles, isNftFetchingProgress],
  );

  const renderCollectibleContract = useCallback(
    (item, index) => {
      const contractCollectibles = collectibles?.filter((collectible) =>
        areAddressesEqual(collectible.address, item.address),
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

  const getNftDetectionAnalyticsParams = useCallback((nft) => {
    try {
      return {
        chain_id: getDecimalChainId(nft.chainId),
        source: 'detected',
      };
    } catch (error) {
      Logger.error(
        error,
        'CollectibleContracts.getNftDetectionAnalyticsParams',
      );
      return undefined;
    }
  }, []);

  const onRefresh = useCallback(async () => {
    requestAnimationFrame(async () => {
      // Get initial state of NFTs before refresh
      const { NftDetectionController, NftController } = Engine.context;
      const previousNfts = cloneDeep(
        NftController.state.allNfts[selectedAddress.toLowerCase()],
      );
      trace({ name: TraceName.DetectNfts });

      setRefreshing(true);

      const actions = [
        NftDetectionController.detectNfts(chainIdsToDetectNftsFor),
      ];
      allNetworkClientIds.forEach((networkClientId) => {
        actions.push(
          NftController.checkAndUpdateAllNftsOwnershipStatus(networkClientId),
        );
      });

      await Promise.allSettled(actions);
      setRefreshing(false);
      endTrace({ name: TraceName.DetectNfts });

      // Get updated state after refresh
      const newNfts = cloneDeep(
        NftController.state.allNfts[selectedAddress.toLowerCase()],
      );

      const eventParams = prepareNftDetectionEvents(
        previousNfts,
        newNfts,
        getNftDetectionAnalyticsParams,
      );
      eventParams.forEach((params) => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.COLLECTIBLE_ADDED)
            .addProperties(params)
            .build(),
        );
      });
    });
  }, [
    chainIdsToDetectNftsFor,
    createEventBuilder,
    getNftDetectionAnalyticsParams,
    selectedAddress,
    trackEvent,
    allNetworkClientIds,
  ]);

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
        <TextComponent center style={styles.emptyTitleText} bold>
          {strings('wallet.no_nfts_yet')}
        </TextComponent>
        <TextComponent center big link onPress={goToLearnMore}>
          {strings('wallet.learn_more')}
        </TextComponent>
      </View>
    ),
    [goToLearnMore, styles],
  );

  const renderList = useCallback(
    () => (
      <FlashList
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
        data={filteredCollectibleContracts}
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
        estimatedItemSize={100}
        scrollEnabled={false}
      />
    ),
    [
      renderFavoriteCollectibles,
      filteredCollectibleContracts,
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

  // TODO: Placeholder variable for now until we update the network enablement controller
  const firstEnabledChainId = enabledNetworks[0]?.chainId || '';
  const networkImageSource = getNetworkImageSource({
    chainId: firstEnabledChainId,
  });

  // End trace when component has finished initial loading
  useEffect(() => {
    endTrace({ name: TraceName.CollectibleContractsComponent });
    isFirstRender.current = false;
  }, []);

  return (
    <View
      style={styles.BarWrapper}
      testID={WalletViewSelectorsIDs.NFT_TAB_CONTAINER}
    >
      <View style={styles.actionBarWrapper}>
        <View style={styles.controlButtonOuterWrapper}>
          <ButtonBase
            testID={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
            label={
              <>
                {isRemoveGlobalNetworkSelectorEnabled() ? (
                  <View style={styles.networkManagerWrapper}>
                    {!areAllNetworksSelected && (
                      <Avatar
                        variant={AvatarVariant.Network}
                        size={AvatarSize.Xs}
                        name={networkName}
                        imageSource={networkImageSource}
                      />
                    )}
                    <TextComponent
                      variant={TextVariant.BodyMDMedium}
                      style={styles.controlButtonText}
                      numberOfLines={1}
                    >
                      {enabledNetworks.length > 1
                        ? strings('wallet.all_networks')
                        : currentNetworkName ??
                          strings('wallet.current_network')}
                    </TextComponent>
                  </View>
                ) : (
                  <TextComponent
                    variant={TextVariant.BodyMDMedium}
                    style={styles.controlButtonText}
                    numberOfLines={1}
                  >
                    {isAllNetworks && isPopularNetwork && isEvmSelected
                      ? strings('wallet.popular_networks')
                      : networkName ?? strings('wallet.current_network')}
                  </TextComponent>
                )}
              </>
            }
            isDisabled={isDisabled}
            onPress={
              isEvmSelected || isMultichainAccountsState2Enabled
                ? showFilterControls
                : () => null
            }
            endIconName={
              isEvmSelected || isMultichainAccountsState2Enabled
                ? IconName.ArrowDown
                : undefined
            }
            style={
              isDisabled ? styles.controlButtonDisabled : styles.controlButton
            }
            disabled={isDisabled}
          />
        </View>
      </View>
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

const mapStateToProps = (state) => {
  const selectedAddress = selectSelectedInternalAccountFormattedAddress(state);
  const collectiblesData = multichainCollectiblesSelector(state);
  const collectibleContractsData =
    multichainCollectibleContractsSelector(state);

  return {
    networkType: selectProviderType(state),
    chainId: selectChainId(state),
    selectedAddress,
    useNftDetection: selectUseNftDetection(state),
    collectibleContracts: Array.isArray(collectibleContractsData)
      ? collectibleContractsData
      : [],
    collectibles: Array.isArray(collectiblesData) ? collectiblesData : [],
    isNftFetchingProgress: isNftFetchingProgressSelector(state),
    favoriteCollectibles: favoritesCollectiblesSelector(state),
    isIpfsGatewayEnabled: selectIsIpfsGatewayEnabled(state),
    displayNftMedia: selectDisplayNftMedia(state),
  };
};

const mapDispatchToProps = (dispatch) => ({
  removeFavoriteCollectible: (selectedAddress, chainId, collectible) =>
    dispatch(removeFavoriteCollectible(selectedAddress, chainId, collectible)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CollectibleContracts);
