import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Nft } from '@metamask/assets-controllers';
import { TouchableOpacity, View } from 'react-native';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Text, { TextColor } from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks/useStyles';
import images from '../../../../../../images/image-icons';
import CollectibleMedia from '../../../../../UI/CollectibleMedia';
// TODO: consider
// import RemoteImage from '../../../../../Base/RemoteImage';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { useNft } from '../../../hooks/useNft';
import { Hero } from '../hero';
import styleSheet from './nft.styles';

const NftImageAndNetworkBadge = ({
  chainId,
  nft,
  isFirstPartyContractName,
}: {
  chainId: string;
  nft?: Nft;
  isFirstPartyContractName?: boolean;
}) => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { networkName, networkImage } = useNetworkInfo(chainId);

  const { image, tokenId } = nft ?? {};
  const showPlaceholder = !nft || !chainId?.length || !image;

  if (showPlaceholder) {
    return (
      <TouchableOpacity
          onPress={() => {
            navigation.navigate('NftDetailsFullImage', {
              collectible: nft,
            });
          }}
        >
          <View style={styles.noImagePlaceholder}>
            <Text>{`#${tokenId}`}</Text>
            <Text color={TextColor.Primary}>Show</Text>
          </View>
        </TouchableOpacity>
    );
  }

  return (
    <BadgeWrapper
      badgePosition={BadgePosition.BottomRight}
      badgeElement={
        isFirstPartyContractName ? (
          <Badge
            imageSource={images.FOX_LOGO}
            variant={BadgeVariant.Network}
            isScaled={false}
            testID="hero-nft-badge-metamask"
          />
        ) : (
          <Badge
            imageSource={networkImage}
            name={networkName}
            variant={BadgeVariant.Network}
            testID="hero-nft-badge-network"
          />
        )
      }
      style={styles.nftImageAndNetworkBadge}
    >
      <CollectibleMedia
        collectible={nft}
        small
        style={styles.noImagePlaceholder}
      />
      {/* TODO: consider <RemoteImage source={{ uri: image }} style={styles.noImagePlaceholder} /> */}
    </BadgeWrapper>
  );
};

export const HeroNft = () => {
  const { chainId, isFirstPartyContractName, name, nft } = useNft();
  const { tokenId } = nft ?? {};

  return (
    <Hero
      componentAsset={
        <NftImageAndNetworkBadge
          chainId={chainId}
          nft={nft}
          isFirstPartyContractName={isFirstPartyContractName}
        />
      }
      title={name}
      subtitle={`#${tokenId}`}
    />
  );
};
