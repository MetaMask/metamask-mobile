/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import TouchableOpacity from '../../../../components/Base/TouchableOpacity';
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
  onPress,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, gap, isDisabled });

  return (
    <TouchableOpacity
      style={styles.base}
      disabled={isDisabled}
      onPress={onPress}
      {...props}
    >
      <ListItem gap={gap} style={styles.listItem}>
        <View pointerEvents={'auto'}>
          <Checkbox
            style={styles.checkbox}
            isChecked={isSelected}
            isDisabled={isDisabled}
          />
        </View>
        {children}
      </ListItem>
      {isSelected && (
        <View style={styles.underlay} accessibilityRole="checkbox" accessible />
      )}
    </TouchableOpacity>
  );
};

export default ListItemMultiSelect;
