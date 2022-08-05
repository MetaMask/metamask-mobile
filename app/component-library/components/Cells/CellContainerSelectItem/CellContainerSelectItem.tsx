/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './CellContainerSelectItem.styles';
import { CellContainerSelectItemProps } from './CellContainerSelectItem.types';
import { SELECTABLE_LIST_ITEM_OVERLAY_ID } from './CellContainerSelectItem.constants';

const CellContainerSelectItem: React.FC<CellContainerSelectItemProps> = ({
  style,
  isSelected,
  children,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, isSelected });

  const renderOverlay = useCallback(
    () =>
      isSelected ? (
        <View testID={SELECTABLE_LIST_ITEM_OVERLAY_ID} style={styles.overlay}>
          <View style={styles.verticalBar} />
        </View>
      ) : null,
    [isSelected, styles],
  );

  return (
    <TouchableOpacity style={styles.base} {...props}>
      {children}
      {renderOverlay()}
    </TouchableOpacity>
  );
};

export default CellContainerSelectItem;
