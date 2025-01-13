import React, { useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { connect, useSelector } from 'react-redux';
import { fontStyles } from '../../../styles/common';
import CollectibleMedia from '../CollectibleMedia';
import Device from '../../../util/device';
import ActionSheet from '@metamask/react-native-actionsheet';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { removeFavoriteCollectible } from '../../../actions/collectibles';
import {
  collectibleContractsSelector,
  collectiblesSelector,
} from '../../../reducers/collectibles';
import { useTheme } from '../../../util/theme';
import { selectChainId } from '../../../selectors/networkController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Text from '../../../component-library/components/Texts/Text';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../components/hooks/useMetrics';
import { getDecimalChainId } from '../../../util/networks';
import { Nft } from '@metamask/assets-controllers';

const DEVICE_WIDTH = Device.getDeviceWidth();
const COLLECTIBLE_WIDTH = (DEVICE_WIDTH - 100 - 16) / 3;

const createStyles = (colors, brandColors) =>
  StyleSheet.create({
    itemWrapper: {
      paddingHorizontal: 15,
      paddingBottom: 16,
    },
    collectibleContractIcon: { width: 30, height: 30 },
    collectibleContractIconContainer: { marginHorizontal: 8, borderRadius: 30 },
    titleContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    verticalAlignedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    titleText: {
      fontSize: 18,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    collectibleIcon: {
      width: '100%',
      aspectRatio: 1,
    },
    collectibleInTheMiddle: {
      marginHorizontal: 8,
    },
    collectiblesRowContainer: {
      flex: 1,
      flexDirection: 'row',
      marginTop: 15,
    },
    collectibleBox: {
      flex: 1,
      flexDirection: 'row',
    },
    favoritesLogoWrapper: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: brandColors.yellow500,
    },
  });

// const splitIntoSubArrays = (array, count) => {
//   const newArray = [];
//   while (array.length > 0) {
//     newArray.push(array.splice(0, count));
//   }
//   return newArray;
// };

/**
 * Customizable view to render assets in lists
 */
function NftGrid({
  asset,
  contractCollectibles,
  collectiblesVisible: propsCollectiblesVisible,
  onPress,
  collectibleContracts,
  chainId,
  selectedAddress,
  removeFavoriteCollectible,
}) {
  const collectibles = useSelector(collectiblesSelector);
  const [collectiblesGrid, setCollectiblesGrid] = useState([]);
  const actionSheetRef = useRef();
  const longPressedCollectible = useRef(null);
  const { colors, themeAppearance, brandColors } = useTheme();
  const styles = createStyles(colors, brandColors);
  const { trackEvent, createEventBuilder } = useMetrics();

  const onLongPressCollectible = useCallback((collectible) => {
    actionSheetRef.current.show();
    longPressedCollectible.current = collectible;
  }, []);

  const removeNft = () => {
    const { NftController } = Engine.context;
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

    NftController.addNft(
      longPressedCollectible.current.address,
      longPressedCollectible.current.tokenId,
    );
  };

  const handleMenuAction = (index) => {
    if (index === 1) {
      removeNft();
    } else if (index === 0) {
      refreshMetadata();
    }
  };

  //   const renderCollectible = useCallback(
  //     (collectible, index) => {
  //       if (!collectible) return null;
  //       const name =
  //         collectible.name ||
  //         collectibleContracts.find(
  //           ({ address }) => address === collectible.address,
  //         )?.name;
  //       const onPress = () => onPressCollectible({ ...collectible, name });
  //       const onLongPress = () =>
  //         !asset.favorites
  //           ? onLongPressCollectible({ ...collectible, name })
  //           : null;
  //       return (
  //         <View
  //           key={collectible.address + collectible.tokenId}
  //           styles={styles.collectibleBox}
  //           testID={`collectible-${collectible.name}-${collectible.tokenId}`}
  //         >
  //           <TouchableOpacity onPress={onPress} onLongPress={onLongPress}>
  //             <View style={index === 1 ? styles.collectibleInTheMiddle : {}}>
  //               <CollectibleMedia
  //                 style={styles.collectibleIcon}
  //                 collectible={{ ...collectible, name }}
  //                 onPressColectible={onPress}
  //                 isTokenImage
  //               />
  //             </View>
  //           </TouchableOpacity>
  //         </View>
  //       );
  //     },
  //     [
  //       asset.favorites,
  //       collectibleContracts,
  //       onPressCollectible,
  //       onLongPressCollectible,
  //       styles,
  //     ],
  //   );

  //   useEffect(() => {
  //     const temp = splitIntoSubArrays(contractCollectibles, 3);
  //     setCollectiblesGrid(temp);
  //   }, [contractCollectibles, setCollectiblesGrid]);

  console.log('Collectibles: ', collectibles[0]);

  return (
    <View style={styles.itemWrapper}>
      <ScrollView
        // eslint-disable-next-line react-native/no-inline-styles
        contentContainerStyle={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between', // Optional: Adjust spacing between items
        }}
      >
        {collectibles.map((collectible: Nft) => (
          <View
            key={collectible.address}
            // eslint-disable-next-line react-native/no-inline-styles
            style={{
              width: '30%',
              padding: 3,
              marginBottom: 10,
            }}
          >
            <CollectibleMedia
              style={styles.collectibleIcon}
              collectible={collectible}
              onPressColectible={onPress}
              isTokenImage
            />
            <Text numberOfLines={1} ellipsizeMode="tail">
              {collectible.name}
            </Text>
            <Text numberOfLines={1} ellipsizeMode="tail">
              {collectible.collection?.name}
            </Text>
          </View>
        ))}
      </ScrollView>
      {/* )} */}
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
        // eslint-disable-next-line react/jsx-no-bind
        onPress={handleMenuAction}
        theme={themeAppearance}
      />
    </View>
  );
}

export default NftGrid;

// CollectibleContractElement.propTypes = {
//   /**
//    * Object being rendered
//    */
//   asset: PropTypes.object,
//   /**
//    * Array of collectibles
//    */
//   contractCollectibles: PropTypes.array,
//   /**
//    * Whether the collectibles are visible or not
//    */
//   collectiblesVisible: PropTypes.bool,
//   /**
//    * Called when the collectible is pressed
//    */
//   onPress: PropTypes.func,
//   collectibleContracts: PropTypes.array,
//   /**
//    * Selected address
//    */
//   selectedAddress: PropTypes.string,
//   /**
//    * Chain id
//    */
//   chainId: PropTypes.string,
//   /**
//    * Dispatch remove collectible from favorites action
//    */
//   removeFavoriteCollectible: PropTypes.func,
// };

// const mapStateToProps = (state) => ({
//   collectibleContracts: collectibleContractsSelector(state),
//   chainId: selectChainId(state),
//   selectedAddress: selectSelectedInternalAccountFormattedAddress(state),
// });

// const mapDispatchToProps = (dispatch) => ({
//   removeFavoriteCollectible: (selectedAddress, chainId, collectible) =>
//     dispatch(removeFavoriteCollectible(selectedAddress, chainId, collectible)),
// });

// export default connect(
//   mapStateToProps,
//   mapDispatchToProps,
// )(CollectibleContractElement);
