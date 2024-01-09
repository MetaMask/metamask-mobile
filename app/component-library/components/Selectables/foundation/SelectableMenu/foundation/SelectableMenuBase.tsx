/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import styleSheet from './SelectableMenuBase.styles';
import { SelectableMenuBaseProps } from './SelectableMenuBase.types';

const SelectableMenuBase: React.FC<SelectableMenuBaseProps> = ({
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

export default SelectableMenuBase;
