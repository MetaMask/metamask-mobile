/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './BottomSheetContent.styles';
import { BottomSheetContentProps } from './BottomSheetContent.types';

const BottomSheetContent: React.FC<BottomSheetContentProps> = ({
  style,
  children,
  isFullscreen,
}) => {
  const { styles } = useStyles(styleSheet, { style, isFullscreen });
  return <View style={styles.base}>{children}</View>;
};

export default BottomSheetContent;
