import React, { useCallback } from 'react';
import { Nft } from '@metamask/assets-controllers';
import { debounce } from 'lodash';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import CollectibleMedia from '../CollectibleMedia';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 5,
  },
  collectible: {
    aspectRatio: 1,
  },
  collectibleIcon: {
    aspectRatio: 1,
  },
});

const debouncedNavigation = debounce((navigation, collectible) => {
  navigation.navigate('NftDetails', { collectible });
}, 0);

const NftGridItem = ({
  item,
  onLongPress,
}: {
  item: Nft;
  onLongPress: (nft: Nft) => void;
}) => {
  const navigation = useNavigation();

  const onPress = useCallback(() => {
    debouncedNavigation(navigation, item);
  }, [navigation, item]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.collectible}
        onPress={onPress}
        onLongPress={() => onLongPress(item)}
        testID={`collectible-${item.name}-${item.tokenId}`}
      >
        <CollectibleMedia
          style={styles.collectibleIcon}
          collectible={item}
          isTokenImage
        />
      </TouchableOpacity>

      <Text
        variant={TextVariant.BodyMd}
        twClassName="mt-2 text-default"
        numberOfLines={1}
      >
        {item.name || '-'}
      </Text>

      {/* TODO: check if is better to use collection name from nft contract? */}
      <Text
        variant={TextVariant.BodySm}
        twClassName="text-alternative"
        numberOfLines={1}
      >
        {item.collection?.name}
      </Text>
    </View>
  );
};

export default NftGridItem;
