/* eslint-disable react/prop-types */
import React from 'react';
import { Image } from 'react-native';

import BaseAvatar from '../BaseAvatar';
import { FaviconAvatarProps } from './FaviconAvatar.types';
import styles from './Favicon.styles';

const FaviconAvatar: React.FC<FaviconAvatarProps> = ({
  imageUrl,
  size,
  style,
}) => (
  <BaseAvatar size={size} style={style}>
    <Image
      source={{ uri: imageUrl }}
      style={styles.image}
      resizeMode={'contain'}
    />
  </BaseAvatar>
);

export default FaviconAvatar;
