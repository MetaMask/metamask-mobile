/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import AvatarAsset from './foundation/AvatarAsset';

// Internal dependencies.
import styleSheet from './Avatar2.styles';
import { Avatar2Props, AvatarSize } from './Avatar2.types';

const Avatar2 = ({
  style,
  size = AvatarSize.Md,
  isHaloEnabled = false,
  ...props
}: Avatar2Props) => {
  const { styles } = useStyles(styleSheet, { style, size, isHaloEnabled });

  return (
    <View style={styles.base}>
      <AvatarAsset {...props} />
    </View>
  );
};

export default Avatar2;
