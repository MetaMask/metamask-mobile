/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import {
  TouchableOpacity as RNTouchableOpacity,
  TouchableOpacityProps,
  View,
  Platform,
  GestureResponderEvent,
} from 'react-native';

// External dependencies.
import Checkbox from '../../Checkbox';
import { useStyles } from '../../../hooks';
import ListItem from '../../List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './ListItemMultiSelect.styles';
import { ListItemMultiSelectProps } from './ListItemMultiSelect.types';
import { DEFAULT_LISTITEMMULTISELECT_GAP } from './ListItemMultiSelect.constants';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const TouchableOpacity = ({
  onPress,
  disabled,
  ...props
}: TouchableOpacityProps) => {
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      if (onPress && !disabled) {
        onPress({} as GestureResponderEvent);
      }
    });

  return (
    <GestureDetector gesture={tap}>
      <RNTouchableOpacity disabled={disabled} {...props} />
    </GestureDetector>
  );
};

const ListItemMultiSelect: React.FC<ListItemMultiSelectProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  gap = DEFAULT_LISTITEMMULTISELECT_GAP,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, gap, isDisabled });

  const TouchableComponent =
    Platform.OS === 'android' ? TouchableOpacity : RNTouchableOpacity;

  return (
    <TouchableComponent style={styles.base} disabled={isDisabled} {...props}>
      <ListItem gap={gap} style={styles.listItem}>
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
    </TouchableComponent>
  );
};

export default ListItemMultiSelect;
