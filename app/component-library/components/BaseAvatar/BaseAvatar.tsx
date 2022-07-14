/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../hooks/useStyles';
import { BaseAvatarProps } from './BaseAvatar.types';
import styleSheet from './BaseAvatar.styles';

const BaseAvatar: React.FC<BaseAvatarProps> = ({ size, style, children }) => {
  const { styles } = useStyles(styleSheet, {
    size,
    style,
  });

  return <View style={styles.container}>{children}</View>;
};

export default BaseAvatar;
