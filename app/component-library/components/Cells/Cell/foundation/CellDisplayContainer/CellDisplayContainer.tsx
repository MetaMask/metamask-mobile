/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import styleSheet from './CellDisplayContainer.styles';
import { CellDisplayContainerProps } from './CellDisplayContainer.types';

const CellDisplayContainer: React.FC<CellDisplayContainerProps> = ({
  style,
  children,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <View style={styles.base} {...props}>
      {children}
    </View>
  );
};

export default CellDisplayContainer;
