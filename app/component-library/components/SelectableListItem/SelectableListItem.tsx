/* eslint-disable react/prop-types */
import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useStyles } from '../../hooks';
import styleSheet from './SelectableListItem.styles';
import { SelectableListItemProps } from './SelectableListItem.types';
import { SELECTABLE_LIST_ITEM_OVERLAY_ID } from '../../../constants/test-ids';

const SelectableListItem: React.FC<SelectableListItemProps> = ({
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

export default SelectableListItem;
