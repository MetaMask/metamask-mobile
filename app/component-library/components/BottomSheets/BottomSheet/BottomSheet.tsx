/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './BottomSheet.styles';
import { BottomSheetProps } from './BottomSheet.types';

const BottomSheet: React.FC<BottomSheetProps> = ({ style, children }) => {
  const { styles } = useStyles(styleSheet, { style });
  return <View style={styles.base}>{children}</View>;
};

export default BottomSheet;
