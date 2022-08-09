/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './CellContainerSelectItem.styles';
import { CellContainerSelectItemProps } from './CellContainerSelectItem.types';
import { SELECTABLE_ITEM_UNDERLAY_ID } from './CellContainerSelectItem.constants';

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
        <View testID={SELECTABLE_ITEM_UNDERLAY_ID} style={styles.underlay}>
          <View style={styles.underlayBar} />
        </View>
      ) : null,
    [isSelected, styles],
  );

  return (
    <TouchableOpacity style={styles.base} {...props}>
      {renderOverlay()}
      {children}
    </TouchableOpacity>
  );
};

export default CellContainerSelectItem;
