/* eslint-disable react/prop-types */
import React from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';
import { NetworksChainId } from '@metamask/controllers';
import BaseAvatar, { BaseAvatarSize } from '../BaseAvatar';
import { NetworkAvatarProps } from './NetworkAvatar.types';
import BaseText, { BaseTextVariant } from '../BaseText';
import stylesheet from './NetworkAvatar.styles';
import { useStyles } from '../../../component-library/hooks';

type NetworkImageByChainId = {
  [key: NetworkAvatarProps['chainId']]: {
    image?: ImageSourcePropType;
  };
};

const networkImageByChainId: NetworkImageByChainId = {
  [NetworksChainId.mainnet]: {
    image: require('../../../images/eth-logo.png'), // eslint-disable-line
  },
};

const NetworkAvatar = ({ size, style, chainId, networkName, networkImageURL }: NetworkAvatarProps) => {
  const { image } = networkImageByChainId[chainId];

  // TODO: remove the empty object which represents the stylesheet var
  const styles = useStyles(stylesheet, {});

  // We define the text size based on the avatar size, as described on the design system
  const textVariant =
    size === BaseAvatarSize.Sm || size === BaseAvatarSize.Xs
      ? BaseTextVariant.lBodySM
      : BaseTextVariant.lBodyMD;

  const chainNameFirstLetter = networkName[0];

  return (
    <BaseAvatar size={size} style={style}>
      {image ? (
        <Image source={image} style={styles.imageStyle} />
      ) : (
        <View style={styles.networkPlaceholderContainer}>
          <BaseText variant={textVariant}>{chainNameFirstLetter}</BaseText>
        </View>
      )}
    </BaseAvatar>
  );
};

export default NetworkAvatar;
