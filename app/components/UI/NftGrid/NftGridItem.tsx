import React, { useCallback, useEffect, useState } from 'react';
import { Nft } from '@metamask/assets-controllers';
import { debounce } from 'lodash';
import { useNavigation } from '@react-navigation/native';
import { Pressable } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import CollectibleMedia from '../CollectibleMedia';
import { Skeleton } from '../../../component-library/components-temp/Skeleton';

const debouncedNavigation = debounce((navigation, collectible, source) => {
  navigation.navigate('NftDetails', { collectible, source });
}, 0);

const NftGridItem = ({
  item,
  onLongPress,
  source,
}: {
  item: Nft;
  onLongPress: (nft: Nft) => void;
  source?: 'mobile-nft-list' | 'mobile-nft-list-page';
}) => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const [isImageLoading, setIsImageLoading] = useState(
    () => !!(item.image || item.imageOriginal),
  );

  useEffect(() => {
    setIsImageLoading(!!(item.image || item.imageOriginal));
  }, [item.address, item.tokenId, item.image, item.imageOriginal]);

  const onPress = useCallback(() => {
    debouncedNavigation(navigation, item, source);
  }, [navigation, item, source]);

  const handleImageLoad = useCallback(() => setIsImageLoading(false), []);

  return (
    <Pressable
      style={tw.style('self-stretch mb-3')}
      onPress={onPress}
      onLongPress={() => onLongPress(item)}
      testID={`collectible-${item.name}-${item.tokenId}`}
    >
      <Box twClassName="self-stretch aspect-square">
        <CollectibleMedia
          style={tw.style('self-stretch aspect-square')}
          collectible={item}
          isTokenImage
          onLoad={handleImageLoad}
        />
        {isImageLoading && (
          <Skeleton twClassName="absolute inset-0 rounded-lg" />
        )}
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName="mt-2 text-default"
        numberOfLines={1}
      >
        {item.name || '-'}
      </Text>

      {/* TODO: check if is better to use collection name from nft contract? */}
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        twClassName="text-alternative"
        numberOfLines={1}
      >
        {item.collection?.name}
      </Text>
    </Pressable>
  );
};

export default NftGridItem;
