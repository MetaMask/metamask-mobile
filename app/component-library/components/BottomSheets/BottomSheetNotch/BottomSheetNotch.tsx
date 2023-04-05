/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './BottomSheetNotch.styles';
import { BottomSheetNotchProps } from './BottomSheetNotch.types';

const BottomSheetNotch: React.FC<BottomSheetNotchProps> = ({
  style,
  bottomSheetNotchColor,
}) => {
  const { styles } = useStyles(styleSheet, { style, bottomSheetNotchColor });
  return (
    <View style={styles.base}>
      <View style={styles.notch} />
    </View>
  );
};

export default BottomSheetNotch;
