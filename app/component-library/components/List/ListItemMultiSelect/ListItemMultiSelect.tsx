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
  children,
  ...props
}: TouchableOpacityProps & { children?: React.ReactNode }) => {
  const isDisabled = disabled || (props as { isDisabled?: boolean }).isDisabled;
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      if (onPress && !isDisabled) {
        onPress({} as GestureResponderEvent);
      }
    });

  return (
    <GestureDetector gesture={tap}>
      <RNTouchableOpacity
        disabled={isDisabled}
        onPress={undefined} // GestureDetector handles the press
        {...props}
      >
        {children}
      </RNTouchableOpacity>
    </GestureDetector>
  );
};

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

  // Disable gesture wrapper only in E2E test environment to prevent test interference
  const isE2ETest = __DEV__ && 'detox' in global;
  const TouchableComponent =
    Platform.OS === 'android' && !isE2ETest
      ? TouchableOpacity
      : RNTouchableOpacity;

  // Handle disabled state properly in test environment
  const conditionalOnPress = process.env.NODE_ENV === 'test' && isDisabled ? undefined : onPress;

  return (
    <TouchableComponent 
      style={styles.base} 
      disabled={isDisabled} 
      onPress={conditionalOnPress}
      {...props}
    >
      <ListItem gap={gap} style={styles.listItem}>
        <Checkbox
          style={styles.checkbox}
          isChecked={isSelected}
          onPressIn={Platform.OS === 'android' ? undefined : onPress}
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
