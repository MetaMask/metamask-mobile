/* eslint-disable react/prop-types */
import React from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';
import { NetworksChainId } from '@metamask/controllers';
import BaseAvatar, { BaseAvatarSize } from '../BaseAvatar';
import { NetworkAvatarProps } from './NetworkAvatar.types';
import BaseText, { BaseTextVariant } from '../BaseText';
import stylesheet from './NetworkAvatar.styles';
import { useStyles } from '../../../component-library/hooks';
import ethLogo from '../../../images/eth-logo.png';

type NetworkImageByChainId = {
  [key in NetworksChainId]: {
    letter: string;
    image?: eitn;
  };
};

const networkImageByChainId: NetworkImageByChainId = {
  [NetworksChainId.mainnet]: {
    image: ethLogo, // eslint-disable-line
    letter: 'M',
  },
  [NetworksChainId.kovan]: {
    letter: 'K',
  },
  [NetworksChainId.rinkeby]: {
    letter: 'R',
  },
  [NetworksChainId.goerli]: {
    letter: 'G',
  },
  [NetworksChainId.ropsten]: {
    letter: 'R',
  },
  [NetworksChainId.localhost]: {
    letter: 'l',
  },
  [NetworksChainId.rpc]: {
    letter: 'r',
  },
  [NetworksChainId.optimism]: {
    letter: 'O',
  },
  [NetworksChainId.optimismTest]: {
    letter: 'OT',
  },
};

const NetworkAvatar = ({ size, style, chainId }: NetworkAvatarProps) => {
  const { letter, image } = networkImageByChainId[chainId];

  // TODO: remove the empty object as the stylesheet var
  const styles = useStyles(stylesheet, {});

  // We define the text size based on the avatar size, as described on the design system
  const textVariant =
    size === BaseAvatarSize.Sm || size === BaseAvatarSize.Xs
      ? BaseTextVariant.sBodyMD
      : BaseTextVariant.lBodyMD;

  console.log(image);

  return (
    <BaseAvatar size={size} style={style}>
      {image ? (
        <Image source={image} style={styles.imageStyle} />
      ) : (
        <View style={styles.networkPlaceholderContainer}>
          <BaseText adjustsFontSizeToFit variant={textVariant}>
            {letter}
          </BaseText>
        </View>
      )}
    </BaseAvatar>
  );
};

export default NetworkAvatar;
