/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';
import useStyles from '../../hooks/useStyles';
import { BaseAvatarProps } from './BaseAvatar.types';
import createStyleSheet from './BaseAvatar.styles';

const BaseAvatar: React.FC<BaseAvatarProps> = ({ size, style, children }) => {
  const styles = useStyles(createStyleSheet, {
    size,
  });

  return <View style={[styles.container, style]}>{children}</View>;
};

export default BaseAvatar;
