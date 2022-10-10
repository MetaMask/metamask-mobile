/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './Avatar2.styles';
import { Avatar2Props } from './Avatar2.types';

const Avatar2: React.FC<Avatar2Props> = ({ style, children, ...props }) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <View style={styles.base} {...props}>
      {children}
    </View>
  );
};

export default Avatar2;
