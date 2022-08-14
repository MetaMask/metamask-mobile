/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import styleSheet from './CellAccountDisplayItemContainer.styles';
import { CellAccountDisplayItemContainerProps } from './CellAccountDisplayItemContainer.types';

const CellAccountDisplayItemContainer: React.FC<CellAccountDisplayItemContainerProps> =
  ({ style, children, ...props }) => {
    const { styles } = useStyles(styleSheet, { style });

    return (
      <View style={styles.base} {...props}>
        {children}
      </View>
    );
  };

export default CellAccountDisplayItemContainer;
