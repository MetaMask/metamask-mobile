import React, { useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import CollectibleMedia from '../CollectibleMedia';
import ActionSheet from '@metamask/react-native-actionsheet';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { removeFavoriteCollectible } from '../../../actions/collectibles';
import {
  collectiblesSelector,
  isNftFetchingProgressSelector,
} from '../../../reducers/collectibles';
import { useTheme } from '../../../util/theme';
import Text from '../../../component-library/components/Texts/Text';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../components/hooks/useMetrics';
import { getDecimalChainId } from '../../../util/networks';
import { Nft } from '@metamask/assets-controllers';
import { debounce } from 'lodash';
import styleSheet from './NftGrid.styles';
import { useStyles } from '../../hooks/useStyles';
import { StackNavigationProp } from '@react-navigation/stack';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import CollectibleDetectionModal from '../CollectibleDetectionModal';
import { selectUseNftDetection } from '../../../selectors/preferencesController';

const debouncedNavigation = debounce((navigation, collectible) => {
  navigation.navigate('NftDetails', { collectible });
}, 200);

interface ActionSheetType {
  show: () => void;
}

interface LongPressedCollectibleType {
  address: string;
  tokenId: string;
}

interface NftGridNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

interface NftGridProps {
  navigation: StackNavigationProp<NftGridNavigationParamList, 'AddAsset'>;
  chainId: string;
  selectedAddress: string;
}

function NftGrid({ navigation, chainId, selectedAddress }: NftGridProps) {
  const collectibles = useSelector(collectiblesSelector);
  const isNftFetchingProgress = useSelector(isNftFetchingProgressSelector);
  const isNftDetectionEnabled = useSelector(selectUseNftDetection);
  const actionSheetRef = useRef<ActionSheetType>(null);
  const longPressedCollectible = useRef<LongPressedCollectibleType | null>(
    null,
  );
  const { themeAppearance } = useTheme();
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();

  const onLongPressCollectible = useCallback((collectible) => {
    actionSheetRef?.current?.show();
    longPressedCollectible.current = collectible;
  }, []);

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

  const handleMenuAction = (index: number) => {
    if (index === 1) {
      removeNft();
    } else if (index === 0) {
      refreshMetadata();
    }
  };

  const onItemPress = useCallback(
    (collectible) => {
      debouncedNavigation(navigation, collectible);
    },
    [navigation],
  );

  return (
    <View style={styles.itemWrapper} testID="collectible-contracts">
      {!isNftDetectionEnabled && <CollectibleDetectionModal />}
      {/* fetching state */}
      {isNftFetchingProgress && (
        <ActivityIndicator
          size="large"
          style={styles.spinner}
          // testID={SpinnerTestId}
        />
      )}
      {/* empty state */}
      {!isNftFetchingProgress && collectibles.length === 0 && (
        <View>
          <Image
            // style={styles.emptyImageContainer}
            source={require('../../../images/no-nfts-placeholder.png')}
            // resizeMode={'contain'}
          />
          <Text>Foo</Text>
        </View>
        // <View style={styles.emptyContainer}>
        //   <Image
        //     style={styles.emptyImageContainer}
        //     source={require('../../../images/no-nfts-placeholder.png')}
        //     resizeMode={'contain'}
        //   />
        //   <Text style={styles.emptyTitleText}>
        //     {strings('wallet.no_nfts_yet')}
        //   </Text>
        //   <Text
        //     // onPress={goToLearnMore}
        //     onPress={() => console.log('goToLearnMore')}
        //   >
        //     {strings('wallet.learn_more')}
        //   </Text>
        // </View>
        // <Text style={styles.emptyText}>
        //   {strings('wallet.no_collectibles')}
        // </Text>
      )}
      {!isNftFetchingProgress && collectibles.length > 0 && (
        <ScrollView contentContainerStyle={styles.contentContainerStyles}>
          {collectibles.map((collectible: Nft) => {
            if (!collectible) return null;
            return (
              <TouchableOpacity
                key={collectible.address}
                style={styles.collectibleCard}
                onPress={() => onItemPress(collectible)}
                onLongPress={() => onLongPressCollectible(collectible)}
                testID={collectible.name as string}
              >
                <CollectibleMedia
                  style={styles.collectibleIcon}
                  collectible={collectible}
                  isTokenImage
                />
                <Text numberOfLines={1} ellipsizeMode="tail">
                  {collectible.name}
                </Text>
                <Text numberOfLines={1} ellipsizeMode="tail">
                  {collectible.collection?.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      {!isNftFetchingProgress && (
        <View style={styles.footer} key={'collectible-contracts-footer'}>
          {/* additional actions. this may move to a control bar header */}
          <TouchableOpacity
            onPress={() =>
              navigation.push('AddAsset', { assetType: 'collectible' })
            }
            disabled={false}
            testID={WalletViewSelectorsIDs.IMPORT_NFT_BUTTON}
          >
            <Text>{strings('wallet.add_collectibles')}</Text>
          </TouchableOpacity>
        </View>
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
