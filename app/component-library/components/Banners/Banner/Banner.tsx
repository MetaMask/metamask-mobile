/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './BannerBase.styles';
import { BannerBaseProps } from './BannerBase.types';

const BannerBase: React.FC<BannerBaseProps> = ({
  style,
  startAccessory,
  title,
  titleProps,
  description,
  actionButtonLabel,
  actionButtonOnPress,
  actionButtonProps,
  onClose,
  closeButtonProps,
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <View style={styles.base}>
      <View style={styles.startAccessory}>{startAccessory}</View>
    </View>
  );
};

export default BannerBase;
