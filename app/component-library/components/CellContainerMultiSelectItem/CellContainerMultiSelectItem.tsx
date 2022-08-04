/* eslint-disable react/prop-types */
// 3rd library dependencies
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies
import { useStyles } from '../../hooks';
import Checkbox from '../Checkbox';

// Internal dependencies
import styleSheet from './CellContainerMultiSelectItem.styles';
import { CellContainerMultiSelectItemProps } from './CellContainerMultiSelectItem.types';
import {
  CELL_CONTAINER_MULTISELECT_ITEM_SELECTED_VIEW_TEST_ID,
  CELL_CONTAINER_MULTISELECT_ITEM_CHECKBOX_TEST_ID,
} from './CellContainerMultiSelectItem.constants';

const CellContainerMultiSelectItem: React.FC<CellContainerMultiSelectItemProps> =
  ({ style, isSelected, children, ...props }) => {
    const { styles } = useStyles(styleSheet, { style, isSelected });

    return (
      <TouchableOpacity style={styles.base} {...props}>
        {isSelected && (
          <View
            style={styles.selectedView}
            testID={CELL_CONTAINER_MULTISELECT_ITEM_SELECTED_VIEW_TEST_ID}
          />
        )}
        <View style={styles.contentContainer}>
          <Checkbox
            style={styles.checkbox}
            isSelected={isSelected}
            testID={CELL_CONTAINER_MULTISELECT_ITEM_CHECKBOX_TEST_ID}
          />
          <View style={styles.childrenContainer}>{children}</View>
        </View>
      </TouchableOpacity>
    );
  };

export default CellContainerMultiSelectItem;
