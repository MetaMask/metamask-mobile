/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { TouchableOpacity, View, GestureResponderEvent } from 'react-native';

// External dependencies.
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
  gap = DEFAULT_SELECTITEM_GAP,
  verticalAlignment,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, isDisabled });
  const [isChecked, setIsChecked] = useState(isSelected);
  const onPressHandler = (event: GestureResponderEvent) => {
    onPress?.(event);
    setIsChecked(!isChecked);
  };

  return (
    <TouchableOpacity
      style={styles.base}
      disabled={isDisabled}
      onPress={onPressHandler}
      {...props}
    >
      <ListItem gap={gap} style={styles.listItem}>
        {children}
      </ListItem>
      {isChecked && (
        <View style={styles.underlay} accessibilityRole="checkbox" accessible>
          <View style={styles.underlayBar} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default ListItemSelect;
