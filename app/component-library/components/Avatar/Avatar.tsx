/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../hooks/useStyles';
import { AvatarProps } from './Avatar.types';
import styleSheet from './Avatar.styles';

const Avatar: React.FC<AvatarProps> = ({ size, style, children }) => {
  const { styles } = useStyles(styleSheet, {
    size,
    style,
  });

  return <View style={styles.container}>{children}</View>;
};

export default Avatar;
