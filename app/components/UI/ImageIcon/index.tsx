import { Image } from 'react-native';
import React from 'react';
import images from 'images/image-icons';
import { NETWORKS_CHAIN_ID_WITH_SVG } from '../../../constants/network';
import AvatarNetwork from '../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';

interface ImageIconPropTypes {
  image: string;
  style: any;
  chainId: string;
}

const ImageIcon = (props: ImageIconPropTypes) => {
  const { image, style, chainId } = props;

  const hasSVGAvatar = Object.values(NETWORKS_CHAIN_ID_WITH_SVG).some(
    (networkId) => networkId === chainId,
  );

  if (hasSVGAvatar)
    return (
      <AvatarNetwork
        variant={AvatarVariant.Network}
        size={AvatarSize.Xs}
        chainId={chainId}
        style={style}
      />
    );

  if (!image) return null;
  const source = images[image];
  if (!source) {
    return null;
  }

  return <Image source={source} style={style} />;
};

export default ImageIcon;
