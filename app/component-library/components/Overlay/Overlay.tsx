/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View, TouchableOpacity } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';

// Internal dependencies.
import styleSheet from './Overlay.styles';
import { OverlayProps } from './Overlay.types';

const Overlay: React.FC<OverlayProps> = ({ style, onPress, overlayColor }) => {
  const { styles } = useStyles(styleSheet, { style, overlayColor });
  return (
    <>
      {onPress ? (
        <TouchableOpacity style={styles.base} />
      ) : (
        <View style={styles.base} />
      )}
    </>
  );
};

export default Overlay;
