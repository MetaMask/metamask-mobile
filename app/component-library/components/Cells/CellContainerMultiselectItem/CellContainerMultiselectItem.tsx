/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import Checkbox from '../../Checkbox';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './CellContainerMultiselectItem.styles';
import { CellContainerMultiselectItemProps } from './CellContainerMultiselectItem.types';

const CellContainerMultiselectItem: React.FC<CellContainerMultiselectItemProps> =
  ({ style, isSelected, children, ...props }) => {
    const { styles } = useStyles(styleSheet, { style, isSelected });

    return (
      <TouchableOpacity style={styles.base} {...props}>
        <Checkbox style={styles.checkbox} isSelected={isSelected} />
        {children}
      </TouchableOpacity>
    );
  };

export default CellContainerMultiselectItem;
