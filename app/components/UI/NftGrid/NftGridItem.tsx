import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  FlatList,
  RefreshControl,
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
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
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
import ButtonLink from '../../../component-library/components/Buttons/Button/variants/ButtonLink';
import AppConstants from '../../../core/AppConstants';
import {
  RefreshTestId,
  SpinnerTestId,
} from '../CollectibleContracts/constants';

const noNftPlaceholderSrc = require('../../../images/no-nfts-placeholder.png');

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

function NftGridItem({
  nft,
  navigation,
}: {
  nft: Nft;
  navigation: StackNavigationProp<NftGridNavigationParamList, 'AddAsset'>;
}) {
  const actionSheetRef = useRef<ActionSheetType>(null);
  const longPressedCollectible = useRef<LongPressedCollectibleType | null>(
    null,
  );
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();

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
    (nftItem) => {
      debouncedNavigation(navigation, nftItem);
    },
    [navigation],
  );

  if (!nft) return null;
  return (
    <TouchableOpacity
      key={nft.address}
      style={styles.collectibleCard}
      onPress={() => onItemPress(nft)}
      onLongPress={() => onLongPressCollectible(nft)}
      testID={nft.name as string}
    >
      <CollectibleMedia
        style={styles.collectibleIcon}
        collectible={nft}
        isTokenImage
      />
      <Text numberOfLines={1} ellipsizeMode="tail">
        {nft.name}
      </Text>
      <Text numberOfLines={1} ellipsizeMode="tail">
        {nft.collection?.name}
      </Text>
    </TouchableOpacity>
  );
}

export default NftGrid;
