/* eslint-disable react/prop-types */
// 3rd library dependencies
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies
import { useStyles } from '../../hooks';

// Internal dependencies
import styleSheet from './CellContainerSelectOption.styles';
import { CellContainerSelectOptionProps } from './CellContainerSelectOption.types';
import { CELL_CONTAINER_SELECT_OPTION_BASE_TEST_ID } from './CellContainerSelectOption.constants';

const CellContainerSelectOption: React.FC<CellContainerSelectOptionProps> = ({
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
      testID={CELL_CONTAINER_SELECT_OPTION_BASE_TEST_ID}
      {...props}>
        {children}
        {isSelected && (
          <View style={styles.verticalBar} />
        )}
    </TouchableOpacity>
  );
};

export default CellContainerSelectOption;
