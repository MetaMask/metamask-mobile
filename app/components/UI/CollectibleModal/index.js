import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import CollectibleOverview from '../../UI/CollectibleOverview';
import { connect } from 'react-redux';
import collectiblesTransferInformation from '../../../util/collectibles-transfer';
import { newAssetTransaction } from '../../../actions/transaction';
import CollectibleMedia from '../CollectibleMedia';
import { baseStyles, colors as importedColors } from '../../../styles/common';
import Device from '../../../util/device';
import ReusableModal from '../ReusableModal';
import Routes from '../../../constants/navigation/Routes.ts';

const styles = StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  round: {
    borderRadius: 12,
  },
  collectibleMediaWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    marginHorizontal: 16,
    marginTop: Device.hasNotch() ? 36 : 16,
    borderRadius: 12,
    backgroundColor: importedColors.transparent,
  },
});

/**
 * View that displays a specific collectible asset
 */
const CollectibleModal = (props) => {
  const { route, navigation, newAssetTransaction } = props;
  const { contractName, collectible } = route.params;

  const [mediaZIndex, setMediaZIndex] = useState(20);
  const [overviewZIndex, setOverviewZIndex] = useState(10);

  const onSend = useCallback(async () => {
    newAssetTransaction({ contractName, ...collectible });
    navigation.replace('SendFlowView');
  }, [contractName, collectible, newAssetTransaction, navigation]);

  const isTradable = useCallback(() => {
    // This might be deprecated
    const lowerAddress = collectible.address.toLowerCase();
    const tradable =
      lowerAddress in collectiblesTransferInformation
        ? collectiblesTransferInformation[lowerAddress].tradable
        : true;

    return tradable && collectible.standard === 'ERC721';
  }, [collectible]);

  const openLink = useCallback(
    (url) => {
      navigation.navigate(Routes.BROWSER_TAB_HOME, {
        screen: Routes.BROWSER_VIEW,
        params: {
          newTabUrl: url,
          timestamp: Date.now(),
        },
      });
    },
    [navigation],
  );

  /**
   * Method that moves the collectible media up or down in the screen depending on
   * the animation status, to be able to interact with videos
   *
   * @param {boolean} moveUp
   */
  const onCollectibleOverviewTranslation = (moveUp) => {
    if (moveUp) {
      setTimeout(() => {
        setMediaZIndex(20);
        setOverviewZIndex(10);
      }, 250);
    } else {
      setMediaZIndex(0);
      setOverviewZIndex(10);
    }
  };

  const modalRef = useRef(null);

  return (
    <ReusableModal ref={modalRef} style={styles.bottomModal}>
      <>
        <View
          style={[
            styles.collectibleMediaWrapper,
            { zIndex: mediaZIndex, elevation: mediaZIndex },
          ]}
        >
          <CollectibleMedia
            onClose={() => modalRef.current.dismissModal()}
            cover
            renderAnimation
            collectible={collectible}
            style={styles.round}
          />
        </View>
        <View
          style={[
            baseStyles.flexStatic,
            { zIndex: overviewZIndex, elevation: overviewZIndex },
          ]}
        >
          <CollectibleOverview
            navigation={navigation}
            collectible={{ ...collectible, contractName }}
            tradable={isTradable()}
            onSend={onSend}
            openLink={openLink}
            onTranslation={onCollectibleOverviewTranslation}
          />
        </View>
      </>
    </ReusableModal>
  );
};

CollectibleModal.propTypes = {
  /**
  /* navigation object required to access the props
  /* passed by the parent component
  */
  navigation: PropTypes.object,
  /**
   * Route contains props passed when navigating
   */
  route: PropTypes.object,
  /**
   * Start transaction with asset
   */
  newAssetTransaction: PropTypes.func,
  /**
   * Collectible being viewed on the modal
   */
  collectible: PropTypes.object,
  /**
   * Contract name of the collectible
   */
  contractName: PropTypes.string,
};

const mapDispatchToProps = (dispatch) => ({
  newAssetTransaction: (selectedAsset) =>
    dispatch(newAssetTransaction(selectedAsset)),
});

export default connect(null, mapDispatchToProps)(CollectibleModal);
