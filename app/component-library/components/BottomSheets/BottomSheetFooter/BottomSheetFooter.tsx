/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './BottomSheetFooter.styles';
import { BottomSheetFooterProps } from './BottomSheetFooter.types';

const BottomSheetFooter: React.FC<BottomSheetFooterProps> = ({
  style,
  children,
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return <View style={styles.base}>{children}</View>;
};

export default BottomSheetFooter;
