import { Nft } from '@metamask/assets-controllers';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import CollectibleMedia from '../../../../UI/CollectibleMedia';
import { useNft } from '../../hooks/nft/useNft';
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';
import useNetworkInfo from '../../hooks/useNetworkInfo';
import { Hero } from '../UI/hero';
import styleSheet from './hero-nft.styles';

const NftImageAndNetworkBadge = ({
  chainId,
  nft,
}: {
  chainId: string;
  nft?: Nft;
}) => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { networkName, networkImage } = useNetworkInfo(chainId);

  const { image, tokenId } = nft ?? {};
  const showPlaceholder = !nft || !chainId?.length || !image;

  const onPress = useCallback(() => {
    // @ts-expect-error - TODO: Nft type should not be undefined
    navigation.navigate('NftDetailsFullImageStack', {
      screen: 'NftDetailsFullImage',
      params: {
        collectible: nft,
      },
    });
  }, [navigation, nft]);

  if (showPlaceholder) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.touchableOpacity}
        testID="hero-nft-placeholder"
      >
        <View style={styles.noImagePlaceholder}>
          <Text>{`#${tokenId}`}</Text>
          <Text color={TextColor.Primary}>Show</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={styles.touchableOpacity}>
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            imageSource={networkImage}
            name={networkName}
            variant={BadgeVariant.Network}
            testID="hero-nft-badge-network"
          />
        }
      >
        <CollectibleMedia collectible={nft} style={styles.noImagePlaceholder} />
      </BadgeWrapper>
    </TouchableOpacity>
  );
};

export const HeroNft = () => {
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const { chainId, name, nft } = useNft();
  const { tokenId } = nft ?? {};

  return (
    <Hero
      componentAsset={<NftImageAndNetworkBadge chainId={chainId} nft={nft} />}
      hasPaddingTop={isFullScreenConfirmation}
      title={name}
      subtitle={tokenId === undefined ? '' : `#${tokenId}`}
    />
  );
};
