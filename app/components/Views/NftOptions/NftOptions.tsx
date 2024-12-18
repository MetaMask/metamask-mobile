import { useNavigation } from '@react-navigation/native';
import React, { useRef } from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../component-library/hooks';
import { strings } from '../../../../locales/i18n';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { selectChainId } from '../../../selectors/networkController';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import styleSheet from './NftOptions.styles';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import Engine from '../../../core/Engine';
import { removeFavoriteCollectible } from '../../../actions/collectibles';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { Collectible } from '../../../components/UI/CollectibleMedia/CollectibleMedia.types';
import Routes from '../../../constants/navigation/Routes';
import {
  useMetrics,
  MetaMetricsEvents,
} from '../../../components/hooks/useMetrics';
import { getDecimalChainId } from '../../../util/networks';

interface Props {
  route: {
    params: {
      collectible: Collectible;
    };
  };
}

const NftOptions = (props: Props) => {
  const { collectible } = props.route.params;
  const { styles } = useStyles(styleSheet, {});
  const safeAreaInsets = useSafeAreaInsets();
  const navigation = useNavigation();
  const modalRef = useRef<ReusableModalRef>(null);
  const chainId = useSelector(selectChainId);
  const { trackEvent, createEventBuilder } = useMetrics();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const goToWalletPage = () => {
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
  };

  const goToBrowserUrl = (url: string) => {
    modalRef.current?.dismissModal(() => {
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url,
        },
      });
    });
  };

  const getOpenSeaLink = () => {
    switch (chainId) {
      case CHAIN_IDS.MAINNET:
        return `https://opensea.io/assets/ethereum/${collectible.address}/${collectible.tokenId}`;
      case CHAIN_IDS.POLYGON:
        return `https://opensea.io/assets/matic/${collectible.address}/${collectible.tokenId}`;
      case CHAIN_IDS.GOERLI:
        return `https://testnets.opensea.io/assets/goerli/${collectible.address}/${collectible.tokenId}`;
      case CHAIN_IDS.SEPOLIA:
        return `https://testnets.opensea.io/assets/sepolia/${collectible.address}/${collectible.tokenId}`;
      default:
        return null;
    }
  };

  const gotToOpensea = () => {
    const url = getOpenSeaLink();
    if (url) {
      goToBrowserUrl(url);
    }
  };

  const removeNft = () => {
    const { NftController } = Engine.context;
    removeFavoriteCollectible(selectedAddress, chainId, collectible);
    NftController.removeAndIgnoreNft(
      collectible.address,
      collectible.tokenId.toString(),
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
    // Redirect to home after removing NFT
    goToWalletPage();
  };

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <View style={[styles.sheet, { paddingBottom: safeAreaInsets.bottom }]}>
        <View style={styles.notch} />
        <View>
          {getOpenSeaLink() !== null ? (
            <TouchableOpacity
              style={styles.optionButton}
              onPress={gotToOpensea}
            >
              <Icon name={IconName.Export} style={styles.iconOs} />
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {strings('nft_details.options.view_on_os')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View>
          <TouchableOpacity style={styles.optionButton} onPress={removeNft}>
            <Icon name={IconName.Trash} style={styles.iconTrash} />
            <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
              {strings('nft_details.options.remove_nft')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ReusableModal>
  );
};

export default NftOptions;
