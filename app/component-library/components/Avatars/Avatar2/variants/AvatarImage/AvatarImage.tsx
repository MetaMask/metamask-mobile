// Third party dependencies.
import React from 'react';
import { Image } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Avatar2Base from '../../foundation/Avatar2Base';

// Internal dependencies.
import styleSheet from './AvatarImage.styles';
import { AvatarImageProps } from './AvatarImage.types';

const AvatarImage = ({ style, imageSource, size }: AvatarImageProps) => {
  const { styles } = useStyles(styleSheet, { style, size });
  return (
    <Avatar2Base size={size} style={styles.base}>
      <Image source={imageSource} style={styles.image} resizeMode={'contain'} />
    </Avatar2Base>
  );
};

export default AvatarImage;
