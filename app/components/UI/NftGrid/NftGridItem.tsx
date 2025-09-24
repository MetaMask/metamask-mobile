import React, { useCallback, useRef } from 'react';
import { Nft } from '@metamask/assets-controllers';
import { debounce } from 'lodash';
import { useNavigation } from '@react-navigation/native';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import ActionSheet from '@metamask/react-native-actionsheet';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import Engine from '../../../core/Engine';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { getDecimalChainId } from '../../../util/networks';
import {
  selectChainId,
  selectSelectedNetworkClientId,
} from '../../../selectors/networkController';
import { useSelector } from 'react-redux';
import NftGridMedia from './NftGridMedia';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 5,
  },
  collectible: {
    aspectRatio: 1,
  },
});

const debouncedNavigation = debounce((navigation, collectible) => {
  navigation.navigate('NftDetails', { collectible });
}, 200);

const NftGridItem = ({ item }: { item: Nft }) => {
  const { themeAppearance } = useTheme();
  const navigation = useNavigation();
  const actionSheetRef = useRef<typeof ActionSheet>();
  const chainId = useSelector(selectChainId);
  const longPressedCollectible = useRef<Nft | null>(null);
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);

  const { trackEvent, createEventBuilder } = useMetrics();

  const onPress = useCallback(() => {
    debouncedNavigation(navigation, item);
  }, [navigation, item]);

  const onLongPress = useCallback(() => {
    actionSheetRef.current.show();
    longPressedCollectible.current = item;
  }, [item]);

  const removeNft = () => {
    if (!longPressedCollectible.current) return;

    const { NftController } = Engine.context;

    NftController.removeAndIgnoreNft(
      longPressedCollectible.current.address,
      longPressedCollectible.current.tokenId,
      selectedNetworkClientId,
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
    if (!longPressedCollectible.current) return;

    const { NftController } = Engine.context;

    NftController.addNft(
      longPressedCollectible.current.address,
      longPressedCollectible.current.tokenId,
      selectedNetworkClientId,
    );
  };

  const handleMenuAction = (index: number) => {
    if (index === 1) {
      removeNft();
    } else if (index === 0) {
      refreshMetadata();
    }
  };

  return (
    <View key={item.address + item.tokenId} style={styles.container}>
      <TouchableOpacity
        style={styles.collectible}
        onPress={onPress}
        onLongPress={onLongPress}
        testID={`collectible-${item.name}-${item.tokenId}`}
      >
        {/* Change after looking at collectiblemedia */}
        <NftGridMedia image={item.image} chainId={chainId} />
      </TouchableOpacity>

      <Text
        variant={TextVariant.BodyMd}
        twClassName="mt-2 text-default"
        numberOfLines={1}
      >
        {item.name}
      </Text>

      {/* TODO: check if is better to use collection name from nft contract? */}
      <Text
        variant={TextVariant.BodySm}
        twClassName="text-alternative"
        numberOfLines={1}
      >
        {item.collection?.name}
      </Text>

      {/* TODO juan move this one level up to avoid re-rendering it multiple times */}
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
};

export default NftGridItem;
