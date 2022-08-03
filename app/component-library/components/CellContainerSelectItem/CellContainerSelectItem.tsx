/* eslint-disable react/prop-types */
// 3rd library dependencies
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies
import { useStyles } from '../../hooks';

// Internal dependencies
import styleSheet from './CellContainerSelectItem.styles';
import { CellContainerSelectItemProps } from './CellContainerSelectItem.types';
import { CELL_CONTAINER_SELECT_ITEM_SELECTED_VIEW_TEST_ID } from './CellContainerSelectItem.constants';

const CellContainerSelectOption: React.FC<CellContainerSelectItemProps> = ({
  style,
  isSelected,
  children,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, isSelected });

  return (
    <TouchableOpacity style={styles.base} {...props}>
      {isSelected && (
        <View
          style={styles.selectedView}
          testID={CELL_CONTAINER_SELECT_ITEM_SELECTED_VIEW_TEST_ID}
        >
          <View style={styles.verticalBar} />
        </View>
      )}
      <View style={styles.contentContainer}>{children}</View>
    </TouchableOpacity>
  );
};

export default CellContainerSelectOption;
