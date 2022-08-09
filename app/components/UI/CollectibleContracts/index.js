import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  InteractionManager,
  Image,
} from 'react-native';
import { connect, useDispatch, useSelector } from 'react-redux';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import CollectibleContractElement from '../CollectibleContractElement';
import Analytics from '../../../core/Analytics/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import {
  collectibleContractsSelector,
  collectiblesSelector,
} from '../../../reducers/collectibles';
import { setNftDetectionDismissed } from '../../../actions/user';
import Text from '../../Base/Text';
import AppConstants from '../../../core/AppConstants';
import { toLowerCaseEquals } from '../../../util/general';
import CollectibleDetectionModal from '../CollectibleDetectionModal';
import { isMainNet } from '../../../util/networks';
import { useTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      minHeight: 500,
      marginTop: 16,
    },
    emptyView: {
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10,
    },
    add: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addText: {
      fontSize: 14,
      color: colors.primary.default,
      ...fontStyles.normal,
    },
    footer: {
      flex: 1,
      paddingBottom: 30,
      alignItems: 'center',
      marginTop: 24,
    },
    emptyContainer: {
      flex: 1,
      marginBottom: 18,
      justifyContent: 'center',
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
const CollectibleContracts = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [isAddNFTEnabled, setIsAddNFTEnabled] = useState(true);

  const dispatch = useDispatch();

  const chainId = useSelector(
    (state) => state.engine.backgroundState.NetworkController.provider.chainId,
  );
  const useCollectibleDetection = useSelector(
    (state) =>
      state.engine.backgroundState.PreferencesController
        .useCollectibleDetection,
  );
  const nftDetectionDismissed = useSelector(
    (state) => state.user.nftDetectionDismissed,
  );
  const collectibleContracts = useSelector((state) =>
    collectibleContractsSelector(state),
  );
  const collectibles = useSelector((state) => collectiblesSelector(state));

  const onItemPress = useCallback(
    (collectible, contractName) => {
      navigation.navigate('CollectiblesDetails', { collectible, contractName });
    },
    [navigation],
  );

  const goToAddCollectible = () => {
    setIsAddNFTEnabled(false);
    navigation.push('AddAsset', { assetType: 'collectible' });
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_ADD_COLLECTIBLES);
      setIsAddNFTEnabled(true);
    });
  };

  const renderFooter = () => (
    <View style={styles.footer} key={'collectible-contracts-footer'}>
      <Text style={styles.emptyText}>{strings('wallet.no_collectibles')}</Text>
      <TouchableOpacity
        style={styles.add}
        onPress={goToAddCollectible}
        disabled={!isAddNFTEnabled}
        testID={'add-collectible-button'}
      >
        <Text style={styles.addText}>{strings('wallet.add_collectibles')}</Text>
      </TouchableOpacity>
    </View>
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
    const filteredCollectibles = collectibles.filter(
      ({ favorite }) => favorite,
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
  }, [collectibles, onItemPress]);

  const renderList = useCallback(
    () => (
      <View>
        {renderFavoriteCollectibles()}
        <View>
          {collectibleContracts?.map((item, index) =>
            renderCollectibleContract(item, index),
          )}
        </View>
      </View>
    ),
    [
      collectibleContracts,
      renderFavoriteCollectibles,
      renderCollectibleContract,
    ],
  );

  const goToLearnMore = () =>
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: { url: AppConstants.URLS.NFT },
    });

  const dismissNftInfo = async () => {
    dispatch(setNftDetectionDismissed(true));
  };

  const renderEmpty = () => (
    <View style={styles.emptyView}>
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
    </View>
  );

  return (
    <View style={styles.wrapper} testID={'collectible-contracts'}>
      {isMainNet(chainId) &&
        !nftDetectionDismissed &&
        !useCollectibleDetection && (
          <View style={styles.emptyView}>
            <CollectibleDetectionModal
              onDismiss={dismissNftInfo}
              navigation={navigation}
            />
          </View>
        )}
      {collectibleContracts.length > 0 ? renderList() : renderEmpty()}
      {renderFooter()}
    </View>
  );
};

CollectibleContracts.propTypes = {
  /**
   * Navigation object required to push
   * the Asset detail view
   */
  navigation: PropTypes.object,
};

const mapDispatchToProps = (dispatch) => ({
  setNftDetectionDismissed: () => dispatch(setNftDetectionDismissed()),
});

export default connect(mapDispatchToProps)(CollectibleContracts);
