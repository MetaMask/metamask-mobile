/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks/useStyles';
import { AvatarSize } from '../../Avatar2.types';

// Internal dependencies.
import { Avatar2BaseProps } from './Avatar2Base.types';
import styleSheet from './Avatar2Base.styles';

const Avatar2Base: React.FC<Avatar2BaseProps> = ({
  size = AvatarSize.Md,
  style,
  children,
}) => {
  const { styles } = useStyles(styleSheet, {
    size,
    style,
  });

  return <View style={styles.container}>{children}</View>;
};

export default Avatar2Base;
