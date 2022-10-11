// Third party dependencies.
import React from 'react';
import { Image } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../../../hooks';

// Internal dependencies.
import styleSheet from './AvatarAssetImage.styles';
import { AvatarAssetImageProps } from './AvatarAssetImage.types';

const AvatarAssetImage = ({
  style,
  imageSource,
  size,
}: AvatarAssetImageProps) => {
  const { styles } = useStyles(styleSheet, { style, size });
  return (
    <Image source={imageSource} style={styles.image} resizeMode={'contain'} />
  );
};

export default AvatarAssetImage;
