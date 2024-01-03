/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './ListBase.styles';
import { ListBaseProps } from './ListBase.types';

const ListBase: React.FC<ListBaseProps> = ({
  style,
  topAccessory,
  children,
  bottomAccessory,
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <View style={styles.base}>
      {topAccessory && topAccessory}
      {children && children}
      {bottomAccessory && bottomAccessory}
    </View>
  );
};

export default ListBase;
