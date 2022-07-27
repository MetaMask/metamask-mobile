/* eslint-disable react/prop-types */
// 3rd library dependencies
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies
import { useStyles } from '../../hooks';
import Checkbox from '../Checkbox';

// Internal dependencies
import styleSheet from './CellContainerMultiSelectOption.styles';
import { CellContainerMultiSelectOptionProps } from './CellContainerMultiSelectOption.types';
import { CELL_CONTAINER_MULTISELECT_OPTION_BASE_TEST_ID } from './CellContainerMultiSelectOption.constants';

const CellContainerMultiSelectOption: React.FC<CellContainerMultiSelectOptionProps> = ({
  style,
  isSelected,
  children,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, isSelected });

  const baseStyle = isSelected ? {...styles.base, ...styles.baseSelected} : styles.base;

  return (
    <TouchableOpacity 
      style={baseStyle} 
      testID={CELL_CONTAINER_MULTISELECT_OPTION_BASE_TEST_ID}
      {...props}>
        <Checkbox style={styles.checkbox} isSelected={isSelected} />
        <View style={styles.childrenContainer}>
          {children}
        </View>
    </TouchableOpacity>
  );
};

export default CellContainerMultiSelectOption;
