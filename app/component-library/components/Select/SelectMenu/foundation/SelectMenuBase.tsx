/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../hooks';

// Internal dependencies.
import styleSheet from './SelectMenuBase.styles';
import { SelectMenuBaseProps } from './SelectMenuBase.types';

const SelectMenuBase: React.FC<SelectMenuBaseProps> = ({
  headerEl,
  children,
  footerEl,
  style,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <View style={styles.base} {...props}>
      {headerEl && headerEl}
      {children && children}
      {footerEl && footerEl}
    </View>
  );
};

export default SelectMenuBase;
