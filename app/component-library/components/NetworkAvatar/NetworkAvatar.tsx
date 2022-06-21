/* eslint-disable react/prop-types */
import React from 'react';
import { Image, View } from 'react-native';
import BaseAvatar, { BaseAvatarSize } from '../BaseAvatar';
import { NetworkAvatarProps } from './NetworkAvatar.types';
import BaseText, { BaseTextVariant } from '../BaseText';
import stylesheet from './NetworkAvatar.styles';
import { useStyles } from '../../../component-library/hooks';

const NetworkAvatar = ({
  size,
  style,
  networkName,
  // chainId,
  networkImage,
}: NetworkAvatarProps) => {
  const styles = useStyles(stylesheet, { style, size });

  const textVariant =
    size === BaseAvatarSize.Sm || size === BaseAvatarSize.Xs
      ? BaseTextVariant.lBodySM
      : BaseTextVariant.lBodyMD;

  const chainNameFirstLetter = networkName?.[0] ?? '?';

  const imageUid = networkImage && Image.resolveAssetSource(networkImage);

  return (
    <BaseAvatar size={size} style={style}>
      {networkImage ? (
        <Image source={{ uri: imageUid.uri }} style={styles.imageStyle} />
      ) : (
        <View style={styles.networkPlaceholderContainer}>
          <BaseText style={styles.baseText} variant={textVariant}>
            {chainNameFirstLetter}
          </BaseText>
        </View>
      )}
    </BaseAvatar>
  );
};

export default NetworkAvatar;
