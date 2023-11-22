/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies.
import Checkbox from '../../Checkbox';
import { useStyles } from '../../../hooks';
import ListItem from '../../List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './ListItemMultiSelect.styles';
import { ListItemMultiSelectProps } from './ListItemMultiSelect.types';
import { DEFAULT_LISTITEMMULTISELECT_GAP } from './ListItemMultiSelect.constants';

const ListItemMultiSelect: React.FC<ListItemMultiSelectProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  gap = DEFAULT_LISTITEMMULTISELECT_GAP,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, gap, isDisabled });
  const { hitSlop, ...listItemProps } = props;
  return (
    <TouchableOpacity style={styles.base} disabled={isDisabled} {...props}>
      <ListItem gap={gap} style={styles.listItem} {...listItemProps}>
        <Checkbox
          style={styles.checkbox}
          isChecked={isSelected}
          onPressIn={props.onPress}
        />
        {children}
      </ListItem>
      {isSelected && (
        <View style={styles.underlay} accessibilityRole="checkbox" accessible />
      )}
    </TouchableOpacity>
  );
};

export default ListItemMultiSelect;
