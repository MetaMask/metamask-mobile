/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import TouchableOpacity from '../../../../components/Base/TouchableOpacity';
import { useStyles } from '../../../hooks';
import ListItem from '../../List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './ListItemSelect.styles';
import { ListItemSelectProps } from './ListItemSelect.types';
import { DEFAULT_SELECTITEM_GAP } from './ListItemSelect.constants';

const ListItemSelect: React.FC<ListItemSelectProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  onPress,
  onLongPress,
  gap = DEFAULT_SELECTITEM_GAP,
  verticalAlignment,
  listItemProps,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, isDisabled });

  return (
    <TouchableOpacity
      style={styles.base}
      disabled={isDisabled}
      onPress={onPress}
      onLongPress={onLongPress}
      {...props}
    >
      <ListItem gap={gap} style={styles.listItem} {...listItemProps}>
        {children}
      </ListItem>
      {isSelected && (
        <View style={styles.underlay} accessibilityRole="checkbox" accessible />
      )}
    </TouchableOpacity>
  );
};

export default ListItemSelect;
